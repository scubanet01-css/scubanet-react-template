/**
 * convertInseanqToUTS.js
 * Inseanq JSON → UTS JSON 변환
 * ✔ vesselId 생성 로직 추가 (기존 기능 100% 유지)
 */

const fs = require("fs");
const path = require("path");

console.log("🚀 UTS 변환 스크립트 시작됨");

// --------------------------------------------------
// 1. 기본 경로 설정
// --------------------------------------------------
const DATA_DIR = "/var/scubanet-data";

// --------------------------------------------------
// 2. 키워드 JSON 경로
// --------------------------------------------------
const PATH_KEYWORDS = path.join(DATA_DIR, "inseanq-keywords.json");

// --------------------------------------------------
// 3. 키워드 JSON 로드
// --------------------------------------------------
if (!fs.existsSync(PATH_KEYWORDS)) {
    console.error("❌ inseanq-keywords.json 파일을 찾을 수 없습니다:", PATH_KEYWORDS);
    process.exit(1);
}

const KEYWORDS = JSON.parse(fs.readFileSync(PATH_KEYWORDS, "utf8"));
const COUNTRY_KEYWORDS = KEYWORDS.COUNTRY_KEYWORDS;
const DEST_KEYWORDS = KEYWORDS.DEST_KEYWORDS;

// --------------------------------------------------
// 4. 나머지 원본 JSON 경로 설정
// --------------------------------------------------
const PATH_AVAIL = path.join(DATA_DIR, "availability-detailed.json");
const PATH_BOATS = path.join(DATA_DIR, "boats.json");
const PATH_BOATS_DETAILS = path.join(DATA_DIR, "boats-details.json");
const PATH_DEST_MAP = path.join(DATA_DIR, "destination-map.json");

// 출력 경로
const DEV_OUT = "/root/scubanet-react-template/client/public/data/uts-trips.json";
const PROD_OUT = path.join(DATA_DIR, "uts-trips.json");

// --------------------------------------------------
// 5. 파일 존재 여부 체크
// --------------------------------------------------
[PATH_AVAIL, PATH_BOATS, PATH_BOATS_DETAILS, PATH_DEST_MAP].forEach((p) => {
    if (!fs.existsSync(p)) console.error("❌ 파일 없음:", p);
    else console.log("✅ 파일 확인:", p);
});

// --------------------------------------------------
// 6. 공통 유틸 함수
// --------------------------------------------------
function normalizeId(id) {
    return String(id || "").replace(/boat_/i, "").trim();
}

function toNumber(val) {
    if (val == null) return null;
    const num = Number(String(val).replace(/[^0-9.]/g, ""));
    return Number.isNaN(num) ? null : num;
}

/**
 * 🔥 vesselId 생성을 위한 slugify
 * - 시스템용 식별자
 * - 불변, 예측 가능
 */
function slugify(text) {
    return String(text || "")
        .toLowerCase()
        .trim()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "_")
        .replace(/_+/g, "_");
}

/**
 * ✅ boats-assets JSON 로더
 *   /var/scubanet-data/boats-assets/{vesselId}.json
 */
const BOAT_ASSETS_DIR = path.join(DATA_DIR, "boats-assets"); // ✅ NEW

function loadBoatAssetsForVessel(vesselId) {                  // ✅ NEW
    if (!vesselId) return null;

    try {
        const filePath = path.join(BOAT_ASSETS_DIR, `${vesselId}.json`);
        if (!fs.existsSync(filePath)) {
            // console.warn("⚠ boat-assets JSON 없음:", filePath);
            return null;
        }

        const raw = fs.readFileSync(filePath, "utf8");
        const json = JSON.parse(raw);
        return json || null;
    } catch (e) {
        console.error("❌ boat-assets JSON 로드/파싱 오류:", e);
        return null;
    }
}

function loadJsonArray(filePath, label) {
    const raw = fs.readFileSync(filePath, "utf8");
    const json = JSON.parse(raw);

    if (Array.isArray(json)) return json;
    if (json && Array.isArray(json.data)) {
        console.log(`ℹ️ ${label}: data 배열 사용`);
        return json.data;
    }
    throw new Error(`❌ ${label} JSON 구조 오류: 배열이 아닙니다.`);
}

