const path = require("path");
const fs = require("fs");

const INSEANQ_FILE = "/var/scubanet-data/uts-trips.json";
const SCUBADATES_FILE = "/var/scubanet-data/scubadates-uts-trips.json";

const OUTPUT_MERGED_FILE = "/var/scubanet-data/merged-uts-trips.json";
const OUTPUT_DEV_FILE = "/root/scubanet-react-template/client/public/data/uts-trips.json";
const OUTPUT_PROD_FILE = "/var/www/scubanet/data/uts-trips.json";

function safeReadJson(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`파일이 없습니다: ${filePath}`);
    }

    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw);

    if (!Array.isArray(data)) {
        throw new Error(`배열 형식이 아닙니다: ${filePath}`);
    }

    return data;
}

function writeJsonFile(filePath, data) {
    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
    fs.chmodSync(filePath, 0o644);

    try {
        fs.chownSync(filePath, 33, 33);
    } catch (e) {
        console.warn(`⚠️ chown 실패 (${filePath}):`, e.message);
    }
}

function toNumber(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
}

function normalizeInseanqTrip(trip) {
    return {
        ...trip,
        id: trip.id || trip.tripId || null,
        source: trip.source || "inseanq",
    };
}

function convertScubadatesTripToInseanqStyle(trip) {
    const cabins = Array.isArray(trip.cabins) ? trip.cabins : [];

    const convertedCabins = cabins.map((cabin, index) => {
        const ratePlans = Array.isArray(cabin.ratePlans) ? cabin.ratePlans : [];
        const totalSpaces = toNumber(cabin?.spaces?.totalSpaces);
        const availableSpaces = toNumber(cabin?.spaces?.availableSpaces);
        const bookedSpaces = toNumber(cabin?.spaces?.bookedSpaces);
        const optionSpaces = toNumber(cabin?.spaces?.optionSpaces);

        return {
            cabinId: cabin.cabinTypeId || `scubadates_cabin_${index + 1}`,
            name: cabin.name || "",
            type: cabin.name || "",
            remaining: availableSpaces,
            ratePlans: ratePlans.map((plan, rpIndex) => ({
                ratePlanId: `${cabin.cabinTypeId || index + 1}_${plan.rateCode || rpIndex}`,
                ratePlanName: plan.rateName || plan.rateCode || "Standard",
                kind: "retail",
                cabinTypeId: cabin.sourceCabinTypeId || cabin.cabinTypeId || null,
                occupancyId: plan.occupancyType || null,
                price: toNumber(plan.price),
                parentPrice: plan.originalPrice != null ? toNumber(plan.originalPrice) : null,
                discountPercent:
                    plan.originalPrice && plan.originalPrice > plan.price
                        ? Math.round(((plan.originalPrice - plan.price) / plan.originalPrice) * 100)
                        : 0,
                isInstructorOnly: false,
            })),
            images: [],
            deckCode: cabin.deck || null,
            bedType: null,
            quality: null,
            tags: [],
            canonicalType: cabin.name || "",
            meta: {
                totalSpaces,
                availableSpaces,
                bookedSpaces,
                optionSpaces,
                shareMaleSpaces: toNumber(cabin?.spaces?.shareMaleSpaces),
                shareFemaleSpaces: toNumber(cabin?.spaces?.shareFemaleSpaces),
                numberOfCabins: toNumber(cabin.numberOfCabins),
                spacesPerCabin: toNumber(cabin.spacesPerCabin),
            },
        };
    });

    const titleParts = [];
    if (trip.itineraryName) titleParts.push(trip.itineraryName);
    if (trip.boatName) titleParts.push(trip.boatName);

    const embarkPortName = trip?.embarkation?.port || "";
    const disembarkPortName = trip?.disembarkation?.port || "";

    return {
        id: trip.tripId,
        source: "scubadates",
        sourceTripId: trip.sourceTripId || trip.tripId,
        tripType: "liveaboard",
        vesselId: trip.vesselId || null,
        boatName: trip.boatName || "",
        title: titleParts.join(" - "),
        country: trip.destination || "",
        destination: trip.destination || "",
        startDate: trip.startDate || "",
        endDate: trip.endDate || "",
        nights: trip.nights || null,

        departurePort: {
            id: null,
            name: embarkPortName,
        },

        arrivalPort: {
            id: null,
            name: disembarkPortName,
        },

        images: {
            cover: "",
            gallery: [],
        },

        spaces: {
            available: toNumber(trip?.spaces?.availableSpaces),
            booked: toNumber(trip?.spaces?.bookedSpaces),
            holding: toNumber(trip?.spaces?.optionSpaces),
        },

        adminDetails: {
            itinerary: "",
            included: "",
            excluded: "",
        },

        cabins: convertedCabins,

        inventory: [],

        pricing: {
            currency: trip.currency || "",
            basePrice: trip.priceFrom != null ? toNumber(trip.priceFrom) : null,
            publicDiscountPercent:
                trip.originalPriceFrom && trip.originalPriceFrom > trip.priceFrom
                    ? Math.round(((trip.originalPriceFrom - trip.priceFrom) / trip.originalPriceFrom) * 100)
                    : 0,
            instructorGroupPrice: null,
            instructorFOCPolicy: null,
            fullCharterPrice: null,
            cabins: [],
        },

        isSpecialTrip: false,
        specialType: null,
        status: "open",

        departureConfirmed: !!trip.departureConfirmed,
        lastUpdate: trip.lastUpdate || "",
        mandatoryFees: Array.isArray(trip.mandatoryFees) ? trip.mandatoryFees : [],
        originalPriceFrom: trip.originalPriceFrom ?? null,
        isDiscounted: !!trip.isDiscounted,
    };
}

