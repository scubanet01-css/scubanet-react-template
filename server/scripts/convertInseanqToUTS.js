/**
 * convertInseanqToUTS.js
 * Inseanq JSON → UTS JSON 변환
 */

const fs = require("fs");
const path = require("path");

console.log("🚀 UTS 변환 스크립트 시작됨");

// --------------------------------------------------
// 1. 경로 설정
// --------------------------------------------------
const DATA_DIR = "/var/www/scubanet/data";

const PATH_AVAIL = path.join(DATA_DIR, "availability-detailed.json");
const PATH_BOATS = path.join(DATA_DIR, "boats.json");
const PATH_BOATS_DETAILS = path.join(DATA_DIR, "boats-details.json");
const PATH_DEST_MAP = path.join(DATA_DIR, "destination-map.json");

const DEV_OUT = "/root/scubanet-react-template/client/public/data/uts-trips.json";
const PROD_OUT = path.join(DATA_DIR, "uts-trips.json");

// --------------------------------------------------
// 2. 파일 체크
// --------------------------------------------------
[PATH_AVAIL, PATH_BOATS, PATH_BOATS_DETAILS, PATH_DEST_MAP].forEach((p) => {
    if (!fs.existsSync(p)) console.error("❌ 파일 없음:", p);
    else console.log("✅ 파일 확인:", p);
});

// --------------------------------------------------
// 3. Country Keyword Rules (강화 버전)
// --------------------------------------------------
const COUNTRY_KEYWORDS = [
    { country: "Indonesia", keywords: ["komodo", "raja", "banda", "lembeh", "ambon", "bali", "alor", "misool", "sorong", "labuan", "halmahera", "ternate", "togean", "bitung", "luwuk", "bajau", "manado", "sangihe", "derawan", "sumbawa", "cenderawasih", "maluku", "triton", "waisai", "kaimana"] },
    { country: "Maldives", keywords: ["maldives", "ari", "male", "central atolls", "atolls", "laamu", "addu", "deeper south", "far south", "suvadiva", "far north", "hanifaru", "gan", "kooddoo", "gaafu", "gaafu dhaalu", "gaafu alifu"] },
    { country: "Egypt", keywords: ["red sea", "hurghada", "marsa", "ghalib", "zabargad", "deadalus", "thistlegorm", "brothers"] },
    { country: "Palau", keywords: ["palau", "koror", "malakal"] },
    { country: "Thailand", keywords: ["similan", "phuket", "surin", "ranong", "andaman", "thailand", "merdeka", "chalong", "thap lamu", "khao lak", "pakbara", "lipe"] },
    { country: "Ecuador", keywords: ["wolf", "darwin", "galapagos", "san cristobal", "baltra"] },
    { country: "Mexico", keywords: ["socorro", "revillagigedo", "cabo", "guadalupe", "cortez", "mag bay", "magdalena bay"] },
    { country: "Philippines", keywords: ["tubbataha", "visayas", "leyte", "cebu", "apu", "mactan", "apo"] },
    { country: "Solomon Islands", keywords: ["solomon", "honiara", "guadalcanal", "western provice", "munda", "gizo"] },
    { country: "Oman", keywords: ["oman", "dibba"] },
    { country: "Micronesia", keywords: ["truk", "chuuk", "weno", "truk lagoon"] },
    { country: "Myanmar", keywords: ["burma", "mergui"] },
    { country: "Papua New Guinea", keywords: ["kimbe", "rabaul", "kavieng", "alotau", "wewak", "madang", "walindi"] },
    { country: "Sudan", keywords: ["sudan"] },
    { country: "Seychelles", keywords: ["eden island"] },
    { country: "Marshall Islands", keywords: ["bikini", "kwajalein"] },
    { country: "Chile", keywords: ["punta arenas", "antarctica"] },
    { country: "Costa Rica", keywords: ["puntarenas", "cocos"] },
    { country: "Bahamas", keywords: ["grenada", "martinique", "st. vincent", "nassau", "st. lucia", "freeport", "bimini",] }
];

// --------------------------------------------------
// 4. 함수 정의
// --------------------------------------------------
function normalizeId(id) {
    if (!id) return "";
    return String(id).replace(/boat_/i, "").trim();
}

function toNumber(val) {
    if (val === null || val === undefined) return null;
    const n = Number(String(val).replace(/[^0-9.]/g, ""));
    return Number.isNaN(n) ? null : n;
}

function loadJsonArray(filePath, label) {
    const raw = fs.readFileSync(filePath, "utf8");
    let json = JSON.parse(raw);
    if (Array.isArray(json)) return json;
    if (Array.isArray(json.data)) {
        console.log(`ℹ️ ${label}: data 배열 사용`);
        return json.data;
    }
    throw new Error(`❌ ${label} JSON 구조 오류: 배열이 아닙니다.`);
}

