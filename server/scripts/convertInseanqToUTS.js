// /root/scripts/convert/convertInseanqToUTS.js
const fs = require("fs");

console.log("🚀 UTS 변환 스크립트 시작됨");

// 파일 경로
const PATH_AVAIL = "/root/data/availability-detailed.json";
const PATH_BOATS = "/root/data/boats.json";
const PATH_BOATS_DETAILS = "/root/data/boats-details.json";
const PATH_OUT = "/root/data/uts-trips.json";

// 파일 체크
[PATH_AVAIL, PATH_BOATS, PATH_BOATS_DETAILS].forEach((p) => {
    if (!fs.existsSync(p)) console.error("❌ 파일 없음:", p);
    else console.log("✅ 파일 확인:", p);
});

// ID 정규화: boat_123 → 123, "123" → "123"
function normalizeId(id) {
    if (!id) return "";
    return String(id).replace(/boat_/i, "").trim();
}

// 숫자/문자 price를 숫자로 변환
function toNumber(val) {
    if (val === null || val === undefined) return null;
    const n = Number(String(val).replace(/[^0-9.]/g, ""));
    return Number.isNaN(n) ? null : n;
}

try {
    // JSON 로드
    let availability = JSON.parse(fs.readFileSync(PATH_AVAIL, "utf8"));
    let boats = JSON.parse(fs.readFileSync(PATH_BOATS, "utf8"));
    let boatDetails = JSON.parse(fs.readFileSync(PATH_BOATS_DETAILS, "utf8"));

    console.log("📄 JSON 로드 완료");

    // --- availability 배열 변환 ---
    if (!Array.isArray(availability) && Array.isArray(availability.data)) {
        console.log("ℹ️ availability.data 감지 → data 배열 사용");
        availability = availability.data;
    }
    if (!Array.isArray(availability)) {
        throw new Error("❌ availability-detailed.json 구조 오류: 배열이 아닙니다.");
    }

    // --- boats 배열 변환 ---
    if (!Array.isArray(boats) && Array.isArray(boats.data)) {
        console.log("ℹ️ boats.data 감지 → data 배열 사용");
        boats = boats.data;
    }
    if (!Array.isArray(boats)) {
        throw new Error("❌ boats.json 구조 오류: 배열이 아닙니다.");
    }

    // --- boats-details 배열 변환 ---
    if (!Array.isArray(boatDetails) && Array.isArray(boatDetails.data)) {
        console.log("ℹ️ boats-details.data 감지 → data 배열 사용");
        boatDetails = boatDetails.data;
    }
    if (!Array.isArray(boatDetails)) {
        throw new Error("❌ boats-details.json 구조 오류: 배열이 아닙니다.");
    }

    // 보트정보 가져오기: availability 한 건(a)을 받아 boat.id로 매칭
    function getBoatInfo(avail) {
        const boatId = avail.boat?.id;
        if (!boatId) return null;

        const nid = normalizeId(boatId);

        return (
            boatDetails.find((b) => normalizeId(b.id) === nid) ||
            boats.find((b) => normalizeId(b.id) === nid) ||
            null
        );
    }

    // ratePlan 정규화 (retail/charter 공통)
    function normalizeRatePlanEntry(ratePlan, cabinTypeId, occ, kind) {
        const price = toNumber(occ.price);
        const parentPrice = toNumber(occ.parentPrice);

        let discountPercent = 0;
        if (price !== null && parentPrice && parentPrice > 0) {
            discountPercent = Math.round((1 - price / parentPrice) * 1000) / 10; // 소수점 1자리
        }

        // 그룹/차터/강사용 추정 태깅 (이름 기반)
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
            kind,                 // "retail" or "charter"
            cabinTypeId,
            occupancyId: occ.id || null,   // 1/2/3 등
            price,
            parentPrice,
            discountPercent,
            isInstructorOnly: kind === "charter" || isGroupOrCharter,
        };
    }

    // 하나의 availability(a)에 대해 cabin 리스트 생성
    function buildCabins(avail) {
        const cabinTypes = avail.spaces?.cabinTypes || [];
        const ratePlansRetail = avail.ratePlansRetail || [];
        const ratePlansCharter = avail.ratePlansCharter || [];

        const cabins = [];

        // cabinType 기준 ratePlan 수집 함수
        function collectRatePlansForCabinType(cabinTypeId) {
            const collected = [];

            // Retail RatePlans
            ratePlansRetail.forEach((rp) => {
                const rpCabinTypes = rp.cabinTypes || [];
                rpCabinTypes.forEach((ct) => {
                    if (ct.id === cabinTypeId) {
                        (ct.occupancy || []).forEach((occ) => {
                            collected.push(
                                normalizeRatePlanEntry(rp, cabinTypeId, occ, "retail")
                            );
                        });
                    }
                });
            });

            // Charter RatePlans
            ratePlansCharter.forEach((rp) => {
                const rpCabinTypes = rp.cabinTypes || [];
                rpCabinTypes.forEach((ct) => {
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

        // cabinTypes → cabins (각 객실)
        cabinTypes.forEach((ct) => {
            const ctRatePlans = collectRatePlansForCabinType(ct.id);

            (ct.cabins || []).forEach((cabin) => {
                cabins.push({
                    cabinId: cabin.id,
                    name: cabin.name,
                    type: ct.name,               // "Standard", "Ocean View" 등
                    maxOccupancy: null,          // 추후 boats-details에서 보완 가능
                    remaining: cabin.availableSpaces ?? 0,
                    images: [],                  // 추후 boats-details에서 보완
                    ratePlans: ctRatePlans,      // 같은 cabinType의 요금제 공유
                });
            });
        });

        return cabins;
    }

    console.log("🔄 변환 시작");

    // Trip 변환
    const trips = availability.map((a) => {
        const boat = getBoatInfo(a);

        // 타이틀: product 이름 + boat 이름 조합
        const productName = a.product?.name || "";
        const boatNameFromAvail = a.boat?.name || "";
        const boatNameFromMeta = boat?.name || "";
        const finalBoatName = boatNameFromAvail || boatNameFromMeta || "";

        const titleBase = productName || "Liveaboard Trip";
        const title = finalBoatName
            ? `${titleBase} - ${finalBoatName}`
            : titleBase;

        return {
            id: `INQ_${a.id}`,
            source: "inseanq",
            tripType: "liveaboard",

            title,
            boatName: finalBoatName,

            // country / destination은 현재 구조에는 없음 → 추후 boats.json 분석 후 보완
            country: boat?.country || "",
            destination: boat?.destination || "",

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

            // 현재 JSON들에는 includes/excludes/itinerary가 없음 → 빈 배열로 유지
            includes: a.includes || boat?.includes || [],
            excludes: a.excludes || boat?.excludes || [],
            itinerary: a.itinerary || boat?.itinerary || [],
        };
    });

    console.log("💾 JSON 변환 완료 → 저장 시작");

    // 서버 저장
    fs.writeFileSync(PATH_OUT, JSON.stringify(trips, null, 2));

    // React public/data 자동 복사
    if (!fs.existsSync(REACT_PUBLIC_DATA)) {
        fs.mkdirSync(REACT_PUBLIC_DATA, { recursive: true });
    }

    fs.writeFileSync(REACT_OUT, JSON.stringify(trips, null, 2));

    console.log("🎉 UTS 변환 완료!");
    console.log("📁 서버 저장됨:", PATH_OUT);
    console.log("📁 React로 자동 복사됨:", REACT_OUT);

} catch (err) {
    console.error("❌ 변환 중 오류:", err);
}