function dedupeTrips(trips) {
    const map = new Map();

    for (const trip of trips) {
        const key = trip.id || trip.tripId;

        if (!key) {
            console.warn("⚠️ id 없는 trip 발견, 건너뜀:", trip);
            continue;
        }

        if (!map.has(key)) {
            map.set(key, trip);
        } else {
            console.warn(`⚠️ 중복 trip 발견: ${key} → 기존 항목 유지`);
        }
    }

    return Array.from(map.values());
}

function sortTrips(trips) {
    return [...trips].sort((a, b) => {
        const dateA = a.startDate || "";
        const dateB = b.startDate || "";

        if (dateA !== dateB) {
            return dateA.localeCompare(dateB);
        }

        const boatA = a.boatName || "";
        const boatB = b.boatName || "";

        return boatA.localeCompare(boatB);
    });
}

function main() {
    console.log("🚀 UTS 통합 시작");

    const inseanqTrips = safeReadJson(INSEANQ_FILE)
        .filter((trip) => trip.source === "inseanq")
        .map(normalizeInseanqTrip);

    const scubadatesTrips = safeReadJson(SCUBADATES_FILE).map(convertScubadatesTripToInseanqStyle);

    console.log(`- Inseanq trips: ${inseanqTrips.length}`);
    console.log(`- Scubadates trips: ${scubadatesTrips.length}`);

    const merged = [...inseanqTrips, ...scubadatesTrips];
    const deduped = dedupeTrips(merged);
    const sorted = sortTrips(deduped);

    writeJsonFile(OUTPUT_MERGED_FILE, sorted);
    writeJsonFile(OUTPUT_DEV_FILE, sorted);
    writeJsonFile(OUTPUT_PROD_FILE, sorted);

    console.log(`✅ 통합 완료: ${OUTPUT_MERGED_FILE}`);
    console.log(`✅ 개발용 반영: ${OUTPUT_DEV_FILE}`);
    console.log(`✅ 서비스용 반영: ${OUTPUT_PROD_FILE}`);
    console.log(`✅ 최종 trip 수: ${sorted.length}`);

    const sourceCounts = sorted.reduce((acc, trip) => {
        const source = trip.source || "unknown";
        acc[source] = (acc[source] || 0) + 1;
        return acc;
    }, {});

    console.log("🔎 source별 trip 수:");
    Object.entries(sourceCounts).forEach(([source, count]) => {
        console.log(`- ${source}: ${count}`);
    });

    if (sorted.length > 0) {
        const first = sorted[0];
        console.log("🔎 첫 trip 확인:");
        console.log(`- id: ${first.id}`);
        console.log(`- source: ${first.source}`);
        console.log(`- boatName: ${first.boatName}`);
        console.log(`- startDate: ${first.startDate}`);
    }
}

main();