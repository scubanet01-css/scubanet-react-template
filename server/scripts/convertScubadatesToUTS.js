const fs = require("fs");
const path = require("path");

const INPUT_FILE = "/var/scubanet-data/scubadates-trips.json";
const OUTPUT_FILE = "/var/scubanet-data/scubadates-uts-trips.json";

function toNumber(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
}

function safeString(value) {
    return value == null ? "" : String(value).trim();
}

function makeSafeTripId(rawId) {
    return `scubadates_${String(rawId).replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

function makeVesselId(vesselKey) {
    return `scubadates_vessel_${safeString(vesselKey)}`;
}

function calcNights(startDate, endDate) {
    if (!startDate || !endDate) return 0;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = end - start;

    return diff > 0 ? Math.round(diff / (1000 * 60 * 60 * 24)) : 0;
}

function chooseDisplayPrice(prices, occupancyType) {
    const block = prices?.[occupancyType] || {};

    const special = toNumber(block.special);
    const regular = toNumber(block.regular);

    if (special > 0) {
        return {
            price: special,
            originalPrice: regular > 0 ? regular : null,
            isDiscounted: regular > special,
            discountAmount: regular > special ? regular - special : 0,
        };
    }

    return {
        price: regular,
        originalPrice: null,
        isDiscounted: false,
        discountAmount: 0,
    };
}

function buildRatePlans(cabinType) {
    const currency = safeString(cabinType?.prices?.currency);
    const specialMeta = cabinType?.prices?.special || {};
    const plans = [];

    const doublePlan = chooseDisplayPrice(cabinType.prices, "double_occupancy");
    if (doublePlan.price > 0) {
        plans.push({
            rateCode: "double",
            rateName: "Double Occupancy",
            occupancyType: "double",
            price: doublePlan.price,
            originalPrice: doublePlan.originalPrice,
            currency,
            isDiscounted: doublePlan.isDiscounted,
            discountAmount: doublePlan.discountAmount,
            specialName: safeString(specialMeta.name) || null,
            specialType: safeString(specialMeta.type_of_discount) || null,
            specialValue: safeString(specialMeta.discount_value) || null,
        });
    }

    const singlePlan = chooseDisplayPrice(cabinType.prices, "single_occupancy");
    if (singlePlan.price > 0) {
        plans.push({
            rateCode: "single",
            rateName: "Single Occupancy",
            occupancyType: "single",
            price: singlePlan.price,
            originalPrice: singlePlan.originalPrice,
            currency,
            isDiscounted: singlePlan.isDiscounted,
            discountAmount: singlePlan.discountAmount,
            specialName: safeString(specialMeta.name) || null,
            specialType: safeString(specialMeta.type_of_discount) || null,
            specialValue: safeString(specialMeta.discount_value) || null,
        });
    }

    return plans;
}

function mapCabinType(cabinType) {
    const spaces = cabinType?.spaces || {};

    const totalSpaces = toNumber(spaces.total);
    const availableSpaces = toNumber(spaces.available);
    const optionSpaces = toNumber(spaces.on_hold);
    const bookedSpaces = Math.max(0, totalSpaces - availableSpaces - optionSpaces);

    return {
        cabinTypeId: `scubadates_cabin_${safeString(cabinType.key_scubadates)}`,
        sourceCabinTypeId: safeString(cabinType.key_scubadates),
        name: safeString(cabinType.name),
        deck: safeString(cabinType.deck),
        numberOfCabins: toNumber(cabinType.number_of_cabins),
        spacesPerCabin: toNumber(cabinType.spaces_per_cabin),
        spaces: {
            totalSpaces,
            availableSpaces,
            optionSpaces,
            bookedSpaces,
            shareMaleSpaces: toNumber(spaces.share_male),
            shareFemaleSpaces: toNumber(spaces.share_female),
        },
        ratePlans: buildRatePlans(cabinType),
    };
}

function mapTrip(item) {
    const trip = item?.trip || {};
    const vessel = trip?.vessel || {};
    const embarkation = trip?.embarkation || {};
    const disembarkation = trip?.disembarkation || {};
    const itinerary = trip?.itinerary || {};
    const status = trip?.status || {};

    const destinations = Array.isArray(itinerary.destinations)
        ? itinerary.destinations
        : [];

    const cabinTypes = Array.isArray(trip.cabintypes) ? trip.cabintypes : [];
    const mandatorySurcharges = Array.isArray(trip.mandatory_surcharges)
        ? trip.mandatory_surcharges
        : [];

    const cabins = cabinTypes.map(mapCabinType);

    const totalSpaces = cabins.reduce(
        (sum, cabin) => sum + toNumber(cabin.spaces.totalSpaces),
        0
    );
    const availableSpaces = cabins.reduce(
        (sum, cabin) => sum + toNumber(cabin.spaces.availableSpaces),
        0
    );
    const optionSpaces = cabins.reduce(
        (sum, cabin) => sum + toNumber(cabin.spaces.optionSpaces),
        0
    );
    const bookedSpaces = cabins.reduce(
        (sum, cabin) => sum + toNumber(cabin.spaces.bookedSpaces),
        0
    );

    const allRatePlans = cabins.flatMap((cabin) => cabin.ratePlans || []);
    const cheapestRate = allRatePlans.reduce((lowest, plan) => {
        if (!lowest) return plan;
        return plan.price < lowest.price ? plan : lowest;
    }, null);

    const currency =
        cheapestRate?.currency ||
        safeString(cabinTypes[0]?.prices?.currency) ||
        null;

    return {
        tripId: makeSafeTripId(trip.id),
        source: "scubadates",
        sourceTripId: safeString(trip.id),

        vesselId: makeVesselId(vessel.key_scubadates),
        sourceVesselId: safeString(vessel.key_scubadates),
        boatName: safeString(vessel.name),
        operatorName: safeString(vessel?.operator?.name),

        itineraryName: safeString(itinerary.name),
        destination: destinations
            .map((d) => safeString(d.name))
            .filter(Boolean)
            .join(", "),

        startDate: safeString(embarkation.date),
        endDate: safeString(disembarkation.date),

        embarkation: {
            date: safeString(embarkation.date),
            time: safeString(embarkation.time),
            port: safeString(embarkation.port),
        },

        disembarkation: {
            date: safeString(disembarkation.date),
            time: safeString(disembarkation.time),
            port: safeString(disembarkation.port),
        },

        nights: calcNights(embarkation.date, disembarkation.date),

        departureConfirmed: !!status.confirmed_departure,
        lastUpdate: safeString(status.last_update),

        currency,
        priceFrom: cheapestRate?.price || null,
        originalPriceFrom: cheapestRate?.originalPrice || null,
        isDiscounted: !!cheapestRate?.isDiscounted,

        spaces: {
            totalSpaces,
            availableSpaces,
            optionSpaces,
            bookedSpaces,
        },

        cabins,

        mandatoryFees: mandatorySurcharges.map((fee) => ({
            name: safeString(fee.name),
            amount: toNumber(fee.price),
            currency: safeString(fee.currency) || currency,
            payableOnLocation: !!fee.payable_on_location,
            payableWithBooking: !!fee.payable_with_booking,
            includedInTripPrice: !!fee.included_in_trip_price,
        })),
    };
}

function main() {

    if (!fs.existsSync(INPUT_FILE)) {
        throw new Error(`입력 파일이 없습니다: ${INPUT_FILE}`);
    }

    const raw = fs.readFileSync(INPUT_FILE, "utf-8");
    const data = JSON.parse(raw);

    if (!Array.isArray(data)) {
        throw new Error("Scubadates 입력 JSON은 배열이어야 합니다.");
    }

    const utsTrips = data.map(mapTrip);

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(utsTrips, null, 2), "utf-8");
    fs.chmodSync(OUTPUT_FILE, 0o644);

    try {
        fs.chownSync(OUTPUT_FILE, 33, 33); // www-data:www-data
    } catch (e) {
        console.warn("⚠️ chown 실패:", e.message);
    }

    if (utsTrips.length > 0) {
        const first = utsTrips[0];
    }
}

main();