function detectCountryImproved(productName, portName) {
    const text = `${productName} ${portName}`.toLowerCase();

    for (const rule of COUNTRY_KEYWORDS) {
        for (const kw of rule.keywords) {
            if (text.includes(kw)) return rule.country;
        }
    }
    return "Others";
}

// ---------------------------
// Destination 자동 분류
// ---------------------------
function extractDestinationByCountry(country, productName) {
    const rules = DEST_KEYWORDS[country];
    const text = (productName || "").toLowerCase();
    const matched = [];

    if (rules) {
        for (const entry of rules) {
            for (const kw of entry.keywords) {
                if (text.includes(kw.toLowerCase())) {
                    matched.push(entry.destination);
                    break;
                }
            }
        }
    }

    if (matched.length === 1) return matched[0];
    if (matched.length > 1) return matched[0];
    return extractDestinationBasic(productName);
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

function getBoatInfo(avail, boats, boatDetails) {
    const id = normalizeId(avail.boat?.id);
    if (!id) return null;

    return (
        boatDetails.find((b) => normalizeId(b.id) === id) ||
        boats.find((b) => normalizeId(b.id) === id) ||
        null
    );
}

// --------------------------------------------------
// 6-A. Cabin 타입 표준화 유틸
// --------------------------------------------------
const CABIN_QUALITIES = ["STANDARD", "DELUXE", "SUITE", "BUDGET"];  // ✅ NEW
const BED_TYPES = ["DOUBLE", "TWIN", "TRIPLE", "QUAD"];             // ✅ NEW

function classifyCabinTypeName(name) {                              // ✅ NEW
    const s = String(name || "").toUpperCase();

    let quality = "STANDARD";
    const tags = [];
    let bedType = null;

    if (s.includes("MASTER")) {
        quality = "SUITE";
        tags.push("MASTER");
    } else if (s.includes("JUNIOR")) {
        quality = "SUITE";
        tags.push("JUNIOR");
    } else if (s.includes("SUITE")) {
        quality = "SUITE";
    } else if (s.includes("DELUXE")) {
        quality = "DELUXE";
    } else if (s.includes("BUDGET")) {
        quality = "BUDGET";
    } else {
        quality = "STANDARD";
    }

    if (s.includes("SEA VIEW")) {
        tags.push("SEA_VIEW");
    }
    if (s.includes("OCEAN VIEW")) {
        tags.push("OCEAN_VIEW");
    }

    if (s.includes("TRIPLE")) {
        bedType = "TRIPLE";
    } else if (s.includes("QUAD")) {
        bedType = "QUAD";
    } else if (s.includes("TWIN") && s.includes("DOUBLE")) {
        bedType = "DOUBLE";
    } else if (s.includes("TWIN")) {
        bedType = "TWIN";
    } else if (s.includes("DOUBLE")) {
        bedType = "DOUBLE";
    }

    const parts = [];
    parts.push(quality);

    if (tags.includes("SEA_VIEW")) parts.push("SEA_VIEW");
    if (tags.includes("OCEAN_VIEW")) parts.push("OCEAN_VIEW");
    if (tags.includes("MASTER")) parts.push("MASTER");
    if (tags.includes("JUNIOR")) parts.push("JUNIOR");

    if (bedType) parts.push(bedType);

    const cabinTypeCode = parts.join("_");

    return {
        cabinTypeCode,
        deckCode: null,
        bedType,
        quality,
        tags,
    };
}

function normalizeRatePlanEntry(ratePlan, cabinTypeId, occ, kind) {
    const price = toNumber(occ.price);
    const parentPrice = toNumber(occ.parentPrice);
    let discountPercent = 0;

    if (price != null && parentPrice > 0) {
        discountPercent = Math.round((1 - price / parentPrice) * 1000) / 10;
    }

    const name = (ratePlan.name || "").toLowerCase();
    const isGroup =
        name.includes("group") ||
        name.includes("charter") ||
        name.includes("pax") ||
        name.includes("exclusive");

    return {
        ratePlanId: ratePlan.id,
        ratePlanName: ratePlan.name,
        kind,
        cabinTypeId,
        occupancyId: occ.id,
        price,
        parentPrice,
        discountPercent,
        isInstructorOnly: kind === "charter" || isGroup,
    };
}

// 문자열에서 Deck 코드 추출
function detectDeckFromName(name) {
    const s = String(name || "").toLowerCase();
    if (s.includes("lower")) return "LOWER_DECK";
    if (s.includes("main")) return "MAIN_DECK";
    if (s.includes("upper")) return "UPPER_DECK";
    return null;
}

// 문자열에서 BedType 추출
function detectBedTypeFromName(name) {
    const s = String(name || "").toLowerCase();

    // Twin/Double 같이 둘 다 들어있는 경우
    if (s.includes("twin") && s.includes("double")) return "TWIN_DOUBLE";

    if (s.includes("twin")) return "TWIN";
    if (s.includes("double")) return "DOUBLE";
    if (s.includes("triple")) return "TRIPLE";
    if (s.includes("quad")) return "QUAD";

    return null;
}

// 품질(QUALITY) 추출: STANDARD / DELUXE / SUITE / BUDGET 등
function detectQualityFromName(name) {
    const s = String(name || "").toLowerCase();

    if (s.includes("master")) return "MASTER";
    if (s.includes("junior")) return "JUNIOR";
    if (s.includes("suite")) return "SUITE";
    if (s.includes("deluxe")) return "DELUXE";
    if (s.includes("budget")) return "BUDGET";

    // 기본값
    return "STANDARD";
}


function buildCabinClassification(cabinTypeName, cabinName) {
    const typeStr = String(cabinTypeName || "");
    const cabinStr = String(cabinName || "");

    const deckCode =
        detectDeckFromName(typeStr) || detectDeckFromName(cabinStr);

    const bedType =
        detectBedTypeFromName(cabinStr) || detectBedTypeFromName(typeStr);

    const quality = detectQualityFromName(typeStr || cabinStr);

    const tags = [];
    if (quality) tags.push(quality);
    if (deckCode) tags.push(deckCode);
    if (bedType) tags.push(bedType);

    const canonicalType =
        [quality, deckCode, bedType].filter(Boolean).join("__") || null;

    return {
        deckCode,
        bedType,
        quality,
        tags,
        canonicalType,
    };
}

function buildCabins(avail, boatAssets) {       // ✅ boatAssets 추가
    const types = avail.spaces?.cabinTypes || [];
    const retail = avail.ratePlansRetail || [];
    const charter = avail.ratePlansCharter || [];
    const cabins = [];
    const assetCabins = Array.isArray(boatAssets?.assets?.cabins)
        ? boatAssets.assets.cabins
        : (Array.isArray(boatAssets?.cabins) ? boatAssets.cabins : []);




    // Admin boats-assets cabins -> Map
    // key: QUALITY__DECK__BEDTYPE (가능하면) / QUALITY__DECK / QUALITY
    const assetCabinMap = new Map();

    (assetCabins || []).forEach((c) => {
        const quality = String(c?.cabinTypeCode || "").toUpperCase().trim();
        const deck = String(c?.deckCode || "").toUpperCase().trim();

        // bedType은 Admin JSON에 없으니 cabinName에서 추출 시도
        let bed = c?.bedType ? String(c.bedType).toUpperCase().trim() : detectBedTypeFromName(c?.cabinName || "");
        bed = bed ? bed.replace(/\s+/g, "_") : null;


        // Standard는 bed 힌트 없으면 기본 TWIN (정책)
        if (!bed && quality === "STANDARD") bed = "TWIN";

        // images 정리
        const images = Array.isArray(c?.images) ? c.images : [];
        if (!images.length) return;

        // ✅ 1순위 key: QUALITY__DECK__BED
        if (quality && deck && bed) {
            assetCabinMap.set(`${quality}__${deck}__${bed}`, { ...c, quality, deckCode: deck, bedType: bed, images });
        }

        // ✅ 2순위 key: QUALITY__DECK
        if (quality && deck) {
            // 이미 있으면 덮지 않음(첫번째가 더 구체적이므로)
            const k2 = `${quality}__${deck}`;
            if (!assetCabinMap.has(k2)) {
                assetCabinMap.set(k2, { ...c, quality, deckCode: deck, bedType: bed, images });
            }
        }

        // ✅ 3순위 key: QUALITY
        if (quality && !assetCabinMap.has(quality)) {
            assetCabinMap.set(quality, { ...c, quality, deckCode: deck, bedType: bed, images });
        }
    });


    function collectForType(typeId) {
        const out = [];

        retail.forEach((r) => {
            r.cabinTypes?.forEach((ct) => {
                if (ct.id === typeId) {
                    ct.occupancy?.forEach((occ) =>
                        out.push(normalizeRatePlanEntry(r, typeId, occ, "retail"))
                    );
                }
            });
        });

        charter.forEach((r) => {
            r.cabinTypes?.forEach((ct) => {
                if (ct.id === typeId) {
                    ct.occupancy?.forEach((occ) =>
                        out.push(normalizeRatePlanEntry(r, typeId, occ, "charter"))
                    );
                }
            });
        });

        return out;
    }

    types.forEach((ct) => {
        const ratePlans = collectForType(ct.id);

        // ✅ ct 단위 분류
        const classification = classifyCabinTypeName(ct.name);

        // quality는 우선 classification 기준으로 (assetMeta로 quality를 결정하려 하면 순환참조가 생김)
        const qualityFromType = String(classification.quality || classification.cabinTypeCode || "STANDARD").toUpperCase();

        ct.cabins?.forEach((c) => {
            // ✅ 이름 기반 추출
            const bedTypeFromName = detectBedTypeFromName(c?.name || "");
            const deckFromName = detectDeckFromName(c?.name || "");
            const deckFromType = classification.deckCode || null;

            // ✅ 일단 최종 deck/bed 후보를 만든다 (Admin meta 없을 때 기준)
            let deckFinal = deckFromType || deckFromName || null;

            let bedTypeFinal = bedTypeFromName || classification.bedType || null;
            if (bedTypeFinal) {
                bedTypeFinal = String(bedTypeFinal).toUpperCase().replace(/\s+/g, "_");
                if (bedTypeFinal === "TWIN/DOUBLE" || bedTypeFinal === "DOUBLE/TWIN") bedTypeFinal = "TWIN_DOUBLE";
            }

            // ✅ Standard는 bedType 없으면 기본 TWIN
            if (!bedTypeFinal && qualityFromType === "STANDARD") {
                bedTypeFinal = "TWIN";
            }

            // ✅ 여기서! Admin assetMeta를 “quality + deck (+ bedType)”로 찾는다
            const key3 = deckFinal && bedTypeFinal ? `${qualityFromType}__${deckFinal}__${bedTypeFinal}` : null;
            const key2 = deckFinal ? `${qualityFromType}__${deckFinal}` : null;
            const key1 = `${qualityFromType}`;

            const assetMeta =
                (key3 && assetCabinMap.get(key3)) ||
                (key2 && assetCabinMap.get(key2)) ||
                assetCabinMap.get(key1) ||
                null;

            // ✅ assetMeta가 있으면 deck/bedType을 Admin 값으로 덮어씌움 (Admin 우선)
            if (assetMeta?.deckCode) deckFinal = assetMeta.deckCode;

            // Admin JSON엔 bedType이 없으니(현재), 있으면만 반영
            if (assetMeta?.bedType) bedTypeFinal = assetMeta.bedType;

            // ✅ 최종 tags/quality
            const qualityFinal = String(assetMeta?.quality || qualityFromType || "STANDARD").toUpperCase();
            const tagsFinal =
                (assetMeta?.tags && assetMeta.tags.length ? assetMeta.tags : classification.tags) || [];

            // ✅ canonicalType 최종
            const tagCodes = tagsFinal
                .map((t) => String(t || "").toUpperCase().replace(/\s+/g, "_"))
                .filter(Boolean);

            const canonicalParts = [qualityFinal];
            if (bedTypeFinal) canonicalParts.push(bedTypeFinal);

            const OPTIONAL_TAGS = new Set(["MASTER", "JUNIOR", "SEA_VIEW", "OCEAN_VIEW", "BUDGET"]);
            for (const code of tagCodes) {
                if (OPTIONAL_TAGS.has(code) && !canonicalParts.includes(code)) canonicalParts.push(code);
            }

            const canonicalTypeFinal = canonicalParts.join("_");

            cabins.push({
                cabinId: c.id,
                name: c.name,
                type: ct.name,

                remaining: c.availableSpaces ?? 0,
                ratePlans,

                images: assetMeta?.images || [],

                deckCode: deckFinal,
                bedType: bedTypeFinal,
                quality: qualityFinal,
                tags: tagsFinal,

                canonicalType: canonicalTypeFinal,
            });
        });
    });




    // 🚫 Deck Space 제거 (기존 기능 유지)
    return cabins.filter((c) => {
        const type = (c.type || "").toLowerCase();
        const name = (c.name || "").toLowerCase();

        // "sun deck space", "upper deck space" 같은 진짜 데크 스페이스만 제외
        const isDeckSpace =
            type.includes("deck space") || name.includes("deck space");

        return !isDeckSpace;
    });
}


// --------------------------------------------------
// 7. 메인 로직
// --------------------------------------------------
try {
    const availability = loadJsonArray(PATH_AVAIL, "availability-detailed");
    const boats = loadJsonArray(PATH_BOATS, "boats");
    const boatDetails = loadJsonArray(PATH_BOATS_DETAILS, "boats-details");

    console.log("📄 JSON 로드 완료");
    console.log("  - availability:", availability.length);
    console.log("  - boats:", boats.length);
    console.log("  - boatDetails:", boatDetails.length);

    console.log("🔄 변환 시작");

    const seenIds = new Set();
    const trips = [];

    for (const a of availability) {
        if (seenIds.has(a.id)) continue;
        seenIds.add(a.id);

        const boat = getBoatInfo(a, boats, boatDetails) || a.boat || null;

        const productName = a.product?.name || "";
        const boatName = boat?.name || "";
        const portName = a.departurePort?.name || "";

        // 🔥 vesselId 생성 (UTS 공식 키)
        const vesselId = boatName
            ? `vessel_${slugify(boatName)}`
            : null;

        // ✅ boat-assets JSON 로드
        const boatAssets = vesselId ? loadBoatAssetsForVessel(vesselId) : null;
        // ✅ AdminBoatAssets에서 입력한 트립 상세 정보
        const tripInfo = boatAssets?.tripInfo || {};
        const country = detectCountryImproved(productName, portName);
        let destination = extractDestinationByCountry(country, productName);

        if (Array.isArray(destination)) {
            destination = destination[0];
        }

        trips.push({
            id: `INQ_${a.id}`,
            source: "inseanq",
            tripType: "liveaboard",

            vesselId,
            boatName,

            title: `${productName} - ${boatName}`,

            country,
            destination,

            startDate: a.startDate,
            endDate: a.endDate,
            nights: a.nights || null,

            departurePort: a.departurePort || null,
            arrivalPort: a.arrivalPort || null,

            images: {
                cover: boat?.images?.[0] || "",
                gallery: boat?.images || [],
            },

            spaces: {
                available: a.spaces?.availableSpaces || 0,
                booked: a.spaces?.bookedSpaces || 0,
                holding: a.spaces?.optionSpaces || 0,
            },

            // ✅ Admin에서 입력한 상세 일정 / 포함 / 불포함
            adminDetails: {
                itinerary: tripInfo.itinerary || "",
                included: tripInfo.included || "",
                excluded: tripInfo.excluded || "",
            },

            cabins: buildCabins(a, boatAssets),
        });
    }

    console.log(`🧹 중복 제거 완료 → 최종 Trip 수: ${trips.length}`);

    console.log("💾 저장 시작");
    fs.writeFileSync(PROD_OUT, JSON.stringify(trips, null, 2), "utf8");
    fs.writeFileSync(DEV_OUT, JSON.stringify(trips, null, 2), "utf8");

    console.log("📁 저장 완료:");
    console.log(" - DEV :", DEV_OUT);
    console.log(" - PROD:", PROD_OUT);

} catch (err) {
    console.error("❌ 변환 중 오류:", err);
}
