// ✅ /src/utils/pricingPolicy.js

export function getEffectivePrice(tripBasic, tripDetailed) {
    if (!tripBasic?.ratePlansRetail) return null;

    // 기본 숫자 변환 함수
    const toNumber = (v) => Number(String(v).replace(/[^0-9.]/g, "")) || 0;

    // 1️⃣ 기본 가격 (availability-basic 기준)
    let lowestBasic = null;
    for (const plan of tripBasic.ratePlansRetail) {
        for (const cabin of plan.cabinTypes || []) {
            for (const occ of cabin.occupancy || []) {
                const price = toNumber(occ.price);
                if (price > 0 && (!lowestBasic || price < lowestBasic.price)) {
                    const parentPrice = toNumber(occ.parentPrice);
                    lowestBasic = {
                        price,
                        parentPrice: parentPrice > price ? parentPrice : null,
                        currency: occ.currency || "USD",
                    };
                }
            }
        }
    }

    // 2️⃣ Group/FOC 여부 체크 (detailed 기준)
    const hasGroupOrFOC = tripDetailed?.ratePlansRetail?.some((p) =>
        /group|foc|free/i.test(p.name)
    );

    // 3️⃣ 최종 반환 (기준가는 basic 기준)
    return {
        displayPrice: lowestBasic?.price || null,
        strikePrice: lowestBasic?.parentPrice || null,
        badge: hasGroupOrFOC
            ? "Group/FOC"
            : lowestBasic?.parentPrice
                ? "할인"
                : null,
    };
}
