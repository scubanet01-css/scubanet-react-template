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
const DATA_DIR = "/var/www/scubanet/data";

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

function buildCabins(avail) {
    const types = avail.spaces?.cabinTypes || [];
    const retail = avail.ratePlansRetail || [];
    const charter = avail.ratePlansCharter || [];
    const cabins = [];

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

        ct.cabins?.forEach((c) => {
            cabins.push({
                cabinId: c.id,
                name: c.name,
                type: ct.name,
                remaining: c.availableSpaces ?? 0,
                images: [],
                ratePlans,
            });
        });
    });

    // 🚫 Deck Space 제거 (기존 기능 유지)
    return cabins.filter(
        (c) =>
            !c.type.toLowerCase().includes("deck") &&
            !c.name.toLowerCase().includes("deck")
    );
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

        const country = detectCountryImproved(productName, portName);
        let destination = extractDestinationByCountry(country, productName);

        if (Array.isArray(destination)) {
            destination = destination[0];
        }

        trips.push({
            id: `INQ_${a.id}`,
            source: "inseanq",
            tripType: "liveaboard",

            vesselId,          // 🔥 추가
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

            cabins: buildCabins(a),
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