// improved Country detection
function detectCountryImproved(productName, portName) {
    const text = `${productName} ${portName}`.toLowerCase();

    for (const rule of COUNTRY_KEYWORDS) {
        for (const kw of rule.keywords) {
            if (text.includes(kw)) {
                return rule.country;
            }
        }
    }

    console.log("⚠ Others 분류됨:", { productName, portName, text });
    return "Others";
}

function extractDestination(productName) {
    if (!productName) return "Unknown";

    return productName
        // 괄호 안 제거
        .replace(/\([^)]*\)/g, "")
        // 밤/일수 제거
        .replace(/\b\d+d\s*\/\s*\d+n\b/gi, "")
        .replace(/\b\d+nights?\b/gi, "")
        .replace(/\b\d+days?\b/gi, "")
        // 보트명 제거 패턴 ( – 또는 - 뒤에 나오는 보트명)
        .replace(/\s*[-–]\s*.*$/g, "")
        .trim();
}


function getBoatInfo(avail, boats, boatDetails) {
    const boatId = avail.boat?.id;
    const nid = normalizeId(boatId);

    if (!nid) return null;

    return (
        boatDetails.find((b) => normalizeId(b.id) === nid) ||
        boats.find((b) => normalizeId(b.id) === nid) ||
        null
    );
}

function normalizeRatePlanEntry(ratePlan, cabinTypeId, occ, kind) {
    const price = toNumber(occ.price);
    const parentPrice = toNumber(occ.parentPrice);

    let discountPercent = 0;
    if (price !== null && parentPrice && parentPrice > 0) {
        discountPercent = Math.round((1 - price / parentPrice) * 1000) / 10;
    }

    const nameLower = (ratePlan.name || "").toLowerCase();
    const isGroupOrCharter =
        nameLower.includes("group") ||
        nameLower.includes("charter") ||
        nameLower.includes("pax") ||
        nameLower.includes("exclusive") ||
        nameLower.includes("free");

    return {
        ratePlanId: ratePlan.id || null,
        ratePlanName: ratePlan.name || "",
        kind,
        cabinTypeId,
        occupancyId: occ.id || null,
        price,
        parentPrice,
        discountPercent,
        isInstructorOnly: kind === "charter" || isGroupOrCharter,
    };
}

function buildCabins(avail) {
    const cabinTypes = avail.spaces?.cabinTypes || [];
    const ratePlansRetail = avail.ratePlansRetail || [];
    const ratePlansCharter = avail.ratePlansCharter || [];

    const cabins = [];

    function collectRatePlansForCabinType(cabinTypeId) {
        const collected = [];

        ratePlansRetail.forEach((rp) => {
            (rp.cabinTypes || []).forEach((ct) => {
                if (ct.id === cabinTypeId) {
                    (ct.occupancy || []).forEach((occ) => {
                        collected.push(normalizeRatePlanEntry(rp, cabinTypeId, occ, "retail"));
                    });
                }
            });
        });

        ratePlansCharter.forEach((rp) => {
            (rp.cabinTypes || []).forEach((ct) => {
                if (ct.id === cabinTypeId) {
                    (ct.occupancy || []).forEach((occ) => {
                        collected.push(normalizeRatePlanEntry(rp, cabinTypeId, occ, "charter"));
                    });
                }
            });
        });

        return collected;
    }

    cabinTypes.forEach((ct) => {
        const ctRatePlans = collectRatePlansForCabinType(ct.id);

        (ct.cabins || []).forEach((cabin) => {
            cabins.push({
                cabinId: cabin.id,
                name: cabin.name,
                type: ct.name,
                remaining: cabin.availableSpaces ?? 0,
                images: [],
                ratePlans: ctRatePlans,
            });
        });
    });

    return cabins;
}

// --------------------------------------------------
// 5. 메인 로직
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

    const trips = availability.map((a) => {
        const boat = getBoatInfo(a, boats, boatDetails) || a.boat || null;

        const boatName = boat?.name || a.boat?.name || "";
        const productName = a.product?.name || "";
        const departurePortName = a.departurePort?.name || "";
        const country = detectCountryImproved(productName, departurePortName);
        const destination = extractDestination(productName);

        return {
            id: `INQ_${a.id}`,
            source: "inseanq",
            tripType: "liveaboard",

            title: `${productName} - ${boatName}`,
            boatName,

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
        };
    });

    console.log("💾 저장 시작");

    fs.writeFileSync(PROD_OUT, JSON.stringify(trips, null, 2), "utf8");
    fs.writeFileSync(DEV_OUT, JSON.stringify(trips, null, 2), "utf8");

    console.log("📁 저장 완료:");
    console.log(" - DEV :", DEV_OUT);
    console.log(" - PROD:", PROD_OUT);

} catch (err) {
    console.error("❌ 변환 중 오류:", err);
}
