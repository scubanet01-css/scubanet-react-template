// /root/scubanet-react-template/server/scripts/convertInseanqToUTS.js
// Inseanq JSON → UTS Trip 통합 JSON 변환 스크립트

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

const PATH_OUT = path.join(DATA_DIR, "uts-trips.json");
const REACT_OUT = PATH_OUT;

// --------------------------------------------------
// 2. 기본 파일 체크
// --------------------------------------------------
[PATH_AVAIL, PATH_BOATS, PATH_BOATS_DETAILS].forEach((p) => {
    if (!fs.existsSync(p)) console.error("❌ 없음:", p);
    else console.log("✅ 파일 확인:", p);
});

// --------------------------------------------------
// 3. JSON 로드 유틸
// --------------------------------------------------
function loadJsonArray(fp) {
    const raw = fs.readFileSync(fp, "utf8");
    const json = JSON.parse(raw);
    if (Array.isArray(json)) return json;
    if (Array.isArray(json.data)) return json.data;
    throw new Error("❌ JSON 구조 오류 (배열 아님): " + fp);
}

// --------------------------------------------------
// 4. destination-map.json 로드
// Country → Destination → Ports 구조
// --------------------------------------------------
let DEST_MAP = {};
if (fs.existsSync(PATH_DEST_MAP)) {
    DEST_MAP = JSON.parse(fs.readFileSync(PATH_DEST_MAP, "utf8"));
    console.log("📌 destination-map.json 로드됨");
} else {
    console.log("⚠️ destination-map.json 없음 — country/destination 매칭 없이 진행");
}

// product.name 기반 destination/country 찾기
function findCountryDestination(productName) {
    if (!productName) return { country: "Others", destination: "Others" };

    const name = productName.toLowerCase();

    for (const country of Object.keys(DEST_MAP)) {
        const dests = DEST_MAP[country];

        for (const destination of Object.keys(dests)) {
            if (name.includes(destination.toLowerCase())) {
                return { country, destination };
            }
        }
    }

    return { country: "Others", destination: "Others" };
}

// --------------------------------------------------
// 5. 기타 유틸
// --------------------------------------------------
function normalizeId(id) {
    return String(id).replace(/boat_/i, "").trim();
}

function toNumber(val) {
    if (val === null || val === undefined) return null;
    const n = Number(String(val).replace(/[^0-9.]/g, ""));
    return isNaN(n) ? null : n;
}

// --------------------------------------------------
// 6. RatePlan/ Cabin 변환
// --------------------------------------------------
function normalizeRatePlanEntry(ratePlan, cabinTypeId, occ, kind) {
    const price = toNumber(occ.price);
    const parentPrice = toNumber(occ.parentPrice);

    let discountPercent = 0;
    if (price !== null && parentPrice > 0) {
        discountPercent = Math.round((1 - price / parentPrice) * 1000) / 10;
    }

    const name = (ratePlan.name || "").toLowerCase();
    const isInstructorOnly =
        kind === "charter" ||
        name.includes("group") ||
        name.includes("charter") ||
        name.includes("pax") ||
        name.includes("exclusive") ||
        name.includes("free");

    return {
        ratePlanId: ratePlan.id || null,
        ratePlanName: ratePlan.name || "",
        kind,
        cabinTypeId,
        occupancyId: occ.id || null,
        price,
        parentPrice,
        discountPercent,
        isInstructorOnly,
    };
}

function buildCabins(a) {
    const cabinTypes = a.spaces?.cabinTypes || [];
    const retail = a.ratePlansRetail || [];
    const charter = a.ratePlansCharter || [];

    const cabins = [];

    function collectRP(cabinTypeId) {
        const list = [];
        [...retail, ...charter].forEach((rp) => {
            const kind = rp.kind || (rp === retail ? "retail" : "charter");
            (rp.cabinTypes || []).forEach((ct) => {
                if (ct.id === cabinTypeId) {
                    (ct.occupancy || []).forEach((occ) => {
                        list.push(normalizeRatePlanEntry(rp, cabinTypeId, occ, rp.kind || kind));
                    });
                }
            });
        });
        return list;
    }

    cabinTypes.forEach((ct) => {
        const rpList = collectRP(ct.id);

        (ct.cabins || []).forEach((cabin) => {
            cabins.push({
                cabinId: cabin.id,
                name: cabin.name,
                type: ct.name,
                remaining: cabin.availableSpaces ?? 0,
                ratePlans: rpList,
            });
        });
    });

    return cabins;
}

// --------------------------------------------------
// 7. 메인 변환
// --------------------------------------------------
try {
    const availability = loadJsonArray(PATH_AVAIL);
    const boats = loadJsonArray(PATH_BOATS);
    const boatDetails = loadJsonArray(PATH_BOATS_DETAILS);

    console.log("📄 JSON 로드 완료 — 총", availability.length, "트립");

    const trips = availability.map((a) => {
        const boatId = normalizeId(a.boat?.id);
        const boat =
            boatDetails.find((b) => normalizeId(b.id) === boatId) ||
            boats.find((b) => normalizeId(b.id) === boatId) ||
            null;

        const boatName = boat?.name || a.boat?.name || "";
        const product = a.product?.name || "";
        const title = boatName ? `${product} - ${boatName}` : product;

        // 🔥 핵심: product.name 기반 검색
        const region = findCountryDestination(product);

        return {
            id: `INQ_${a.id}`,
            source: "inseanq",
            tripType: "liveaboard",

            title,
            boatName,

            country: region.country,
            destination: region.destination,

            startDate: a.startDate,
            endDate: a.endDate,
            nights: a.nights || null,

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

    console.log("💾 저장 중...");
    fs.writeFileSync(PATH_OUT, JSON.stringify(trips, null, 2), "utf8");

    console.log("🎉 변환 완료!");
    console.log("📁 저장됨:", PATH_OUT);
} catch (err) {
    console.error("❌ 변환 중 오류:", err);
}
