// convertInseanqToUTS.js
const fs = require("fs");
const path = require("path");

console.log("🚀 UTS 변환 스크립트 시작됨");

// --------------------------------------------------
// 경로 설정
// --------------------------------------------------
const DATA_DIR = "/var/www/scubanet/data";

const PATH_AVAIL = `${DATA_DIR}/availability-detailed.json`;
const PATH_BOATS = `${DATA_DIR}/boats.json`;
const PATH_BOATS_DETAILS = `${DATA_DIR}/boats-details.json`;
const PATH_OUT = `${DATA_DIR}/uts-trips.json`;

// React 앱 public/data/ 로 자동 복사
const REACT_PUBLIC_DATA = "/var/www/scubanet/data"; // 동일 폴더 사용
const REACT_OUT = `${REACT_PUBLIC_DATA}/uts-trips.json`;

// --------------------------------------------------
// 사전 파일 체크
// --------------------------------------------------
[PATH_AVAIL, PATH_BOATS, PATH_BOATS_DETAILS].forEach((p) => {
    if (!fs.existsSync(p)) console.error("❌ 파일 없음:", p);
    else console.log("✅ 파일 확인:", p);
});

// --------------------------------------------------
// 유틸 함수
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

// --------------------------------------------------
// 메인 로직
// --------------------------------------------------
try {
    let availability = JSON.parse(fs.readFileSync(PATH_AVAIL, "utf8"));
    let boats = JSON.parse(fs.readFileSync(PATH_BOATS, "utf8"));
    let boatDetails = JSON.parse(fs.readFileSync(PATH_BOATS_DETAILS, "utf8"));

    console.log("📄 JSON 로드 완료");

    if (!Array.isArray(availability) && Array.isArray(availability.data)) {
        availability = availability.data;
    }
    if (!Array.isArray(boats) && Array.isArray(boats.data)) {
        boats = boats.data;
    }
    if (!Array.isArray(boatDetails) && Array.isArray(boatDetails.data)) {
        boatDetails = boatDetails.data;
    }

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

    function normalizeRatePlanEntry(ratePlan, cabinTypeId, occ, kind) {
        const price = toNumber(occ.price);
        const parentPrice = toNumber(occ.parentPrice);

        let discountPercent = 0;
        if (price !== null && parentPrice && parentPrice > 0) {
            discountPercent = Math.round((1 - price / parentPrice) * 1000) / 10;
        }

        return {
            ratePlanId: ratePlan.id || null,
            ratePlanName: ratePlan.name || "",
            kind,
            cabinTypeId,
            occupancyId: occ.id || null,
            price,
            parentPrice,
            discountPercent,
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
                            collected.push(
                                normalizeRatePlanEntry(rp, cabinTypeId, occ, "retail")
                            );
                        });
                    }
                });
            });

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
                    type: ct.name,
                    remaining: cabin.availableSpaces ?? 0,
                    ratePlans: ctRatePlans,
                });
            });
        });

        return cabins;
    }

    console.log("🔄 변환 시작");

    const trips = availability.map((a) => {
        const boat = getBoatInfo(a);

        return {
            id: `INQ_${a.id}`,
            source: "inseanq",
            tripType: "liveaboard",

            title: (a.product?.name || "") + " - " + (boat?.name || ""),
            boatName: boat?.name || "",

            country: boat?.country || "",
            destination: boat?.destination || "",

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

    console.log("💾 저장 시작");

    fs.writeFileSync(PATH_OUT, JSON.stringify(trips, null, 2));
    fs.writeFileSync(REACT_OUT, JSON.stringify(trips, null, 2));

    console.log("🎉 UTS 변환 완료!");
    console.log("📁 저장됨:", PATH_OUT);

} catch (err) {
    console.error("❌ 변환 중 오류:", err);
}
