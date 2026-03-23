/**
 * 현재 적용 가능한 프로모션 1개 선택
 */
export function getActivePromotion(promotions, bookingType, bookingDate) {
    if (!Array.isArray(promotions)) return null;

    const now = new Date(bookingDate);

    const candidates = promotions.filter((p) => {
        if (!p) return false;

        // 상태 조건
        if (p.status !== "approved") return false;
        if (!p.isActive) return false;

        // 대상 조건
        const targetMatch =
            p.targetBookingType === "all" ||
            p.targetBookingType === bookingType;

        if (!targetMatch) return false;

        // 날짜 조건
        const start = new Date(`${p.bookingStartDate}T00:00:00`);
        const end = new Date(`${p.bookingEndDate}T23:59:59`);

        if (now < start || now > end) return false;

        return true;
    });

    if (candidates.length === 0) return null;

    // 우선순위 높은 순 → 할인율 높은 순
    candidates.sort((a, b) => {
        if ((b.priority || 0) !== (a.priority || 0)) {
            return (b.priority || 0) - (a.priority || 0);
        }
        return (b.discountValue || 0) - (a.discountValue || 0);
    });

    return candidates[0];
}

/**
 * 가격에 프로모션 적용
 */
export function applyPromotion({
    basePrice,
    bookingType,
    bookingDate,
    promotion,
}) {
    if (!promotion) {
        return {
            basePrice,
            finalPrice: basePrice,
            discountAmount: 0,
            appliedPromotion: null,
        };
    }

    let discountAmount = 0;

    if (promotion.discountType === "percent") {
        discountAmount = Math.round(
            basePrice * (promotion.discountValue / 100)
        );
    }

    const finalPrice = basePrice - discountAmount;

    return {
        basePrice,
        finalPrice,
        discountAmount,
        appliedPromotion: {
            id: promotion.id,
            title: promotion.title,
            discountValue: promotion.discountValue,
        },
    };
}