const path = require("path");
const fs = require("fs");

const INSEANQ_FILE = "/var/scubanet-data/uts-trips.json";
const SCUBADATES_FILE = "/var/scubanet-data/scubadates-uts-trips.json";

const SPECIAL_FILE = "/var/scubanet-data/special-trips.json";
const BOAT_ASSETS_DIR = "/var/scubanet-data/boats-assets";

const OUTPUT_MERGED_FILE = "/var/scubanet-data/merged-uts-trips.json";
const OUTPUT_DEV_FILE = "/root/scubanet-react-template/client/public/data/uts-trips.json";
const OUTPUT_PROD_FILE = "/var/scubanet-data/uts-trips.json";

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
                occupancyId:
                    plan.occupancyType === "single"
                        ? 1
                        : plan.occupancyType === "double"
                            ? 2
                            : null,
                occupancyValue:
                    plan.occupancyType === "single"
                        ? "1"
                        : plan.occupancyType === "double"
                            ? "2"
                            : "",
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

function normalizeText(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9가-힣]+/g, "");
}

function extractDestinationBasic(productName) {
    return (productName || "")
        .replace(/\([^)]*\)/g, "")
        .replace(/\b\d+d\s*\/\s*\d+n\b/gi, "")
        .replace(/\b\d+nights?\b/gi, "")
        .replace(/\b\d+days?\b/gi, "")
        .replace(/\s*[-–]\s*.*$/g, "")
        .trim();
}

function loadBoatAssetsForVessel(vesselId) {
    if (!vesselId) return null;

    try {
        const filePath = path.join(BOAT_ASSETS_DIR, `${vesselId}.json`);
        if (!fs.existsSync(filePath)) return null;

        const raw = fs.readFileSync(filePath, "utf8");
        return JSON.parse(raw);
    } catch (e) {
        console.error("❌ boat-assets JSON 로드/파싱 오류:", e);
        return null;
    }
}

function findMatchingSpecialCabinPrice(room, pricingCabins = [], fallbackPricing = {}) {
    const roomTypeKey = normalizeText(room?.cabinType);
    const roomNameKey = normalizeText(room?.roomName);

    const matched = (pricingCabins || []).find((c) => {
        const cabinCodeKey = normalizeText(c?.cabinCode);
        const cabinNameKey = normalizeText(c?.cabinName);

        return (
            (roomTypeKey && roomTypeKey === cabinNameKey) ||
            (roomTypeKey && roomTypeKey === cabinCodeKey) ||
            (roomNameKey && roomNameKey === cabinNameKey) ||
            (roomNameKey && roomNameKey === cabinCodeKey)
        );
    });

    return {
        publicPrice:
            matched?.publicPrice != null
                ? Number(matched.publicPrice)
                : fallbackPricing?.basePrice != null
                    ? Number(fallbackPricing.basePrice)
                    : null,
        instructorGroupPrice:
            matched?.instructorGroupPrice != null
                ? Number(matched.instructorGroupPrice)
                : fallbackPricing?.instructorGroupPrice != null
                    ? Number(fallbackPricing.instructorGroupPrice)
                    : null,
    };
}

function buildSpecialInventorySummary(inventory = []) {
    const activeRooms = (inventory || []).filter((room) => room?.status !== "maintenance");

    const totalSpaces = activeRooms.reduce(
        (sum, room) => sum + Number(room.capacity || 0),
        0
    );

    const bookedSpaces = activeRooms.reduce((sum, room) => {
        return sum + Number(room.occupied || 0);
    }, 0);

    const optionSpaces = activeRooms.reduce((sum, room) => {
        if (room.status !== "holding") return sum;
        const capacity = Number(room.capacity || 0);
        const occupied = Number(room.occupied || 0);
        return sum + Math.max(capacity - occupied, 0);
    }, 0);

    const availableSpaces = activeRooms.reduce((sum, room) => {
        if (room.status !== "available") return sum;
        const capacity = Number(room.capacity || 0);
        const occupied = Number(room.occupied || 0);
        return sum + Math.max(capacity - occupied, 0);
    }, 0);

    return {
        totalSpaces,
        availableSpaces,
        optionSpaces,
        bookedSpaces,
    };
}

