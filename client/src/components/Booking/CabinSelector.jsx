import React from "react";
import { formatCurrency } from "../../utils/formatCurrency";

function CabinSelector({ trip, cabins = [], selectedCabins, onChange, currency }) {
  // ✅ cabins prop이 있으면 우선 사용, 없으면 trip.cabins 사용
  const cabinList = Array.isArray(cabins) && cabins.length > 0
    ? cabins
    : (trip?.cabins || []);

  // ✅ occupancy id -> label
  const getOccupancyLabel = (occId, rp = {}) => {
    const id = String(occId ?? "");
    const text = [
      rp?.ratePlanName,
      rp?.name,
      rp?.code,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    // 키워드 우선
    if (
      text.includes("single use") ||
      text.includes("sole use") ||
      text.includes("single supplement") ||
      text.includes("single cabin") ||
      text.includes("독실")
    ) {
      return "독실 예약";
    }

    // occupancyId 기준
    if (id === "1") return "1인 예약";
    if (id === "2") return "2인 예약";
    if (id === "3") return "독실 예약";

    return `${id}인 예약`;
  };

  // ✅ cabin 하나에서 선택 가능한 옵션 만들기
  const getPriceOptions = (cabin) => {
    const ratePlans = Array.isArray(cabin?.ratePlans) ? cabin.ratePlans : [];
    if (!ratePlans.length) return [];

    console.log("🧪 [CabinSelector] cabin ratePlans =", cabin.name, ratePlans);

    // 1) UTS ratePlans를 직접 읽는다
    //    occupancyId가 핵심
    const rawOptions = ratePlans
      .filter((rp) => rp && rp.price != null)
      .map((rp) => {
        const occId =
          rp.occupancyId != null
            ? rp.occupancyId
            : rp.occupancy?.[0]?.id ?? 1;

        return {
          occupancy: String(occId),
          price: parseFloat(rp.price),
          label: getOccupancyLabel(occId, rp),
          ratePlanName: rp.ratePlanName || rp.name || "",
          discountPercent: Number(rp.discountPercent || 0),
          isInstructorOnly: !!rp.isInstructorOnly,
        };
      });

    // 2) 일반 예약 화면에서는 instructor 전용 요금 제외
    const publicOptions = rawOptions.filter((opt) => !opt.isInstructorOnly);

    // public 옵션이 있으면 그걸 우선, 없으면 rawOptions 사용
    const sourceOptions = publicOptions.length > 0 ? publicOptions : rawOptions;

    // 3) "1인 예약", "2인 예약", "독실 예약" 별로 최저가 하나만 남긴다
    const bestByLabel = new Map();

    sourceOptions.forEach((opt) => {
      if (!opt || !opt.label || isNaN(opt.price)) return;

      const existing = bestByLabel.get(opt.label);
      if (!existing || opt.price < existing.price) {
        bestByLabel.set(opt.label, opt);
      }
    });

    let finalOptions = Array.from(bestByLabel.values());

    // 4) 2인 예약이 없고 1인 예약만 있으면 자동 생성
    const hasOne = finalOptions.some((o) => o.label === "1인 예약");
    const hasTwo = finalOptions.some((o) => o.label === "2인 예약");

    if (hasOne && !hasTwo) {
      const one = finalOptions.find((o) => o.label === "1인 예약");
      finalOptions.push({
        occupancy: "2",
        price: one.price,
        label: "2인 예약",
        ratePlanName: "Auto-generated",
        discountPercent: 0,
        isInstructorOnly: false,
      });
    }

    // 5) 순서 정렬
    const order = {
      "1인 예약": 1,
      "2인 예약": 2,
      "독실 예약": 3,
    };

    finalOptions.sort((a, b) => {
      return (order[a.label] || 99) - (order[b.label] || 99);
    });

    return finalOptions;
  };

  // ✅ 드롭다운 선택 시 bookingData.selectedCabins 갱신
  const handleOccupancyChange = (
    cabin,
    occupancy,
    price,
    cabinName,
    label
  ) => {
    const updated = selectedCabins.filter((sc) => sc.cabinId !== cabin.cabinId);

    updated.push({
      cabinId: cabin.cabinId,
      cabinName,
      occupancyType: label,
      occupancyValue: occupancy,
      price,
    });

    onChange(updated);
  };

  console.log("🛏 [CabinSelector] cabinList =", cabinList);

  return (
    <div>
      <h3>🛏 객실과 인원을 선택해주세요!</h3>

      {(!cabinList || cabinList.length === 0) && (
        <p style={{ color: "#888" }}>선택 가능한 객실 정보가 없습니다.</p>
      )}

      {cabinList.map((cabin, index) => {
        const cabinId = cabin.cabinId || cabin.id || `cabin_${index}`;
        const cabinName = cabin.name || cabin.type || `객실 ${index + 1}`;
        const remaining = Number(cabin.remaining ?? cabin.availableSpaces ?? 0);

        const priceOptions = getPriceOptions(cabin);

        const lowestPrice =
          priceOptions.length > 0
            ? Math.min(...priceOptions.map((p) => p.price))
            : null;

        return (
          <div
            key={cabinId}
            style={{
              border: "1px solid #ccc",
              padding: "12px",
              marginBottom: "16px",
              borderRadius: "6px",
            }}
          >
            <h4>
              {cabinName}{" "}
              {lowestPrice != null && (
                <span style={{ color: "#555" }}>
                  (from {formatCurrency(lowestPrice, currency)} /인)
                </span>
              )}
            </h4>

            <p>가용 인원: {remaining}</p>

            {remaining > 0 && priceOptions.length > 0 ? (
              <select
                value={
                  selectedCabins.find((sc) => sc.cabinId === cabinId)
                    ?.occupancyValue || ""
                }
                onChange={(e) => {
                  const occupancy = e.target.value;
                  const selected = priceOptions.find(
                    (p) => p.occupancy === occupancy
                  );
                  if (selected) {
                    handleOccupancyChange(
                      { ...cabin, cabinId },
                      occupancy,
                      selected.price,
                      cabinName,
                      selected.label
                    );
                  }
                }}
              >
                <option value="">-- 인원 선택 --</option>

                {priceOptions.map((opt, idx) => (
                  <option key={idx} value={opt.occupancy}>
                    {opt.label} : {formatCurrency(opt.price, currency)} /인
                  </option>
                ))}
              </select>
            ) : (
              <p style={{ color: "#888" }}>예약 가능 인원이 없습니다</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default CabinSelector;