import React from "react";
import { formatCurrency } from "../../utils/formatCurrency";

function CabinSelector({ trip, cabins = [], selectedCabins, onChange, currency }) {
  // ✅ cabins prop이 있으면 우선 사용, 없으면 trip.cabins 사용
  const cabinList = Array.isArray(cabins) && cabins.length > 0
    ? cabins
    : (trip?.cabins || []);

  // ✅ occupancy id -> label
  const getOccupancyLabel = (occId) => {
    if (String(occId) === "1") return "1인 예약";
    if (String(occId) === "2") return "2인 예약";
    if (String(occId) === "3") return "독실 예약";
    return `${occId}인 예약`;
  };

  // ✅ cabin 하나에서 선택 가능한 옵션 만들기
  const getPriceOptions = (cabin) => {
    const ratePlans = Array.isArray(cabin?.ratePlans) ? cabin.ratePlans : [];
    if (!ratePlans.length) return [];

    // ratePlan 안에 occupancy 구조가 있으면 그걸 사용
    const occOptions = ratePlans.flatMap((rp) => {
      if (Array.isArray(rp.occupancy) && rp.occupancy.length > 0) {
        return rp.occupancy.map((opt) => ({
          occupancy: String(opt.id),
          price: parseFloat(opt.price),
          label: getOccupancyLabel(opt.id),
        }));
      }

      // ✅ occupancy 정보가 없으면 기본 1인 예약 옵션 생성
      if (rp.price != null) {
        return [
          {
            occupancy: "1",
            price: parseFloat(rp.price),
            label: "1인 예약",
          },
        ];
      }

      return [];
    });

    // 중복 제거 (occupancy + price 기준)
    const uniqueMap = new Map();
    occOptions.forEach((opt) => {
      const key = `${opt.occupancy}-${opt.price}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, opt);
      }
    });

    let finalOptions = Array.from(uniqueMap.values());

    // ✅ 1인만 있고 2인이 없으면 자동으로 2인 예약 추가
    const hasOne = finalOptions.some((o) => o.occupancy === "1");
    const hasTwo = finalOptions.some((o) => o.occupancy === "2");

    if (hasOne && !hasTwo) {
      const one = finalOptions.find((o) => o.occupancy === "1");
      finalOptions.push({
        occupancy: "2",
        price: one.price,
        label: "2인 예약",
      });
    }

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