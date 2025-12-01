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

const PATH_OUT = path.join(DATA_DIR, "uts-trips.json");

const REACT_PUBLIC_DATA = DATA_DIR;
const REACT_OUT = path.join(REACT_PUBLIC_DATA, "uts-trips.json");

// --------------------------------------------------
// 2. 파일 체크
// --------------------------------------------------
[PATH_AVAIL, PATH_BOATS, PATH_BOATS_DETAILS, PATH_DEST_MAP].forEach((p) => {
    if (!fs.existsSync(p)) console.error("❌ 파일 없음:", p);
    else console.log("✅ 파일 확인:", p);
});

// --------------------------------------------------
// 3. 유틸 함수
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

// JSON 로더
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

// destination-map.json 로드
function loadDestinationMap(filePath) {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw); // { Country: { Destination: [Ports...] } }
}

// departurePort 기반 Country 찾기
function findCountryByPort(portName, destMap) {
    if (!portName) return "Others";

    for (const country of Object.keys(destMap)) {
        const destinations = destMap[country];

        for (const dest of Object.keys(destinations)) {
            const portsArray = destinations[dest];
            if (portsArray.includes(portName)) {
                return country;
            }
        }
    }
    return "Others";
}

// productName 기반 Destination 추출 (기존 방식 유지)
function extractDestination(productName) {
    if (!productName) return "Unknown";
    return productName
        .replace(/\s*\([^)]*\)/g, "")
        .replace(/4D\/3N|3D\/2N|7Nights/gi, "")
        .trim();
}

// boat 정보 찾기
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

// RatePlan 정규화
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

// Cabin 구조 생성
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
// 4. 메인 로직
// --------------------------------------------------
try {
    const availability = loadJsonArray(PATH_AVAIL, "availability-detailed");
    const boats = loadJsonArray(PATH_BOATS, "boats");
    const boatDetails = loadJsonArray(PATH_BOATS_DETAILS, "boats-details");
    const destMap = loadDestinationMap(PATH_DEST_MAP);

    console.log("📄 JSON 로드 완료");
    console.log("  - availability:", availability.length);
    console.log("  - boats:", boats.length);
    console.log("  - boatDetails:", boatDetails.length);

    console.log("🔄 변환 시작");

    const trips = availability.map((a) => {
        const boat = getBoatInfo(a, boats, boatDetails) || a.boat || null;

        const boatName = boat?.name || a.boat?.name || "";
        const productName = a.product?.name || "";

        const title = boatName
            ? `${productName} - ${boatName}`
            : productName;

        // 🔥 핵심: Port 기반 Country 검출
        const departurePortName = a.departurePort?.name || "";
        const country = findCountryByPort(departurePortName, destMap);

        // Destination = product.name 기반
        const destination = extractDestination(productName);

        return {
            id: `INQ_${a.id}`,
            source: "inseanq",
            tripType: "liveaboard",

            title,
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

            includes: a.includes || boat?.includes || [],
            excludes: a.excludes || boat?.excludes || [],
            itinerary: a.itinerary || boat?.itinerary || [],
        };
    });

    console.log("💾 저장 시작");

    fs.writeFileSync(PATH_OUT, JSON.stringify(trips, null, 2), "utf8");
    fs.writeFileSync(REACT_OUT, JSON.stringify(trips, null, 2), "utf8");

    console.log("🎉 변환 완료!");
    console.log("📁 저장:", PATH_OUT);

} catch (err) {
    console.error("❌ 변환 중 오류:", err);
}
