// /root/scubanet-react-template/server/scripts/convertInseanqToUTS.js
// Inseanq JSON → UTS 통합 트립 JSON 변환 스크립트

const fs = require("fs");
const path = require("path");

console.log("🚀 UTS 변환 스크립트 시작됨");

// --------------------------------------------------
// 1. 경로 설정
// --------------------------------------------------
const DATA_DIR = "/var/www/scubanet/data";

// Inseanq 원본 JSON (fetchInseanqDataJSON.js가 저장한 파일)
const PATH_AVAIL = path.join(DATA_DIR, "availability-detailed.json");
const PATH_BOATS = path.join(DATA_DIR, "boats.json");
const PATH_BOATS_DETAILS = path.join(DATA_DIR, "boats-details.json");
const PATH_DEST_MAP = path.join(DATA_DIR, "destination-map.json");

// 결과 UTS 파일
const PATH_OUT = path.join(DATA_DIR, "uts-trips.json");

// React 앱에서도 같은 폴더를 사용 (정적 서빙용)
const REACT_PUBLIC_DATA = DATA_DIR;
const REACT_OUT = path.join(REACT_PUBLIC_DATA, "uts-trips.json");

// --------------------------------------------------
// 2. 사전 파일 체크
// --------------------------------------------------
[PATH_AVAIL, PATH_BOATS, PATH_BOATS_DETAILS, PATH_DEST_MAP].forEach((p) => {
    if (!fs.existsSync(p)) {
        console.error("❌ 필수 파일 없음:", p);
    } else {
        console.log("✅ 파일 확인:", p);
    }
});

// --------------------------------------------------
// 3. 유틸 함수
// --------------------------------------------------

// boat_123 → 123, "123" → "123"
function normalizeId(id) {
    if (!id) return "";
    return String(id).replace(/boat_/i, "").trim();
}

// 숫자/문자 가격 → number
function toNumber(val) {
    if (val === null || val === undefined) return null;
    const n = Number(String(val).replace(/[^0-9.]/g, ""));
    return Number.isNaN(n) ? null : n;
}

// JSON 로더: {data:[...]} 또는 [...] 모두 지원
function loadJsonArray(filePath, label) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`❌ ${label} 파일이 존재하지 않습니다: ${filePath}`);
    }
    const raw = fs.readFileSync(filePath, "utf8");
    let json = JSON.parse(raw);
    if (Array.isArray(json)) return json;
    if (Array.isArray(json.data)) {
        console.log(`ℹ️ ${label}: data 배열 사용`);
        return json.data;
    }
    throw new Error(`❌ ${label} JSON 구조 오류: 배열이 아닙니다.`);
}

// destination-map.json 로드 (boatName → {country, destination})
function loadDestinationMap(filePath) {
    if (!fs.existsSync(filePath)) {
        console.warn("⚠️ destination-map.json 없음. country/destination은 빈 값으로 저장됩니다.");
        return {};
    }

    const raw = fs.readFileSync(filePath, "utf8");
    const json = JSON.parse(raw);

    // 객체 형태 { "boatName": {country, destination}, ... }
    if (!Array.isArray(json) && typeof json === "object") {
        return json;
    }

    // 배열 형태일 경우, boatName 또는 name 기준으로 맵 재구성
    if (Array.isArray(json)) {
        const map = {};
        json.forEach((item) => {
            const key = (item.boatName || item.name || "").trim();
            if (!key) return;
            map[key] = {
                country: item.country || "",
                destination: item.destination || "",
            };
        });
        return map;
    }

    console.warn("⚠️ destination-map.json 구조를 해석할 수 없습니다. 빈 맵으로 진행합니다.");
    return {};
}

// boatName으로 country/destination 찾기
function getCountryDestination(boatName, destMap) {
    if (!boatName) return { country: "", destination: "" };
    const key = boatName.trim();
    const row = destMap[key];
    if (!row) return { country: "", destination: "" };
    return {
        country: row.country || "",
        destination: row.destination || "",
    };
}

