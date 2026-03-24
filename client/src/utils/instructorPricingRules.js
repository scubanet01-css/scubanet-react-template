// src/utils/instructorPricingRules.js

// -----------------------------------
// trip 성격 판별
// -----------------------------------
export function isSpecialTrip(trip) {
    return trip?.isScubanetSpecial === true || trip?.source === "special";
}

export function isAggressorFleetTrip(trip) {
    const boatName = String(trip?.boatName || trip?.boat?.name || "").toLowerCase();
    const title = String(
        trip?.title || trip?.tripName || trip?.product?.name || ""
    ).toLowerCase();

    return boatName.includes("aggressor") || title.includes("aggressor");
}

// -----------------------------------
// offer name 수집
// -----------------------------------
export function extractOfferNames({ trip, specialOffers = [] }) {
    const names = [];

    if (Array.isArray(specialOffers)) {
        specialOffers.forEach((offer) => {
            if (offer?.name) names.push(String(offer.name));
        });
    }

    if (Array.isArray(trip?.specialOffers)) {
        trip.specialOffers.forEach((offer) => {
            if (offer?.name) names.push(String(offer.name));
        });
    }

    if (Array.isArray(trip?.cabins)) {
        trip.cabins.forEach((cabin) => {
            (cabin?.ratePlans || []).forEach((rp) => {
                if (rp?.name) names.push(String(rp.name));
            });
        });
    }

    return names;
}

export function hasDiscountOffer({ trip, specialOffers = [] }) {
    const names = extractOfferNames({ trip, specialOffers });

    return names.some((name) => {
        const lower = String(name).toLowerCase();
        return (
            lower.includes("off") ||
            lower.includes("discount") ||
            lower.includes("%")
        );
    });
}

// -----------------------------------
// Aggressor + 할인 = FOC 비활성화
// -----------------------------------
export function shouldDisableFOC({ trip, specialOffers = [] }) {
    return isAggressorFleetTrip(trip) && hasDiscountOffer({ trip, specialOffers });
}

// -----------------------------------
// FOC 공급원 통합
// -----------------------------------
export function resolveInstructorFOCPolicy({
    trip,
    policy = null,
    specialOffers = [],
}) {
    // 1) Aggressor 할인 프로그램이면 FOC 완전 비활성화
    if (shouldDisableFOC({ trip, specialOffers })) {
        return "";
    }

    // 2) Special trip 자체 정책 우선
    if (isSpecialTrip(trip)) {
        return (
            trip?.pricing?.instructorFOCPolicy ||
            trip?.focPolicy ||
            ""
        );
    }

    // 3) Inseanq 원본 FOC 사용
    if (trip?.source === "inseanq") {
        return (
            trip?.pricing?.instructorFOCPolicy ||
            trip?.focPolicy ||
            ""
        );
    }

    // 4) Scubadates / 기타는 관리자 정책 사용
    return policy?.focPolicy || "";
}