export function getInstructorOfferLabel(trip) {
    const plans = trip.ratePlansRetail || [];
    if (!plans.length) return { foc: null, discount: null };

    const focOffers = plans.filter((p) =>
        /(group|foc|charter|paid)/i.test(p.name || "")
    );

    const parsed = focOffers
        .map((offer) => {
            const match = offer.name.match(/(\d+)\s*\+\s*(\d+)/);
            if (match) {
                return { req: Number(match[1]), bonus: Number(match[2]), name: offer.name };
            }
            if (offer.name.toLowerCase().includes("foc"))
                return { req: 7, bonus: 1, name: offer.name };
            return null;
        })
        .filter(Boolean);

    parsed.sort((a, b) => a.req - b.req);

    let focLabel = null;
    if (parsed[0]) {
        focLabel = `${parsed[0].req}+${parsed[0].bonus} FOC`;
    }

    const discountOffer = plans.find((p) =>
        /(off|discount|sale|november)/i.test(p.name || "")
    );

    let discountLabel = null;
    if (discountOffer) {
        const m = discountOffer.name.match(/(\d+)\s*%/);
        discountLabel = m ? `${m[1]}% OFF` : discountOffer.name;
    }

    return { foc: focLabel, discount: discountLabel };
}
