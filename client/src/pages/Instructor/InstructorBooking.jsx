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

// ✅ 일반 트립 ratePlan 우선순위 선택
function pickBestInstructorRatePlans(ratePlans = []) {
  if (!Array.isArray(ratePlans) || ratePlans.length === 0) return [];

  const normalized = ratePlans.map((rp) => ({
    ...rp,
    _name: String(rp.ratePlanName || rp.name || "").toLowerCase(),
    _price:
      Number(rp.price) ||
      Number(rp.finalPrice) ||
      Number(rp.discountedPrice) ||
      Number(rp.amount) ||
      0,
  }));

  // 1) group / charter / foc 우선
  const groupLike = normalized.filter(
    (rp) =>
      rp._name.includes("group") ||
      rp._name.includes("charter") ||
      rp._name.includes("foc")
  );
  if (groupLike.length > 0) return groupLike;

  // 2) 할인율 높은 것
  const discounted = normalized.filter((rp) => rp._name.includes("off"));
  if (discounted.length > 0) return discounted;

  // 3) standard
  const standard = normalized.filter((rp) => rp._name.includes("standard"));
  if (standard.length > 0) return standard;

  // 4) fallback: 가격 있는 전체
  return normalized.filter((rp) => rp._price > 0);
}

// ✅ occupancy 가격 매핑
function buildOccupancyFromRatePlans(ratePlans = []) {
  const selected = pickBestInstructorRatePlans(ratePlans);

  const occMap = new Map();

  selected.forEach((rp) => {
    const occId =
      Number(rp.occupancyId) ||
      Number(rp.occupancy?.id) ||
      0;

    const price =
      Number(rp.price) ||
      Number(rp.finalPrice) ||
      Number(rp.discountedPrice) ||
      Number(rp.amount) ||
      0;

    if (![1, 2, 3].includes(occId) || price <= 0) return;

    if (!occMap.has(occId)) {
      occMap.set(occId, {
        id: occId,
        price,
        label: rp.ratePlanName || rp.name || "",
      });
    } else {
      // 같은 occupancy 여러 개면 더 싼 것 우선
      const prev = occMap.get(occId);
      if (price < prev.price) {
        occMap.set(occId, {
          id: occId,
          price,
          label: rp.ratePlanName || rp.name || "",
        });
      }
    }
  });

  const result = Array.from(occMap.values()).sort((a, b) => a.id - b.id);

  // 2인 예약이 없으면 1인 가격 기준으로 자동 생성
  const hasDouble = result.some((o) => Number(o.id) === 2);
  if (!hasDouble) {
    const single = result.find((o) => Number(o.id) === 1);
    if (single) {
      result.push({
        id: 2,
        price: Number(single.price),
        label: "Double (auto)",
      });
    }
  }

  // 독실이 없으면 1인 가격 기준으로 자동 생성
  const hasPrivate = result.some((o) => Number(o.id) === 3);
  if (!hasPrivate) {
    const single = result.find((o) => Number(o.id) === 1);
    if (single) {
      result.push({
        id: 3,
        price: Number(single.price),
        label: "Private (auto)",
      });
    }
  }

  return result.sort((a, b) => a.id - b.id);
}

