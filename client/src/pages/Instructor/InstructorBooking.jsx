import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { formatCurrency } from "../../utils/formatCurrency";
import { getBestFOCOffer } from "../../utils/getBestFOCOffer";
import "./InstructorBooking.css";
import { getCurrencyForTrip } from "../../utils/currencyUtils";

// 💰 이 파일에서만 쓸 간단 통화 포맷 함수
const formatCurrencyLocal = (amount, currency = "USD") => {
  if (amount == null || isNaN(amount)) return "-";

  const value = Math.round(Number(amount));
  const formatted = value.toLocaleString();

  if (currency === "SAR") return `SAR ${formatted}`;
  return `$${formatted}`;
};

// ⭐ FOC 규칙 필터링 — 모든 규칙을 그대로 반환 (중복 제거 없음)
const filterFOCOffers = (offers) => {
  return offers.filter((offer) => {
    const name = offer.name || "";

    if (/\d+\s*\+\s*\d+/.test(name)) return true;
    if (/foc/i.test(name)) return true;

    return false;
  });
};


function InstructorBooking() {

  const { state } = useLocation();
  const navigate = useNavigate();
  const trip = state?.trip;

  // ⭐ Almonda 전용 통화 처리 (반드시 여기에 있어야 함)
  const currency = getCurrencyForTrip(trip);

  const [selectedBookings, setSelectedBookings] = useState([]);
  const [selectedOcc, setSelectedOcc] = useState({});

  if (!trip) return <p>잘못된 접근입니다.</p>;

  const ratePlans = trip.ratePlansRetail || [];
  const specialOffers = ratePlans.filter((p) =>
    /(group|charter|foc|dema)/i.test(p.name)
  );

  // ✅ 중복 제거된 cabinType 리스트
  const cabinsMap = new Map();
  ratePlans.forEach((plan) => {
    (plan.cabinTypes || []).forEach((cabin) => {
      if (!cabinsMap.has(cabin.id)) {
        cabinsMap.set(cabin.id, cabin);
      }
    });
  });
  const cabins = Array.from(cabinsMap.values())
    .map(cabin => {
      // ✅ 2인 요금 누락 시 자동 추가
      const hasDouble = (cabin.occupancy || []).some(o => Number(o.id) === 2);
      if (!hasDouble && Array.isArray(cabin.occupancy)) {
        const single = cabin.occupancy.find(o => Number(o.id) === 1);
        if (single) {
          cabin.occupancy.push({
            id: 2,
            price: Number(single.price),   // ⭕ 인당 요금 그대로 저장
            parentPrice: single.parentPrice ? Number(single.parentPrice) : undefined,
            label: "Double (auto)",
          });

        }
      }
      return cabin;
    });
  ;

  // 파일 상단 유틸로 추가
  const getOccLabelById = (id) => {
    if (Number(id) === 1) return "1인 예약";
    if (Number(id) === 2) return "2인 예약";
    if (Number(id) === 3) return "독실 예약";
    return null; // 그 외는 숨김
  };

  // ✅ 예약 추가
  const handleAddBooking = (room, occId, cabinName, basePrice) => {
    const occLabel = getOccLabelById(occId);
    const multiplier = Number(occId) === 2 ? 2 : 1;
    const finalPrice = parseFloat(basePrice) * multiplier;

    const newBooking = {
      id: room.id,
      cabin: cabinName,
      room: room.name,
      occId,               // ✅ 반드시 저장
      occLabel,            // ✅ 예약 유형 표시용
      price: finalPrice,
    };

    // 중복 방지 — 이미 예약된 경우 추가 X
    setSelectedBookings((prev) => {
      const exists = prev.find((b) => b.id === room.id);
      if (exists) {
        // 같은 방 재선택 시 기존 내용 교체
        return prev.map((b) => (b.id === room.id ? newBooking : b));
      }
      return [...prev, newBooking];
    });
  };


  // ✅ 예약 취소
  const removeBooking = (roomId) => {
    setSelectedBookings((prev) => prev.filter((b) => b.id !== roomId));
    setSelectedOcc((prev) => ({ ...prev, [roomId]: "" }));
  };

  // ✅ 예약 변경 시 자동 추가 / 제거
  const handleOccChange = (room, occId, cabinName, cabin) => {
    setSelectedOcc((prev) => ({ ...prev, [room.id]: occId }));

    if (!occId) {
      removeBooking(room.id);
      return;
    }

    // ✅ 선택된 요금 찾기
    const occ = (cabin.occupancy || []).find(
      (o) => Number(o.id) === Number(occId)
    );
    const occPrice = parseFloat(occ?.price || 0);

    if (occPrice > 0) {
      handleAddBooking(room, occId, cabinName, occPrice);
    } else {
      console.warn("⚠️ Price not found for selected occupancy id:", occId);
    }
  };


  // ✅ 총 금액(선할인 전)
  const baseTotal = selectedBookings.reduce((sum, b) => sum + b.price, 0);

  // ✅ FOC(Free of Charge) 자동 할인 (복수 규칙 지원)
  let focDiscount = 0;
  let focDetails = [];

  // 1) FOC/Group 오퍼 전체 탐색 (ratePlans + specialOffers 모두)
  const focOffers = filterFOCOffers(
    [
      ...(ratePlans || []),
      ...(specialOffers || []),
    ].filter((p) => /(foc|group|charter)/i.test(p.name))
  );


  // 2) pax(인원) 계산 및 1인분 단가 배열 만들기
  let pax = 0;
  const unitPrices = [];

  selectedBookings.forEach((b) => {
    if (b.occLabel === "2인 예약") {
      pax += 2;
      const unit = Number(b.price) / 2;
      unitPrices.push(unit, unit);
    } else {
      pax += 1;
      unitPrices.push(Number(b.price));
    }
  });

  // ⭐ getBestFOCOffer로 최종 FOC 결정
  let bestFOC = null;

  if (pax > 0 && unitPrices.length > 0 && focOffers.length > 0) {
    bestFOC = getBestFOCOffer(focOffers, pax, unitPrices);
  }

  if (bestFOC) {
    const sorted = unitPrices.slice().sort((a, b) => a - b);
    const discount = sorted
      .slice(0, bestFOC.free)
      .reduce((sum, v) => sum + v, 0);

    focDiscount = discount;

    focDetails = [
      {
        offerName: bestFOC.name,
        req: bestFOC.req,
        bonus: bestFOC.bonus,
        freeUnits: bestFOC.free,
        discount,
      },
    ];
  }



  // ✅ 최종 합계
  const totalPrice = baseTotal - focDiscount;

  console.log("🧩 FOC 계산 결과:", focDetails);



  return (
    <div className="instructor-detail-container">
      <h2>{trip.boat?.name}</h2>
      <p className="product-name">{trip.product?.name}</p>

      <p>
        <strong>출발일:</strong> {trip.startDate} <br />
        <strong>도착일:</strong> {trip.endDate}
      </p>

      {/* ✅ 스페셜 오퍼 */}
      {specialOffers.length > 0 && (
        <div className="special-offer-box">
          {specialOffers.map((offer, i) => (
            <span key={i} className="special-badge">
              {offer.name}
            </span>
          ))}
        </div>
      )}

      <p>
        <strong>좌석 현황:</strong>{" "}
        {trip.spaces?.availableSpaces}/{trip.spaces?.maxSpaces}
      </p>

      <hr />

      <h3>객실별 현황 및 요금</h3>

      {/* ✅ 객실 리스트 */}
      <div className="cabin-list">
        {cabins.map((cabin, index) => {
          const matchingSpace = trip.spaces?.cabinTypes?.find(
            (c) => c.id === cabin.id
          );

          const available = matchingSpace?.availableSpaces || 0;
          const option = matchingSpace?.optionSpaces || 0;
          const booked = matchingSpace?.bookedSpaces || 0;
          const subCabins = matchingSpace?.cabins || [];

          return (
            <div key={`${cabin.id}-${index}`} className="cabin-card">
              <h4>{cabin.name}</h4>

              <div className="seat-status">
                <span style={{ color: "#00b386", fontWeight: "bold" }}>
                  🟢 {available} Available
                </span>{" "}
                <span style={{ color: "#d4a017", fontWeight: "bold" }}>
                  🟡 {option} Option
                </span>{" "}
                <span style={{ color: "#e74c3c", fontWeight: "bold" }}>
                  🔴 {booked} Booked
                </span>
              </div>

              {/* ✅ 실제 객실 표시 */}
              {subCabins.length > 0 && (
                <div className="subcabin-list">
                  {subCabins.map((room) => (
                    <div key={room.id} className="subcabin-item">
                      <span className="room-name">{room.name}</span>
                      <span className="room-status">
                        {room.availableSpaces > 0 ? (
                          <span style={{ color: "#00b386" }}>
                            🟢 {room.availableSpaces} Available
                          </span>
                        ) : (
                          <span style={{ color: "#e74c3c" }}>🔴 Full</span>
                        )}
                      </span>

                      {/* ✅ 예약 선택 드롭다운 */}
                      {room.availableSpaces > 0 && (
                        <div className="book-controls">
                          <select
                            value={selectedOcc[room.id] ?? ""}
                            onChange={(e) => {
                              const occId = Number(e.target.value);
                              handleOccChange(room, occId, cabin.name, cabin);
                            }}
                            className="occ-select"
                          >
                            <option value="">예약 유형 선택</option>
                            {(cabin.occupancy || [])
                              .filter(o => [1, 2, 3].includes(Number(o.id)) && parseFloat(o.price) > 0) // 유효만
                              .map((o) => {
                                const label = getOccLabelById(o.id);
                                return label ? <option key={o.id} value={o.id}>{label}</option> : null;
                              })}
                          </select>



                          <button
                            className="book-btn"
                            onClick={() =>
                              removeBooking(room.id)
                            }
                            disabled={!selectedBookings.find((b) => b.id === room.id)}
                          >
                            예약 취소
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* ⭐ 객실 요금 표시 (label + price) */}
              {cabin.occupancy?.map((occ, j) => {
                let occLabel = "";
                if (occ.id === 1) occLabel = "1인 예약";
                else if (occ.id === 2) occLabel = "2인 예약";
                else if (occ.id === 3) occLabel = "독실 예약";

                // label 없으면 skip
                if (!occLabel) return null;

                return (
                  <div key={j} className="price-row">

                    {/* ⭐ 여기가 사라졌던 구간! */}
                    <span>{occLabel}</span>

                    <span className="price">
                      {formatCurrencyLocal(occ.price, currency)}
                    </span>

                    {occ.parentPrice && (
                      <span className="original">
                        {formatCurrencyLocal(occ.parentPrice, currency)}
                      </span>
                    )}
                  </div>
                );
              })}

            </div>
          );
        })}
      </div>

      {/* ✅ 예약 요약 표시 */}
      {selectedBookings.length > 0 && (
        <div className="booking-summary">
          <h3>선택한 예약 내역</h3>
          <ul>
            {selectedBookings.map((b, i) => (
              <li key={i}>
                {b.cabin} / {b.room} / {b.occLabel} —{" "}
                <strong>{formatCurrency(b.price, currency)}</strong>

              </li>
            ))}
          </ul>

          {focDetails.length > 0 && (
            <div style={{ color: "#007bff", fontWeight: "bold", marginTop: "10px" }}>
              {focDetails.map((f, i) => (
                <p key={i}>
                  {f.offerName || f.name}: {f.req}+{f.bonus} → 무료 {f.free}인
                  &nbsp;(-{formatCurrency(Math.round(f.discount), currency)})
                </p>

              ))}
            </div>
          )}


          <p><strong>총 합계:</strong> {formatCurrencyLocal(totalPrice, currency)}</p>




          <button
            className="confirm-btn"
            onClick={() =>
              navigate("/instructor/${trip.id}/confirm", {
                state: {
                  trip,
                  selectedBookings,
                  totalPrice,   // ✅ 합계 전달
                  focDiscount,  // ✅ FOC 할인액 전달
                  focDetails       // ✅ FOC 구조 정보 전달 (예: 7+1 등)
                },
              })
            }
          >
            예약 확인으로 이동 →
          </button>
        </div>
      )}

      {/* ✅ Footer */}
      <div className="footer-bar">
        <button
          onClick={() => navigate("/instructor/bookings")}
          className="back-btn"
        >
          ← 목록으로 돌아가기
        </button>
      </div>
    </div>
  );
}

export default InstructorBooking;
