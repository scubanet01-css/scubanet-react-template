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
// 3. Country Keyword Rules
// --------------------------------------------------
const COUNTRY_KEYWORDS = [
    { country: "Indonesia", keywords: ["komodo", "raja", "banda", "lembeh", "ambon", "bali", "alor", "misool", "sorong", "labuan", "halmahera", "ternate", "togean", "bitung", "luwuk", "bajau", "manado", "sangihe", "derawan", "sumbawa", "cenderawasih", "maluku", "triton", "waisai", "kaimana"] },
    { country: "Maldives", keywords: ["maldives", "ari", "male", "central atolls", "laamu", "addu", "deep south", "far south", "hanifaru", "gan", "kooddoo", "gaafu"] },
    { country: "Egypt", keywords: ["red sea", "hurghada", "marsa", "ghalib", "zabargad", "deadalus", "thistlegorm", "brothers"] },
    { country: "Palau", keywords: ["palau", "koror", "malakal"] },
    { country: "Thailand", keywords: ["similan", "phuket", "surin", "ranong", "andaman", "chalong", "thap lamu"] },
    { country: "Ecuador", keywords: ["wolf", "darwin", "galapagos", "san cristobal", "baltra"] },
    { country: "Mexico", keywords: ["socorro", "revillagigedo", "cabo", "guadalupe", "cortez", "mag bay"] },
    { country: "Philippines", keywords: ["tubbataha", "visayas", "leyte", "cebu", "apu", "mactan", "apo"] },
    { country: "Solomon Islands", keywords: ["solomon", "honiara", "guadalcanal", "munda", "gizo"] },
    { country: "Oman", keywords: ["oman", "dibba"] },
    { country: "Micronesia", keywords: ["truk", "chuuk", "weno"] },
    { country: "Myanmar", keywords: ["burma", "mergui"] },
    { country: "Papua New Guinea", keywords: ["kimbe", "rabaul", "kavieng", "alotau", "wewak", "madang", "walindi"] },
    { country: "Sudan", keywords: ["sudan"] },
    { country: "Seychelles", keywords: ["seychelles", "eden island"] },
    { country: "Marshall Islands", keywords: ["bikini", "kwajalein"] },
    { country: "Chile", keywords: ["punta arenas", "antarctica"] },
    { country: "Costa Rica", keywords: ["puntarenas", "cocos"] },
    { country: "Bahamas", keywords: ["nassau", "freeport", "bimini"] },
];

// --------------------------------------------------
// 3-B. Destination Keyword Rules
// --------------------------------------------------
const DEST_KEYWORDS = {
    "Indonesia": [
        { destination: "Raja Ampat", keywords: ["raja ampat", "sorong", "misool", "fam", "wayag"] },
        { destination: "Banda Sea", keywords: ["banda", "ambon", "neira"] },
        { destination: "Komodo", keywords: ["komodo", "labuan bajo"] },
        { destination: "Alor", keywords: ["alor"] },
        { destination: "Halmahera", keywords: ["halmahera", "ternate"] },
        { destination: "Others", keywords: ["manado", "bunaken", "derawan", "triton", "cenderawasih", "moluccas", "banggai", "lembe", "seram", "sangihe", "sulawesi", "maluku", "sumbawa"] }
    ],

    "Maldives": [
        { destination: "Central Atolls", keywords: ["male", "central atolls", "4 atolls", "best of maldives", "equatorial maldives", "heart of the maldives", "best of the maldives", "special central", "top 12"] },
        { destination: "Deep South", keywords: ["deep south", "addu", "fuvahmulah", "kooddoo", "gan", "southern atolls", "extreme south atolls", "south maldives", "special south", "deeper south"] },
        { destination: "Hanifaru & North", keywords: ["hanifaru", "baa", "far north", "great north", "northern atolls", "manta madness"] },
        { destination: "Others", keywords: ["beyond the blue", "yoga", "family", "fishing", "kite", "surf", "safari", "suvadiva", "swim mania", "learn to dive"] }
    ],

    "Egypt": [
        { destination: "Hurghada", keywords: ["hurghada", "thistlegorm", "tiran", "ras muhammad", "red sea wrecks", "north"] },
        { destination: "BDE Reefs", keywords: ["ghalib", "marsa alam", "daedalus", "brothers", "elphinstone", "st. johns", "bde", "best of the red sea"] },
        { destination: "Deep South", keywords: ["hamata", "elba", "zabargad", "abu fandira", "southern route"] },
        { destination: "Others", keywords: ["custom", "yoga", "demand", "relax", "sharks", "dolphin", "ultimate"] }
    ],

    "Palau": [
        { destination: "Palau", keywords: ["palau", "koror", "malakal"] }
    ],
};

// --------------------------------------------------
// 4. 함수 정의
// --------------------------------------------------

function normalizeId(id) {
    return String(id || "").replace(/boat_/i, "").trim();
}

function toNumber(val) {
    if (val == null) return null;
    const num = Number(String(val).replace(/[^0-9.]/g, ""));
    return Number.isNaN(num) ? null : num;
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
    if (matched.length > 1) return matched;
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

    // --------------------------
    // ★ NEW: Trip 중복 제거 Set
    // --------------------------
    const seenIds = new Set();
    const trips = [];

    for (const a of availability) {
        if (seenIds.has(a.id)) continue;
        seenIds.add(a.id);

        const boat = getBoatInfo(a, boats, boatDetails) || a.boat || null;

        const productName = a.product?.name || "";
        const boatName = boat?.name || "";
        const portName = a.departurePort?.name || "";

        const country = detectCountryImproved(productName, portName);
        const destination = extractDestinationByCountry(country, productName);

        trips.push({
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