// availability 한 건에서 boat 정보 찾기
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

// 하나의 occupancy → 표준 RatePlan 엔트리
function normalizeRatePlanEntry(ratePlan, cabinTypeId, occ, kind) {
    const price = toNumber(occ.price);
    const parentPrice = toNumber(occ.parentPrice);

    let discountPercent = 0;
    if (price !== null && parentPrice && parentPrice > 0) {
        discountPercent = Math.round((1 - price / parentPrice) * 1000) / 10; // 소수점 1자리
    }

    // 그룹/차터/강사 요금 추정 태깅 (이름 기반)
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
        kind, // "retail" or "charter"
        cabinTypeId,
        occupancyId: occ.id || null,
        price,
        parentPrice,
        discountPercent,
        isInstructorOnly: kind === "charter" || isGroupOrCharter,
    };
}

// availability 한 건에서 cabin / ratePlan 구조 만들기
function buildCabins(avail) {
    const cabinTypes = avail.spaces?.cabinTypes || [];
    const ratePlansRetail = avail.ratePlansRetail || [];
    const ratePlansCharter = avail.ratePlansCharter || [];

    const cabins = [];

    // cabinType 단위로 ratePlan 수집
    function collectRatePlansForCabinType(cabinTypeId) {
        const collected = [];

        // Retail
        ratePlansRetail.forEach((rp) => {
            (rp.cabinTypes || []).forEach((ct) => {
                if (ct.id === cabinTypeId) {
                    (ct.occupancy || []).forEach((occ) => {
                        collected.push(
                            normalizeRatePlanEntry(rp, cabinTypeId, occ, "retail")
                        );
                    });
                }
            });
        });

        // Charter
        ratePlansCharter.forEach((rp) => {
            (rp.cabinTypes || []).forEach((ct) => {
                if (ct.id === cabinTypeId) {
                    (ct.occupancy || []).forEach((occ) => {
                        collected.push(
                            normalizeRatePlanEntry(rp, cabinTypeId, occ, "charter")
                        );
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
                type: ct.name, // 예: Standard, Deluxe 등
                remaining: cabin.availableSpaces ?? 0,
                images: [], // 추후 boats-details에서 보완 가능
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
    // JSON 로드
    const availability = loadJsonArray(PATH_AVAIL, "availability-detailed");
    const boats = loadJsonArray(PATH_BOATS, "boats");
    const boatDetails = loadJsonArray(PATH_BOATS_DETAILS, "boats-details");
    const destMap = loadDestinationMap(PATH_DEST_MAP);

    console.log("📄 JSON 로드 완료");
    console.log("  - availability:", availability.length);
    console.log("  - boats:", boats.length);
    console.log("  - boatsDetails:", boatDetails.length);

    console.log("🔄 변환 시작");

    const trips = availability.map((a) => {
        const boat =
            getBoatInfo(a, boats, boatDetails) ||
            a.boat || // fallback
            null;

        const boatName =
            boat?.name || a.boat?.name || a.boatName || "";

        const productName = a.product?.name || "";
        const titleBase = productName || "Liveaboard Trip";
        const title = boatName ? `${titleBase} - ${boatName}` : titleBase;

        const { country, destination } = getCountryDestination(boatName, destMap);

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

            checkInTime: boat?.checkIn || "14:00",
            checkOutTime: boat?.checkOut || "09:00",

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

    // 폴더 보장
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(REACT_PUBLIC_DATA)) {
        fs.mkdirSync(REACT_PUBLIC_DATA, { recursive: true });
    }

    // 서버용 & React용 동일 파일 저장
    fs.writeFileSync(PATH_OUT, JSON.stringify(trips, null, 2), "utf8");
    fs.writeFileSync(REACT_OUT, JSON.stringify(trips, null, 2), "utf8");

    console.log("🎉 UTS 변환 완료!");
    console.log("📁 서버 저장:", PATH_OUT);
    console.log("📁 React 정적 경로 저장:", REACT_OUT);
} catch (err) {
    console.error("❌ 변환 중 오류:", err);
}
