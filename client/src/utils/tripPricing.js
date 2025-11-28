// src/utils/tripPricing.js

/**
 * availability-basic / detailed 의 ratePlans 구조가 선사마다 달라도
 * "표시용 최저가 + 정가 + 할인배지" 를 안정적으로 뽑아주는 유틸
 *
 * - role === "diver"  : 퍼블릭/개인 예약용 플랜만 (group/charter/FOC 제외)
 * - role === "instructor" : 제약 없이 전부 허용 (현재는 Home에서 주로 diver 모드 사용)
 */

export function chooseRateForDisplay(trip, role = "diver") {
    // 1) ratePlans 소스 결정 (Retail 우선)
    const plans = Array.isArray(trip?.ratePlansRetail)
        ? trip.ratePlansRetail
        : Array.isArray(trip?.ratePlans)
            ? trip.ratePlans
            : Array.isArray(trip?.rate_plans)
                ? trip.rate_plans
                : [];

    if (!plans.length) return null;

    const toNum = (x) => {
        const n = Number(String(x ?? "").replace(/[^0-9.]/g, ""));
        return Number.isFinite(n) ? n : 0;
    };

    // 2) 역할별 플랜 필터 (다이버는 group/charter/FOC/instructor-only 제외)
    const visiblePlans = plans.filter((p) => {
        const text = `${p?.name ?? ""} ${p?.label ?? ""} ${p?.type ?? ""}`.toLowerCase();
        const isGroup =
            /group\s*\d+\+\d+/.test(text) ||
            /charter/.test(text) ||
            /foc/.test(text);
        const isInstructorOnly = /instructor|agent/.test(text);

        if (role === "instructor") return true;
        if (isGroup || isInstructorOnly) return false;
        return true;
    });

    if (!visiblePlans.length) return null;

    let best = null;

    for (const p of visiblePlans) {
        let minPrice = Infinity;
        let parentPrice = null;

        // 3-a) cabinTypes → occupancy 구조 탐색
        if (Array.isArray(p.cabinTypes)) {
            for (const cabin of p.cabinTypes) {
                if (!Array.isArray(cabin?.occupancy)) continue;

                for (const occ of cabin.occupancy) {
                    // 실제 판매가 후보
                    const price = toNum(
                        occ.discountPrice ??
                        occ.salePrice ??
                        occ.price ??
                        occ.fromPrice
                    );
                    if (!price || price <= 0) continue;

                    // 정가/원가 후보 (가능한 모든 필드 시도)
                    const parent = toNum(
                        occ.parentPrice ??
                        occ.originalPrice ??
                        occ.regularPrice ??
                        occ.rackRate ??
                        occ.standardPrice ??
                        occ.strikePrice ??
                        occ.listPrice
                    );

                    if (price < minPrice) {
                        minPrice = price;
                        parentPrice = parent > price ? parent : null;
                    }
                }
            }
        }

        // 3-b) 평면 구조(flat)도 대비
        if (minPrice === Infinity) {
            const flatPrice = toNum(
                p.discountPrice ?? p.salePrice ?? p.price ?? p.fromPrice
            );

            if (flatPrice > 0) {
                minPrice = flatPrice;

                const parent = toNum(
                    p.parentPrice ??
                    p.originalPrice ??
                    p.standardPrice ??
                    p.regularPrice ??
                    p.rackRate ??
                    p.listPrice ??
                    p.strikePrice
                );

                parentPrice = parent > flatPrice ? parent : null;
            }
        }

        if (minPrice !== Infinity) {
            if (!best || minPrice < best.price) {
                best = {
                    price: minPrice,
                    parentPrice,
                    name: p.name || p.label || "",
                    raw: p,
                };
            }
        }
    }

    if (!best) return null;

    // 4) 할인 배지/퍼센트 계산
    let badge = null;
    let discountPercent = 0;

    if (best.parentPrice && best.parentPrice > best.price) {
        discountPercent = Math.round(
            ((best.parentPrice - best.price) / best.parentPrice) * 100
        );

        if (discountPercent >= 5) {
            badge = `${discountPercent}% OFF`;
        }
    }

    // 정가 정보가 없거나 퍼센트가 작더라도,
    // 플랜 이름에 할인 키워드가 있으면 배지로 사용
    if (!badge) {
        const n = (best.name || "").toLowerCase();
        if (/early|special|promo|discount|off|sale/.test(n)) {
            badge = best.name;
        }
    }

    return {
        price: best.price, // 숫자형 실제 판매가
        parentPrice: best.parentPrice, // 숫자형 정가(없으면 null)
        displayPrice: best.price, // TripCard용
        strikePrice: best.parentPrice, // TripCard용
        discountPercent: discountPercent || null,
        badge, // "20% OFF" or "Early Bird" 등
        name: best.name,
    };
}