function InstructorBooking() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const trip = state?.trip;

  console.log("trip.inventory[0] =", trip?.inventory?.[0]);
  console.log("trip.inventory =", trip?.inventory);
  console.log("trip.pricing.cabins[0] =", trip?.pricing?.cabins?.[0]);
  console.log("trip.pricing.cabins[1] =", trip?.pricing?.cabins?.[1]);

  const currency = getCurrencyForTrip(trip);

  const [selectedBookings, setSelectedBookings] = useState([]);
  const [selectedOcc, setSelectedOcc] = useState({});

  if (!trip) return <p>잘못된 접근입니다.</p>;

  // -----------------------------------
  // 기본 정보
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

  const instructorGroupPrice =
    Number(trip?.pricing?.instructorGroupPrice || 0) || 0;

  const instructorFOCPolicy =
    trip?.pricing?.instructorFOCPolicy ||
    trip?.focPolicy ||
    "";

  // -----------------------------------
  // specialOffers
  // -----------------------------------
  const specialOffers = useMemo(() => {
    const offers = [];

    if (trip?.pricing?.instructorFOCPolicy) {
      offers.push({ name: trip.pricing.instructorFOCPolicy });
    }

    if (Number(trip?.pricing?.publicDiscountPercent || 0) > 0) {
      offers.push({
        name: `Public ${trip.pricing.publicDiscountPercent}% Off`,
      });
    }

    if (Number(trip?.pricing?.fullCharterPrice || 0) > 0) {
      offers.push({ name: "Full Charter" });
    }

    // 일반 trip의 ratePlans에서 group/foc 표시도 같이 추가
    if (Array.isArray(trip?.cabins)) {
      const names = new Set();

      trip.cabins.forEach((cabin) => {
        (cabin.ratePlans || []).forEach((rp) => {
          const name = rp.ratePlanName || rp.name || "";
          const lower = name.toLowerCase();

          if (
            lower.includes("group") ||
            lower.includes("charter") ||
            lower.includes("foc")
          ) {
            names.add(name);
          }
        });
      });

      Array.from(names).forEach((name) => offers.push({ name }));
    }

    return offers;
  }, [trip]);

  // -----------------------------------
  // 객실 리스트 구성
  //
  // 1) special: pricing.cabins + inventory
  // 2) general: trip.cabins + ratePlans
  // -----------------------------------
  const cabinGroups = useMemo(() => {
    // -----------------------------
    // A. special trip
    // -----------------------------
    if (trip?.pricing && Array.isArray(trip?.pricing?.cabins) && trip?.pricing.cabins.length > 0) {
      const pricingCabins = trip.pricing.cabins;
      const inventory = Array.isArray(trip?.inventory) ? trip.inventory : [];

      return pricingCabins.map((pricingCabin, index) => {
        const cabinName =
          pricingCabin?.name ||
          pricingCabin?.cabinName ||
          `객실 ${index + 1}`;

        const specialBasePrice =
          Number(pricingCabin?.instructorGroupPrice) ||
          Number(pricingCabin?.groupPrice) ||
          Number(pricingCabin?.price) ||
          instructorGroupPrice ||
          0;

        const occupancy = Array.isArray(pricingCabin?.occupancy) && pricingCabin.occupancy.length > 0
          ? pricingCabin.occupancy.map((o) => ({
            ...o,
            price:
              Number(o?.price) ||
              Number(o?.instructorGroupPrice) ||
              specialBasePrice,
          }))
          : [
            { id: 1, price: specialBasePrice },
            { id: 2, price: specialBasePrice },
            { id: 3, price: specialBasePrice },
          ];

        const subCabins = inventory
          .filter((room) => {
            const roomName = String(room?.roomName || room?.name || "");
            return roomName.includes(cabinName);
          })
          .map((room, idx) => {
            let availableSpaces = 0;

            // 1) 직접 값이 있으면 우선 사용
            if (room?.availableSpaces != null) {
              availableSpaces = Number(room.availableSpaces) || 0;
            } else if (room?.available != null && typeof room.available !== "number") {
              // boolean available 같은 경우
              availableSpaces = room.available ? 1 : 0;
            } else if (room?.available != null) {
              availableSpaces = Number(room.available) || 0;
            } else if (room?.capacity != null && room?.occupied != null) {
              // 2) special inventory 구조 대응
              availableSpaces = Math.max(
                0,
                Number(room.capacity || 0) - Number(room.occupied || 0)
              );
            } else if (String(room?.status || "").toLowerCase() === "available") {
              // 3) 마지막 fallback
              availableSpaces = 1;
            }

            return {
              id: room?.roomId || room?.id || `${cabinName}-${idx}`,
              name: room?.roomName || room?.name || `${cabinName} ${idx + 1}`,
              availableSpaces,
            };
          });

        return {
          id: pricingCabin?.id || pricingCabin?.cabinId || `special-${index}`,
          name: cabinName,
          occupancy,
          available: subCabins.reduce((sum, room) => sum + Number(room.availableSpaces || 0), 0),
          option: 0,
          booked: 0,
          subCabins: subCabins.length > 0
            ? subCabins
            : [
              {
                id: `${cabinName}-fallback`,
                name: cabinName,
                availableSpaces: 1,
              },
            ],
        };
      });
    }

    // -----------------------------
    // B. general trip
    // -----------------------------
    const tripCabins = Array.isArray(trip?.cabins) ? trip.cabins : [];

    return tripCabins.map((cabin, index) => {
      const occupancy = buildOccupancyFromRatePlans(cabin?.ratePlans || []);

      return {
        id: cabin?.cabinId || cabin?.id || `general-${index}`,
        name: cabin?.name || `객실 ${index + 1}`,
        occupancy:
          occupancy.length > 0
            ? occupancy
            : [
              { id: 1, price: instructorGroupPrice || 0 },
              { id: 2, price: instructorGroupPrice || 0 },
              { id: 3, price: instructorGroupPrice || 0 },
            ],
        available: Number(cabin?.remaining || 0) > 0 ? 1 : 0,
        option: 0,
        booked: 0,
        subCabins: [
          {
            id: cabin?.cabinId || cabin?.id || `room-${index}`,
            name: cabin?.name || `객실 ${index + 1}`,
            availableSpaces: Number(cabin?.remaining || 0) > 0 ? 1 : 0,
          },
        ],
      };
    });
  }, [trip, instructorGroupPrice]);

  // -----------------------------------
  // occupancy label
  // -----------------------------------
  const getOccLabelById = (id) => {
    if (Number(id) === 1) return "1인 예약";
    if (Number(id) === 2) return "2인 예약";
    if (Number(id) === 3) return "독실 예약";
    return null;
  };

  // -----------------------------------
  // 예약 추가
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

  const removeBooking = (roomId) => {
    setSelectedBookings((prev) => prev.filter((b) => b.id !== roomId));
    setSelectedOcc((prev) => ({ ...prev, [roomId]: "" }));
  };

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
  // 총 금액
  // -----------------------------------
  const baseTotal = selectedBookings.reduce((sum, b) => sum + b.price, 0);

  // -----------------------------------
  // FOC 오퍼 재구성
  // -----------------------------------
  const focOffers = useMemo(() => {
    const offers = [];

    if (instructorFOCPolicy) {
      offers.push({ name: instructorFOCPolicy });
    }

    if (Array.isArray(specialOffers)) {
      specialOffers.forEach((offer) => {
        if (offer?.name) offers.push({ name: offer.name });
      });
    }

    return filterFOCOffers(offers);
  }, [instructorFOCPolicy, specialOffers]);

  // -----------------------------------
  // pax(인원) 계산 및 unit price 배열
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
  // FOC 계산
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

      <div className="cabin-list">
        {cabinGroups.map((cabin, index) => {
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