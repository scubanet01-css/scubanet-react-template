import React, { useMemo, useState } from "react";
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

// ⭐ FOC 규칙 필터링
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

  // 🔎 디버그 로그
  console.log("=== TRIP DEBUG START ===");
  console.log("trip =", trip);
  console.log("trip.pricing =", trip?.pricing);
  console.log("trip.cabins =", trip?.cabins);
  console.log("trip.inventory =", trip?.inventory);
  console.log("trip.cabins[0] =", trip?.cabins?.[0]);
  console.log("trip.cabins[0].ratePlans =", trip?.cabins?.[0]?.ratePlans);
  console.log("=== TRIP DEBUG END ===");

  const currency = getCurrencyForTrip(trip);

  const [selectedBookings, setSelectedBookings] = useState([]);
  const [selectedOcc, setSelectedOcc] = useState({});

  if (!trip) return <p>잘못된 접근입니다.</p>;

  // -----------------------------------
  // 1) 기본 여행 정보 fallback
  // -----------------------------------
  const boatName =
    trip?.boat?.name ||
    trip?.boatName ||
    "정보 없음";

  const tripName =
    trip?.product?.name ||
    trip?.title ||
    trip?.tripName ||
    "정보 없음";

  // -----------------------------------
  // 2) UTS 기준 기본 강사 정보
  // -----------------------------------
  const instructorGroupPrice =
    Number(trip?.pricing?.instructorGroupPrice || 0) || 0;

  const instructorFOCPolicy =
    trip?.pricing?.instructorFOCPolicy ||
    trip?.focPolicy ||
    "";

  // -----------------------------------
  // 3) specialOffers를 UTS 기준으로 재구성
  // 기존 UI 유지용
  // -----------------------------------
  const specialOffers = useMemo(() => {
    const offers = [];

    if (trip?.pricing?.instructorFOCPolicy) {
      offers.push({
        name: trip.pricing.instructorFOCPolicy,
      });
    }

    if (Number(trip?.pricing?.publicDiscountPercent || 0) > 0) {
      offers.push({
        name: `Public ${trip.pricing.publicDiscountPercent}% Off`,
      });
    }

    if (Number(trip?.pricing?.fullCharterPrice || 0) > 0) {
      offers.push({
        name: "Full Charter",
      });
    }

    return offers;
  }, [trip]);

  // -----------------------------------
  // 4) 객실 리스트 구성 (UTS 기준)
  //
  // 우선순위:
  // pricing.cabins → trip.cabins
  // -----------------------------------
  const cabins = useMemo(() => {
    const pricingCabins = Array.isArray(trip?.pricing?.cabins)
      ? trip.pricing.cabins
      : [];

    if (pricingCabins.length > 0) {
      return pricingCabins.map((cabin, index) => {
        const occ = Array.isArray(cabin?.occupancy) ? [...cabin.occupancy] : [];

        const hasDouble = occ.some((o) => Number(o.id) === 2);
        if (!hasDouble) {
          const single = occ.find((o) => Number(o.id) === 1);
          if (single) {
            occ.push({
              id: 2,
              price: Number(single.price),
              parentPrice: single.parentPrice
                ? Number(single.parentPrice)
                : undefined,
              label: "Double (auto)",
            });
          }
        }

        // 독실 옵션이 없으면 single price 기준으로 fallback
        const hasPrivate = occ.some((o) => Number(o.id) === 3);
        if (!hasPrivate) {
          const single = occ.find((o) => Number(o.id) === 1);
          if (single) {
            occ.push({
              id: 3,
              price: Number(single.price),
              parentPrice: single.parentPrice
                ? Number(single.parentPrice)
                : undefined,
              label: "Private (auto)",
            });
          }
        }

        return {
          id: cabin?.id || cabin?.cabinId || `pricing-cabin-${index}`,
          name: cabin?.name || cabin?.cabinName || `객실 ${index + 1}`,
          occupancy: occ.length > 0
            ? occ
            : [
              { id: 1, price: instructorGroupPrice },
              { id: 2, price: instructorGroupPrice },
              { id: 3, price: instructorGroupPrice },
            ],
        };
      });
    }

    const tripCabins = Array.isArray(trip?.cabins) ? trip.cabins : [];

    return tripCabins.map((cabin, index) => {
      const basePrice =
        Number(cabin?.instructorPrice) ||
        instructorGroupPrice ||
        Number(trip?.pricing?.basePrice || 0) ||
        0;

      return {
        id: cabin?.id || cabin?.cabinId || `trip-cabin-${index}`,
        name: cabin?.name || cabin?.cabinName || `객실 ${index + 1}`,
        occupancy: [
          { id: 1, price: basePrice },
          { id: 2, price: basePrice },
          { id: 3, price: basePrice },
        ],
      };
    });
  }, [trip, instructorGroupPrice]);

  // -----------------------------------
  // 5) inventory를 cabin별로 묶기
  // 기존 UI의 subCabin 구조를 최대한 유지
  // -----------------------------------
  const cabinsWithRooms = useMemo(() => {
    const inventory = Array.isArray(trip?.inventory) ? trip.inventory : [];

    return cabins.map((cabin) => {
      const subCabins = inventory
        .filter((room) => {
          return (
            String(room?.cabinId) === String(cabin.id) ||
            String(room?.cabinTypeId) === String(cabin.id) ||
            String(room?.cabinType?.id) === String(cabin.id)
          );
        })
        .map((room, idx) => ({
          id: room?.id || room?.roomId || `${cabin.id}-room-${idx}`,
          name:
            room?.name ||
            room?.roomName ||
            room?.number ||
            `${cabin.name} ${idx + 1}`,
          availableSpaces:
            Number(room?.availableSpaces) ||
            Number(room?.available) ||
            0,
        }));

      // inventory가 없으면 cabin 자체를 1개의 room처럼 표시
      const fallbackSubCabins =
        subCabins.length > 0
          ? subCabins
          : [
            {
              id: `${cabin.id}-fallback`,
              name: cabin.name,
              availableSpaces: 1,
            },
          ];

      // cabin 단위 좌석 요약 (inventory 기준)
      const available = fallbackSubCabins.reduce(
        (sum, room) => sum + Number(room.availableSpaces || 0),
        0
      );

      return {
        ...cabin,
        available,
        option: 0,
        booked: 0,
        subCabins: fallbackSubCabins,
      };
    });
  }, [trip, cabins]);

  // -----------------------------------
  // 6) occupancy label
  // -----------------------------------
  const getOccLabelById = (id) => {
    if (Number(id) === 1) return "1인 예약";
    if (Number(id) === 2) return "2인 예약";
    if (Number(id) === 3) return "독실 예약";
    return null;
  };

  // -----------------------------------
  // 7) 예약 추가
  // 기존 selectedBookings 구조 최대 유지
  // -----------------------------------
  const handleAddBooking = (room, occId, cabinName, basePrice) => {
    const occLabel = getOccLabelById(occId);
    const multiplier = Number(occId) === 2 ? 2 : 1;
    const finalPrice = parseFloat(basePrice) * multiplier;

    const newBooking = {
      id: room.id,
      cabin: cabinName,
      room: room.name,
      occId,
      occLabel,
      price: finalPrice,
    };

    setSelectedBookings((prev) => {
      const exists = prev.find((b) => b.id === room.id);
      if (exists) {
        return prev.map((b) => (b.id === room.id ? newBooking : b));
      }
      return [...prev, newBooking];
    });
  };

  // -----------------------------------
  // 8) 예약 취소
  // -----------------------------------
  const removeBooking = (roomId) => {
    setSelectedBookings((prev) => prev.filter((b) => b.id !== roomId));
    setSelectedOcc((prev) => ({ ...prev, [roomId]: "" }));
  };

  // -----------------------------------
  // 9) 예약 변경 시 자동 추가 / 제거
  // -----------------------------------
  const handleOccChange = (room, occId, cabinName, cabin) => {
    setSelectedOcc((prev) => ({ ...prev, [room.id]: occId }));

    if (!occId) {
      removeBooking(room.id);
      return;
    }

    const occ = (cabin.occupancy || []).find(
      (o) => Number(o.id) === Number(occId)
    );
    const occPrice =
      parseFloat(occ?.price || 0) ||
      instructorGroupPrice ||
      0;

    if (occPrice > 0) {
      handleAddBooking(room, occId, cabinName, occPrice);
    } else {
      console.warn("⚠️ Price not found for selected occupancy id:", occId);
    }
  };

  // -----------------------------------
  // 10) 총 금액(선할인 전)
  // -----------------------------------
  const baseTotal = selectedBookings.reduce((sum, b) => sum + b.price, 0);

  // -----------------------------------
  // 11) FOC 오퍼 재구성
  // UTS의 instructorFOCPolicy를 기존 getBestFOCOffer용 형태로 변환
  // -----------------------------------
  const focOffers = useMemo(() => {
    const offers = [];

    if (instructorFOCPolicy) {
      offers.push({
        name: instructorFOCPolicy,
      });
    }

    return filterFOCOffers(offers);
  }, [instructorFOCPolicy]);

  // -----------------------------------
  // 12) pax(인원) 계산 및 unit price 배열
  // -----------------------------------
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

  // -----------------------------------
  // 13) FOC 계산
  // -----------------------------------
  let focDiscount = 0;
  let focDetails = [];
  let bestFOC = null;

  if (pax > 0 && unitPrices.length > 0 && focOffers.length > 0) {
    bestFOC = getBestFOCOffer(focOffers, pax, unitPrices);
  }

  if (bestFOC) {
    const sorted = unitPrices.slice().sort((a, b) => a - b);
    const freeCount = Number(bestFOC.free || bestFOC.bonus || 0);
    const discount = sorted
      .slice(0, freeCount)
      .reduce((sum, v) => sum + v, 0);

    focDiscount = discount;

    focDetails = [
      {
        offerName: bestFOC.name,
        req: bestFOC.req,
        bonus: bestFOC.bonus,
        freeUnits: freeCount,
        discount,
      },
    ];
  }

  // ✅ 최종 합계
  const totalPrice = baseTotal - focDiscount;

  console.log("🧩 FOC 계산 결과:", focDetails);

  return (
    <div className="instructor-detail-container">
      <h2>{boatName}</h2>
      <p className="product-name">{tripName}</p>

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
        {trip?.spaces?.available ?? 0} /{" "}
        {(Number(trip?.spaces?.available || 0) +
          Number(trip?.spaces?.holding || 0) +
          Number(trip?.spaces?.booked || 0)) || 0}
      </p>

      <hr />

      <h3>객실별 현황 및 요금</h3>

      {/* ✅ 객실 리스트 */}
      <div className="cabin-list">
        {cabinsWithRooms.map((cabin, index) => {
          const available = cabin.available || 0;
          const option = cabin.option || 0;
          const booked = cabin.booked || 0;
          const subCabins = cabin.subCabins || [];

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
                              .filter(
                                (o) =>
                                  [1, 2, 3].includes(Number(o.id)) &&
                                  parseFloat(o.price) > 0
                              )
                              .map((o) => {
                                const label = getOccLabelById(o.id);
                                return label ? (
                                  <option key={o.id} value={o.id}>
                                    {label}
                                  </option>
                                ) : null;
                              })}
                          </select>

                          <button
                            className="book-btn"
                            onClick={() => removeBooking(room.id)}
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

              {/* ⭐ 객실 요금 표시 */}
              {cabin.occupancy?.map((occ, j) => {
                let occLabel = "";
                if (occ.id === 1) occLabel = "1인 예약";
                else if (occ.id === 2) occLabel = "2인 예약";
                else if (occ.id === 3) occLabel = "독실 예약";

                if (!occLabel) return null;

                return (
                  <div key={j} className="price-row">
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
                  {f.offerName || f.name}: {f.req}+{f.bonus} → 무료 {f.freeUnits}인
                  &nbsp;(-{formatCurrency(Math.round(f.discount), currency)})
                </p>
              ))}
            </div>
          )}

          <p>
            <strong>총 합계:</strong> {formatCurrencyLocal(totalPrice, currency)}
          </p>

          <button
            className="confirm-btn"
            onClick={() =>
              navigate(`/instructor/${trip.id}/confirm`, {
                state: {
                  trip,
                  selectedBookings,
                  totalPrice,
                  focDiscount,
                  focDetails,
                  bookingType: "instructor",
                  currency,
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
          onClick={() => navigate("/instructor")}
          className="back-btn"
        >
          ← 목록으로 돌아가기
        </button>
      </div>
    </div>
  );
}

export default InstructorBooking;