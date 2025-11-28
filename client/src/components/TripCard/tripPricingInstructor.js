import { getCurrencyForTrip } from "../../utils/currencyUtils";

export function getLowestInstructorRate(trip) {
    const plans = trip.ratePlansRetail || [];
    let lowest = null;

    const toNum = (v) => Number(String(v).replace(/[^0-9.]/g, "")) || 0;

    plans.forEach((plan) => {
        plan.cabinTypes?.forEach((cabin) => {
            cabin.occupancy?.forEach((occ) => {
                const price = toNum(occ.price);
                const parent = toNum(occ.parentPrice);

                if (price > 0 && (!lowest || price < lowest.price)) {
                    lowest = {
                        price,
                        parentPrice: parent > price ? parent : null,
                        currency: getCurrencyForTrip(trip),
                        name: plan.name,
                    };
                }
            });
        });
    });

    return lowest;
}