function buildSpecialCabinsFromInventory(inventory = [], mergedPricing = {}) {
    const pricingCabins = Array.isArray(mergedPricing?.cabins) ? mergedPricing.cabins : [];

    return (inventory || [])
        .filter((room) => room?.status !== "maintenance")
        .map((room, index) => {
            const capacity = Number(room.capacity || 0);
            const occupied = Number(room.occupied || 0);
            const status = room.status || "available";

            const remaining = status === "available" ? Math.max(capacity - occupied, 0) : 0;

            const matchedPrice = findMatchingSpecialCabinPrice(room, pricingCabins, mergedPricing);

            const occupancyOptions = [];

            if (matchedPrice.publicPrice != null) {
                occupancyOptions.push({
                    id: 1,
                    price: matchedPrice.publicPrice,
                });

                if (capacity >= 2) {
                    occupancyOptions.push({
                        id: 2,
                        price: matchedPrice.publicPrice,
                    });
                }
            }

            const discountPercent = Number(mergedPricing?.publicDiscountPercent || 0);
            const basePrice = Number(matchedPrice.publicPrice || 0);

            const finalPrice =
                discountPercent > 0
                    ? Math.round(basePrice * (100 - discountPercent) / 100)
                    : basePrice;

            return {
                cabinId: room.roomId || `special_room_${index + 1}`,
                cabinCode: room.roomId || `special_room_${index + 1}`,
                name: room.roomName || `Room ${index + 1}`,
                type: room.cabinType || room.roomName || `Room ${index + 1}`,
                remaining,
                capacity,
                occupied,
                sharePolicy: room.sharePolicy || "none",
                status,
                images: [],
                ratePlans:
                    matchedPrice.publicPrice != null
                        ? [
                            {
                                code: "special_room_rate",
                                ratePlanId: "special_room_rate",
                                ratePlanName: "Special Trip Rate",

                                price: finalPrice,
                                parentPrice: basePrice,

                                discountPercent: discountPercent,
                                instructorGroupPrice: matchedPrice.instructorGroupPrice,
                                currency: mergedPricing?.currency || "USD",
                                source: "special",
                                occupancy: occupancyOptions,
                            },
                        ]
                        : [],
            };
        });
}

function mapSpecialTripToUTS(specialTrip) {
    const {
        specialTripId,
        vesselId,
        boatName: boatNameInput,
        title,
        region,
        destination,
        routeSummary,
        startDate,
        endDate,
        nights,
        embarkPort,
        disembarkPort,
        currency,
        publicPriceFrom,
        availableSpaces,
        optionSpaces = 0,
        bookedSpaces = 0,
        status,
        focPolicy,
        pricing = {},
    } = specialTrip;

    const boatAssets = vesselId ? loadBoatAssetsForVessel(vesselId) : null;
    const tripInfo = boatAssets?.tripInfo || {};

    const boatNameFromAssets = boatAssets?.boatName || boatAssets?.name || "";
    const boatName = boatNameInput || boatNameFromAssets || "";

    const mergedPricing = {
        currency: pricing.currency || currency || "USD",
        basePrice:
            pricing.basePrice != null
                ? pricing.basePrice
                : publicPriceFrom != null
                    ? publicPriceFrom
                    : null,
        publicDiscountPercent: pricing.publicDiscountPercent ?? 0,
        instructorGroupPrice:
            pricing.instructorGroupPrice != null ? pricing.instructorGroupPrice : null,
        instructorFOCPolicy: pricing.instructorFOCPolicy || focPolicy || "",
        fullCharterPrice:
            pricing.fullCharterPrice != null ? pricing.fullCharterPrice : null,
        cabins: Array.isArray(pricing.cabins) ? pricing.cabins : [],
    };

    const inventory = Array.isArray(specialTrip.inventory) ? specialTrip.inventory : [];
    const inventorySummary = buildSpecialInventorySummary(inventory);
    const cabinsForUTS = buildSpecialCabinsFromInventory(inventory, mergedPricing);

    return {
        id: `SPC_${specialTripId}`,
        source: "special",
        tripType: "liveaboard",

        vesselId,
        boatName,

        title: title || `${destination || ""} Special Trip`.trim(),

        country: region || "Others",
        destination: destination || extractDestinationBasic(routeSummary || title || ""),

        startDate,
        endDate,
        nights: nights || null,

        departurePort: embarkPort ? { name: embarkPort } : null,
        arrivalPort: disembarkPort ? { name: disembarkPort } : null,

        images: {
            cover: boatAssets?.assets?.hero?.url || "",
            gallery: [],
        },

        spaces: {
            available:
                inventory.length > 0 ? inventorySummary.availableSpaces : availableSpaces ?? 0,
            booked:
                inventory.length > 0 ? inventorySummary.bookedSpaces : bookedSpaces ?? 0,
            holding:
                inventory.length > 0 ? inventorySummary.optionSpaces : optionSpaces ?? 0,
        },

        adminDetails: {
            itinerary: tripInfo.itinerary || "",
            included: tripInfo.included || "",
            excluded: tripInfo.excluded || "",
        },

        cabins: cabinsForUTS,
        inventory,
        pricing: mergedPricing,

        isSpecialTrip: true,
        specialType: "scubanet-charter",
        status: status || "open",
    };
}

function applyPercentDiscount(price, discountPercent) {
    const basePrice = Number(price || 0);
    const percent = Number(discountPercent || 0);

    if (!basePrice || !percent) {
        return {
            price: basePrice,
            originalPrice: basePrice,
            discountPercent: 0,
            isDiscounted: false,
        };
    }

    const discountedPrice = Math.round(basePrice * (100 - percent) / 100);

    return {
        price: discountedPrice,
        originalPrice: basePrice,
        discountPercent: percent,
        isDiscounted: true,
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

    let specialTrips = [];
    if (fs.existsSync(SPECIAL_FILE)) {
        specialTrips = safeReadJson(SPECIAL_FILE)
            .map(mapSpecialTripToUTS)
            .filter(Boolean)
            .filter((trip) => trip.status !== "closed");
    }

    console.log(`- Inseanq trips: ${inseanqTrips.length}`);
    console.log(`- Scubadates trips: ${scubadatesTrips.length}`);
    console.log(`- Special trips: ${specialTrips.length}`);

    const merged = [...inseanqTrips, ...scubadatesTrips, ...specialTrips];
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