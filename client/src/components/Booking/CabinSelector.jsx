import React from "react";
import { formatCurrency } from "../../utils/formatCurrency";

function getCabinStatusLabel(cabin) {
  const capacity = Number(cabin.capacity || 0);
  const occupied = Number(cabin.occupied || 0);
  const sharePolicy = cabin.sharePolicy || "none";
  const status = cabin.status || "available";

  if (status === "maintenance") return "Maintenance";
  if (status === "holding") return "Holding";
  if (status === "booked") return "Booked";

  if (occupied === 0) return "Available";

  if (occupied > 0 && occupied < capacity) {
    if (sharePolicy === "male") return `Male Share (${occupied}/${capacity})`;
    if (sharePolicy === "female") return `Female Share (${occupied}/${capacity})`;
    if (sharePolicy === "mixed") return `Share (${occupied}/${capacity})`;

    return `Partially Occupied (${occupied}/${capacity})`;
  }

  return "Available";
}

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

    const makeFallbackLabel = (occId, rp) => {
      const occ = String(occId ?? "").trim();
      const planName = String(rp?.ratePlanName || rp?.name || "").toLowerCase();

      // 1) occupancyId 기준 우선
      if (occ === "1") return "1인 예약";
      if (occ === "2") return "2인 예약";

      // 2) ratePlanName 기준 보조 판단
      if (planName.includes("single")) return "1인 예약";
      if (planName.includes("double")) return "2인 예약";
      if (planName.includes("twin")) return "2인 예약";
      if (planName.includes("solo")) return "독실 예약";
      if (planName.includes("private")) return "독실 예약";

      // 3) 원래 함수 결과가 있으면 그걸 쓰고, 없으면 occupancy 기반 기본값
      const originalLabel = getOccupancyLabel(occId, rp);
      if (originalLabel) return originalLabel;

      return occ === "1" ? "1인 예약" : occ === "2" ? "2인 예약" : "";
    };

    const rawOptions = ratePlans
      .filter((rp) => rp && rp.price != null)
      .map((rp) => {
        const occId =
          rp.occupancyId != null
            ? rp.occupancyId
            : rp.occupancyValue != null
              ? Number(rp.occupancyValue)
              : rp.occupancy?.[0]?.id ?? 1;

        return {
          occupancy: String(occId),
          price: parseFloat(rp.price),
          label: makeFallbackLabel(occId, rp),
          ratePlanName: rp.ratePlanName || rp.name || "",
          discountPercent: Number(rp.discountPercent || 0),
          isInstructorOnly: !!rp.isInstructorOnly,
        };
      });

    const publicOptions = rawOptions.filter((opt) => !opt.isInstructorOnly);
    const sourceOptions = publicOptions.length > 0 ? publicOptions : rawOptions;

    const bestByLabel = new Map();

    sourceOptions.forEach((opt) => {
      if (!opt || !opt.label || isNaN(opt.price)) return;

      const existing = bestByLabel.get(opt.label);
      if (!existing || opt.price < existing.price) {
        bestByLabel.set(opt.label, opt);
      }
    });

    let finalOptions = Array.from(bestByLabel.values());

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
        const statusLabel = getCabinStatusLabel(cabin);
        const cabinStatus = cabin.status || "available";
        const isSelectable = cabinStatus === "available" && remaining > 0;
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

            <p>
              상태:{" "}
              <strong>
                {statusLabel}
              </strong>
            </p>

            <p>가용 인원: {remaining}</p>
            {isSelectable && priceOptions.length > 0 ? (
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
              <p style={{ color: "#888" }}>
                {cabin.status === "holding"
                  ? "현재 홀딩 중인 객실입니다"
                  : cabin.status === "booked"
                    ? "이미 예약 완료된 객실입니다"
                    : cabin.status === "maintenance"
                      ? "현재 사용 불가 객실입니다"
                      : "예약 가능 인원이 없습니다"}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default CabinSelector;