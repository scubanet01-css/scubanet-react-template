// client/src/pages/Admin/AdminSpecialTrips.jsx
import React, { useEffect, useState } from "react";

// 개발용 API 서버 주소
const API_BASE = "http://210.114.22.82:3002";

function createEmptySpecialTrip() {
    return {
        specialTripId: "",
        vesselId: "",
        boatName: "",
        title: "",
        region: "",
        destination: "",
        routeSummary: "",
        startDate: "",
        endDate: "",
        nights: 7,
        embarkPort: "",
        disembarkPort: "",
        currency: "USD",

        totalSpaces: 0,
        availableSpaces: 0,
        optionSpaces: 0,
        bookedSpaces: 0,

        status: "open",
        isScubanetSpecial: true,
        salesMode: ["group", "open"],

        focPolicy: "",
        internalNote: "",

        pricing: {
            currency: "USD",
            basePrice: null,
            publicDiscountPercent: 0,
            instructorGroupPrice: null,
            instructorFOCPolicy: "",
            fullCharterPrice: null,
            cabins: [],
        },

        inventory: [],
    };
}


function formatDate(iso) {
    if (!iso) return "";
    try {
        const d = new Date(iso);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
    } catch {
        return iso;
    }
}

function getUniqueCabinTypesFromInventory(inventory = []) {
    const seen = new Set();
    const result = [];

    (inventory || []).forEach((room) => {
        const cabinType = String(room?.cabinType || "").trim();
        if (!cabinType) return;

        if (!seen.has(cabinType)) {
            seen.add(cabinType);
            result.push(cabinType);
        }
    });

    return result;
}

function syncPricingCabinsWithInventory(inventory = [], pricing = {}) {
    const cabinTypes = getUniqueCabinTypesFromInventory(inventory);
    const existingCabins = Array.isArray(pricing?.cabins) ? pricing.cabins : [];

    const syncedCabins = cabinTypes.map((cabinType) => {
        const existing = existingCabins.find(
            (c) => String(c?.cabinName || "").trim() === cabinType
        );

        return {
            cabinCode:
                existing?.cabinCode ||
                cabinType.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
            cabinName: cabinType,
            publicPrice: existing?.publicPrice ?? pricing?.basePrice ?? null,
            instructorGroupPrice:
                existing?.instructorGroupPrice ?? pricing?.instructorGroupPrice ?? null,
        };
    });

    return {
        ...(pricing || {}),
        cabins: syncedCabins,
    };
}

export default function AdminSpecialTrips() {
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedTrip, setSelectedTrip] = useState(null); // 선택된 트립
    const [formData, setFormData] = useState(null);         // 편집용 폼 데이터
    const [saving, setSaving] = useState(false);

    const handleCreateNew = () => {
        const emptyTrip = createEmptySpecialTrip();
        setSelectedTrip(emptyTrip);
        setFormData(emptyTrip);
    };

    // 최초 로딩: 목록 가져오기
    useEffect(() => {
        async function fetchTrips() {
            try {
                setLoading(true);
                setError("");

                const res = await fetch(`${API_BASE}/api/admin/special-trips`);
                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}`);
                }

                const data = await res.json();
                const arr = Array.isArray(data) ? data : [];

                setTrips(arr);

                // 첫 번째 항목 자동 선택
                if (arr.length > 0) {
                    setSelectedTrip(arr[0]);
                }
            } catch (err) {
                console.error("❌ special-trips 로드 오류:", err);
                setError("스페셜 트립 목록을 불러오는 중 오류가 발생했습니다.");
            } finally {
                setLoading(false);
            }
        }

        fetchTrips();
    }, []);

    // 선택된 트립이 바뀔 때마다 폼 데이터 동기화
    useEffect(() => {
        if (selectedTrip) {
            const fallbackPricing = {
                currency: "USD",
                basePrice: null,
                publicDiscountPercent: 0,
                instructorGroupPrice: null,
                instructorFOCPolicy: "",
                fullCharterPrice: null,
                cabins: [], // ⭐ 객실별 가격 기본 배열
            };

            function getDefaultInventory() {
                return [
                    { roomId: "1", roomName: "Upper Deck Twin 1", cabinType: "Upper Deck Twin", capacity: 2, status: "available" },
                    { roomId: "2", roomName: "Upper Deck Twin 2", cabinType: "Upper Deck Twin", capacity: 2, status: "available" },
                    { roomId: "3", roomName: "Upper Deck Twin 3", cabinType: "Upper Deck Twin", capacity: 2, status: "available" },
                    { roomId: "4", roomName: "Upper Deck Twin 4", cabinType: "Upper Deck Twin", capacity: 2, status: "available" },
                    { roomId: "5", roomName: "Lower Deck Twin 5", cabinType: "Lower Deck Twin", capacity: 2, status: "available" },
                    { roomId: "6", roomName: "Lower Deck Twin 6", cabinType: "Lower Deck Twin", capacity: 2, status: "available" },
                    { roomId: "7", roomName: "Lower Deck Twin 7", cabinType: "Lower Deck Twin", capacity: 2, status: "available" },
                    { roomId: "8", roomName: "Lower Deck Twin 8", cabinType: "Lower Deck Twin", capacity: 2, status: "available" },
                    { roomId: "9", roomName: "Lower Deck Quad 9", cabinType: "Lower Deck Quad", capacity: 4, status: "available" },
                ];
            }

            function getInventoryPresetByVesselId(vesselId) {
                if (vesselId === "vessel_scuba_molamola01") {
                    return [
                        {
                            roomId: "1", roomName: "Lower Deck Twin 1", cabinType: "Lower Deck Twin", capacity: 2, occupied: 0,
                            sharePolicy: "none", status: "available"
                        },
                        {
                            roomId: "2", roomName: "Lower Deck Twin 2", cabinType: "Lower Deck Twin", capacity: 2, occupied: 0,
                            sharePolicy: "none", status: "available"
                        },
                        {
                            roomId: "3", roomName: "Lower Deck Twin 3", cabinType: "Lower Deck Twin", capacity: 2, occupied: 0,
                            sharePolicy: "none", status: "available"
                        },
                        {
                            roomId: "4", roomName: "Lower Deck Twin 4", cabinType: "Lower Deck Twin", capacity: 2, occupied: 0,
                            sharePolicy: "none", status: "available"
                        },
                        {
                            roomId: "5", roomName: "Upper Deck Twin 5", cabinType: "Upper Deck Twin", capacity: 2, occupied: 0,
                            sharePolicy: "none", status: "available"
                        },
                        {
                            roomId: "6", roomName: "Upper Deck Twin 6", cabinType: "Upper Deck Twin", capacity: 2, occupied: 0,
                            sharePolicy: "none", status: "available"
                        },
                        {
                            roomId: "7", roomName: "Upper Deck Twin 7", cabinType: "Upper Deck Twin", capacity: 2, occupied: 0,
                            sharePolicy: "none", status: "available"
                        },
                        { roomId: "8", roomName: "Upper Deck Twin 8", cabinType: "Upper Deck Twin", capacity: 2, status: "available" },
                    ];
                }

                if (vesselId === "vessel_scuba_molamola02") {
                    return [
                        {
                            roomId: "1", roomName: "Upper Deck Twin 1", cabinType: "Upper Deck Twin", capacity: 2, occupied: 0,
                            sharePolicy: "none", status: "available"
                        },
                        {
                            roomId: "2", roomName: "Upper Deck Twin 2", cabinType: "Upper Deck Twin", capacity: 2, occupied: 0,
                            sharePolicy: "none", status: "available"
                        },
                        {
                            roomId: "3", roomName: "Upper Deck Twin 3", cabinType: "Upper Deck Twin", capacity: 2, occupied: 0,
                            sharePolicy: "none", status: "available"
                        },
                        {
                            roomId: "4", roomName: "Upper Deck Twin 4", cabinType: "Upper Deck Twin", capacity: 2, occupied: 0,
                            sharePolicy: "none", status: "available"
                        },
                        {
                            roomId: "5", roomName: "Lower Deck Twin 5", cabinType: "Lower Deck Twin", capacity: 2, occupied: 0,
                            sharePolicy: "none", status: "available"
                        },
                        {
                            roomId: "6", roomName: "Lower Deck Twin 6", cabinType: "Lower Deck Twin", capacity: 2, occupied: 0,
                            sharePolicy: "none", status: "available"
                        },
                        {
                            roomId: "7", roomName: "Lower Deck Twin 7", cabinType: "Lower Deck Twin", capacity: 2, occupied: 0,
                            sharePolicy: "none", status: "available"
                        },
                        {
                            roomId: "8", roomName: "Lower Deck Twin 8", cabinType: "Lower Deck Twin", capacity: 2, occupied: 0,
                            sharePolicy: "none", status: "available"
                        },
                        {
                            roomId: "9", roomName: "Lower Deck Quad 9", cabinType: "Lower Deck Quad", capacity: 4, occupied: 0,
                            sharePolicy: "none", status: "available"
                        },
                    ];
                }

                return [];
            }



            const nextInventory =
                Array.isArray(selectedTrip.inventory) && selectedTrip.inventory.length > 0
                    ? selectedTrip.inventory
                    : getInventoryPresetByVesselId(selectedTrip.vesselId);

            const nextPricing = syncPricingCabinsWithInventory(nextInventory, {
                ...fallbackPricing,
                ...(selectedTrip.pricing || {}),
            });

            setFormData({
                ...selectedTrip,
                pricing: nextPricing,
                inventory: nextInventory,
            });
        }
    }, [selectedTrip]);

    // ✅ 공통 필드 변경 핸들러 (기본 정보, 일정, 상태, 메모 등에서 사용)
    const handleFieldChange = (field) => (e) => {
        const value = e.target.value;
        setFormData((prev) => ({
            ...(prev || {}),
            [field]: value,
        }));
    };

    // (옵션) trip-level pricing 필드용 헬퍼 – 지금은 직접 setFormData를 써도 무방
    const handlePricingFieldChange = (field) => (e) => {
        const value = e.target.value;
        setFormData((prev) => {
            const prevPricing = prev?.pricing || {};
            return {
                ...(prev || {}),
                pricing: {
                    ...prevPricing,
                    [field]: value,
                },
            };
        });
    };

    // 특정 객실(row)의 특정 필드 변경
    const handleCabinFieldChange = (index, field) => (e) => {
        const raw = e.target.value;

        setFormData((prev) => {
            const prevPricing = prev?.pricing || {};
            const prevCabins = Array.isArray(prevPricing.cabins)
                ? prevPricing.cabins
                : [];

            const nextCabins = prevCabins.map((cabin, i) => {
                if (i !== index) return cabin;

                if (field === "publicPrice" || field === "instructorGroupPrice") {
                    return {
                        ...cabin,
                        [field]:
                            raw === "" || raw === null
                                ? null
                                : Number(raw),
                    };
                }

                return {
                    ...cabin,
                    [field]: raw,
                };
            });

            return {
                ...(prev || {}),
                pricing: {
                    ...prevPricing,
                    cabins: nextCabins,
                },
            };
        });
    };

    // 객실 row 추가
    const handleAddCabinRow = () => {
        setFormData((prev) => {
            const prevPricing = prev?.pricing || {};
            const prevCabins = Array.isArray(prevPricing.cabins)
                ? prevPricing.cabins
                : [];

            const newCabin = {
                cabinCode: "",
                cabinName: "",
                publicPrice: null,
                instructorGroupPrice: null,
            };

            return {
                ...(prev || {}),
                pricing: {
                    ...prevPricing,
                    cabins: [...prevCabins, newCabin],
                },
            };
        });
    };

    // 객실 row 삭제
    const handleRemoveCabinRow = (index) => () => {
        setFormData((prev) => {
            const prevPricing = prev?.pricing || {};
            const prevCabins = Array.isArray(prevPricing.cabins)
                ? prevPricing.cabins
                : [];

            const nextCabins = prevCabins.filter((_, i) => i !== index);

            return {
                ...(prev || {}),
                pricing: {
                    ...prevPricing,
                    cabins: nextCabins,
                },
            };
        });
    };

    const handleInventoryFieldChange = (index, field) => (e) => {
        const value = e.target.value;

        setFormData((prev) => {
            const prevInventory = Array.isArray(prev?.inventory) ? prev.inventory : [];

            const nextInventory = prevInventory.map((room, i) => {
                if (i !== index) return room;

                return {
                    ...room,
                    [field]:
                        field === "capacity" || field === "occupied"
                            ? value === ""
                                ? 0
                                : Number(value)
                            : value,
                };
            });

            return {
                ...(prev || {}),
                inventory: nextInventory,
                pricing: syncPricingCabinsWithInventory(nextInventory, prev?.pricing || {}),
            };
        });
    };

    const handleAddInventoryRow = () => {
        setFormData((prev) => {
            const prevInventory = Array.isArray(prev?.inventory) ? prev.inventory : [];

            const nextInventory = [
                ...prevInventory,
                {
                    roomId: "",
                    roomName: "",
                    cabinType: "",
                    capacity: 2,
                    occupied: 0,
                    sharePolicy: "none",
                    status: "available",
                },
            ];

            return {
                ...(prev || {}),
                inventory: nextInventory,
                pricing: syncPricingCabinsWithInventory(nextInventory, prev?.pricing || {}),
            };
        });
    };

    const handleRemoveInventoryRow = (index) => () => {
        setFormData((prev) => {
            const prevInventory = Array.isArray(prev?.inventory) ? prev.inventory : [];

            const nextInventory = prevInventory.filter((_, i) => i !== index);

            return {
                ...(prev || {}),
                inventory: nextInventory,
                pricing: syncPricingCabinsWithInventory(nextInventory, prev?.pricing || {}),
            };
        });
    };

    // ─────────────────────────────
    // 배 이름 → vesselId 자동 생성을 위한 slug
    // ─────────────────────────────
    const slugifySimple = (text) => {
        return String(text || "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, " ")
            .trim()
            .replace(/\s+/g, "");
    };

    // 배 이름으로부터 자동 vesselId 생성
    const makeAutoVesselId = (boatName) => {
        if (!boatName) return "";
        const slug = slugifySimple(boatName);
        return `vessel_scuba_${slug}`;
    };

    // specialTripId 자동 생성 (규칙: special_{boatSlug}_{year}_{destSlug}_{MMDD})
    const makeAutoSpecialTripId = (trip) => {
        if (!trip) return "";

        const boatSlug = slugifySimple(trip.boatName || "");
        const destSlug = slugifySimple(trip.destination || "");

        if (!boatSlug || !destSlug || !trip.startDate) return "";

        let year = "";
        let mm = "";
        let dd = "";

        try {
            const d = new Date(trip.startDate);
            if (!Number.isNaN(d.getTime())) {
                year = String(d.getFullYear());
                mm = String(d.getMonth() + 1).padStart(2, "0");
                dd = String(d.getDate()).padStart(2, "0");
            }
        } catch {
            // ignore
        }

        if (!year || !mm || !dd) return "";

        return `special_${boatSlug}_${year}_${destSlug}_${mm}${dd}`;
    };

    // 배 이름 변경 시: boatName + (필요하면) vesselId 자동 세팅
    const handleBoatNameChange = (e) => {
        const boatName = e.target.value;
        setFormData((prev) => {
            if (!prev) return prev;
            const autoId = makeAutoVesselId(boatName);
            const nextVesselId = prev.vesselId ? prev.vesselId : autoId;

            return {
                ...prev,
                boatName,
                vesselId: nextVesselId,
            };
        });
    };

    // ID 자동 생성 버튼
    const handleAutoSpecialTripId = () => {
        setFormData((prev) => {
            if (!prev) return prev;
            const autoId = makeAutoSpecialTripId(prev);
            if (!autoId) {
                alert("배 이름 / 목적지 / 승선일을 먼저 입력해야 ID를 생성할 수 있습니다.");
                return prev;
            }
            return {
                ...prev,
                specialTripId: autoId,
            };
        });
    };

    // salesMode 토글
    const toggleSalesMode = (modeKey) => {
        setFormData((prev) => {
            const current = Array.isArray(prev?.salesMode) ? prev.salesMode : [];
            if (current.includes(modeKey)) {
                return {
                    ...prev,
                    salesMode: current.filter((m) => m !== modeKey),
                };
            } else {
                return {
                    ...prev,
                    salesMode: [...current, modeKey],
                };
            }
        });
    };

    // 저장
    const handleSave = async () => {
        if (!formData) return;

        try {
            setSaving(true);

            const payload = {
                ...formData,
                totalSpaces: computedTotalSpaces,
                availableSpaces: computedAvailableSpaces,
                optionSpaces: computedHoldingSpaces,
                bookedSpaces: computedBookedSpaces,
            };

            const res = await fetch(`${API_BASE}/api/admin/special-trips`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }

            alert("✅ 저장 완료");

            setTrips((prev) => {
                const id = payload.specialTripId || payload.id;
                const copied = [...prev];
                const idx = copied.findIndex(
                    (t) => (t.specialTripId || t.id) === id
                );
                if (idx >= 0) {
                    copied[idx] = payload;
                }
                return copied;
            });

            setSelectedTrip(payload);
            setFormData(payload);

        } catch (err) {
            console.error("❌ 저장 중 오류:", err);
            alert("저장 중 오류가 발생했습니다.");
        } finally {
            setSaving(false);
        }
    };

    const inventoryList = Array.isArray(formData?.inventory) ? formData.inventory : [];

    const computedTotalSpaces = inventoryList.reduce(
        (sum, room) => sum + Number(room.capacity || 0),
        0
    );

    // ✅ 확정 좌석 = status와 상관없이 occupied 합계
    const computedBookedSpaces = inventoryList.reduce(
        (sum, room) => sum + Number(room.occupied || 0),
        0
    );

    // ✅ 홀딩 좌석 = holding 상태 객실의 남은 자리만
    const computedHoldingSpaces = inventoryList.reduce((sum, room) => {
        if (room.status !== "holding") return sum;

        const capacity = Number(room.capacity || 0);
        const occupied = Number(room.occupied || 0);
        return sum + Math.max(capacity - occupied, 0);
    }, 0);

    // ✅ 예약 가능 좌석 = available 상태 객실의 남은 자리만
    const computedAvailableSpaces = inventoryList.reduce((sum, room) => {
        if (room.status !== "available") return sum;

        const capacity = Number(room.capacity || 0);
        const occupied = Number(room.occupied || 0);
        return sum + Math.max(capacity - occupied, 0);
    }, 0);

    return (
        <div style={{ padding: "20px" }}>
            <h2>스페셜 트립 관리 (읽기 전용 1단계 + 간단 편집)</h2>
            <p style={{ color: "#666", marginBottom: 16 }}>
                /var/scubanet-data/special-trips.json 내용을 API(3002)에서 불러와서 표시합니다.
                선택된 트립의 모든 핵심 필드를 여기에서 입력/수정할 수 있습니다.
            </p>

//수정했는데..

            {loading && <div>불러오는 중...</div>}
            {error && (
                <div style={{ color: "red", marginBottom: 12 }}>
                    {error}
                </div>
            )}

            {!loading && !error && trips.length === 0 && (
                <div>등록된 스페셜 트립이 없습니다.</div>
            )}

            <div style={{ marginBottom: 12 }}>
                <button
                    type="button"
                    onClick={handleCreateNew}
                    style={{
                        padding: "8px 14px",
                        backgroundColor: "#2e7d32",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontWeight: 600,
                    }}
                >
                    + 새 스페셜 트립 만들기
                </button>
            </div>

            {selectedTrip && formData && (
                <div
                    style={{
                        marginTop: 8,
                        marginBottom: 20,
                        padding: 16,
                        borderRadius: 8,
                        border: "1px solid #ddd",
                        backgroundColor: "#fafafa",
                    }}
                >
                    <h3 style={{ marginTop: 0, marginBottom: 8 }}>
                        선택된 스페셜 트립 상세
                    </h3>

                    <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                        {/* 왼쪽: 요약 정보 */}
                        <div style={{ flex: 1, minWidth: 260 }}>
                            <div>
                                <strong>ID: </strong>
                                <code>{formData.specialTripId || formData.id}</code>
                            </div>
                            <div>
                                <strong>타이틀: </strong>
                                {formData.title}
                            </div>
                            <div>
                                <strong>지역/목적지: </strong>
                                {formData.region} / {formData.destination}
                            </div>
                            <div>
                                <strong>출발~종료: </strong>
                                {formatDate(formData.startDate)} ~{" "}
                                {formatDate(formData.endDate)} ({formData.nights}박)
                            </div>
                            <div>
                                <strong>정원/가용/옵션/예약: </strong>
                                {formData.totalSpaces} / {formData.availableSpaces} /{" "}
                                {formData.optionSpaces} / {formData.bookedSpaces}
                            </div>
                            <div>
                                <strong>판매 모드: </strong>
                                {Array.isArray(formData.salesMode)
                                    ? formData.salesMode.join(", ")
                                    : ""}
                            </div>
                            <div>
                                <strong>내부 메모: </strong>
                                {formData.internalNote}
                            </div>
                        </div>

                        {/* 오른쪽: 풀 입력 폼 */}
                        <div style={{ flex: 1, minWidth: 320 }}>
                            <h4>편집 영역</h4>

                            {/* 기본 정보 */}
                            <fieldset style={fsStyle}>
                                <legend>기본 정보</legend>

                                <div style={rowStyle}>
                                    <label>ID (specialTripId)</label>
                                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                        <input
                                            style={{ ...inputStyle, flex: 1 }}
                                            value={formData.specialTripId || ""}
                                            onChange={(e) =>
                                                setFormData((prev) => ({
                                                    ...(prev || {}),
                                                    specialTripId: e.target.value,
                                                }))
                                            }
                                            placeholder="special_mola01_2026_komodo_0910"
                                        />
                                        <button
                                            type="button"
                                            style={{
                                                padding: "4px 8px",
                                                borderRadius: 4,
                                                border: "1px solid #ccc",
                                                background: "#f5f5f5",
                                                fontSize: "0.8rem",
                                                cursor: "pointer",
                                            }}
                                            onClick={handleAutoSpecialTripId}
                                        >
                                            자동
                                        </button>
                                    </div>
                                    <div style={{ fontSize: "0.8rem", color: "#666", marginTop: 2 }}>
                                        추천:{" "}
                                        <code>
                                            {makeAutoSpecialTripId(formData) ||
                                                "배 이름 / 목적지 / 승선일 입력 후 [자동]을 누르세요"}
                                        </code>
                                    </div>
                                </div>

                                <div style={rowStyle}>
                                    <label>배 이름 (표시용)</label>
                                    <input
                                        style={inputStyle}
                                        value={formData.boatName || ""}
                                        onChange={handleBoatNameChange}
                                        placeholder="예: Molamola01"
                                    />
                                    {formData.boatName && (
                                        <div
                                            style={{
                                                fontSize: "0.8rem",
                                                color: "#666",
                                                marginTop: 2,
                                            }}
                                        >
                                            자동 추천 vesselId:{" "}
                                            <code>{makeAutoVesselId(formData.boatName)}</code>
                                        </div>
                                    )}
                                </div>

                                <div style={rowStyle}>
                                    <label>vesselId (저장용)</label>
                                    <input
                                        style={inputStyle}
                                        value={formData.vesselId || ""}
                                        onChange={(e) => {
                                            const vesselId = e.target.value;
                                            setFormData((prev) => ({
                                                ...(prev || {}),
                                                vesselId,
                                                inventory:
                                                    Array.isArray(prev?.inventory) && prev.inventory.length > 0
                                                        ? prev.inventory
                                                        : getInventoryPresetByVesselId(vesselId),
                                            }));
                                        }}
                                        placeholder="vessel_scuba_molamola01"
                                    />
                                </div>

                                <div style={rowStyle}>
                                    <label>상품명 (title)</label>
                                    <input
                                        style={inputStyle}
                                        value={formData.title || ""}
                                        onChange={handleFieldChange("title")}
                                    />
                                </div>
                            </fieldset>

                            {/* 일정 / 목적지 */}
                            <fieldset style={fsStyle}>
                                <legend>일정 / 목적지</legend>

                                <div style={rowStyle}>
                                    <label>지역 (region)</label>
                                    <input
                                        style={inputStyle}
                                        value={formData.region || ""}
                                        onChange={handleFieldChange("region")}
                                        placeholder="Indonesia"
                                    />
                                </div>

                                <div style={rowStyle}>
                                    <label>목적지 (destination)</label>
                                    <input
                                        style={inputStyle}
                                        value={formData.destination || ""}
                                        onChange={handleFieldChange("destination")}
                                        placeholder="Komodo / Raja Ampat ..."
                                    />
                                </div>

                                <div style={rowStyle}>
                                    <label>일정 요약 (routeSummary)</label>
                                    <textarea
                                        style={textareaStyle}
                                        rows={2}
                                        value={formData.routeSummary || ""}
                                        onChange={handleFieldChange("routeSummary")}
                                        placeholder="Labuan Bajo 왕복 / Central + North Komodo"
                                    />
                                </div>

                                <div style={rowStyle}>
                                    <label>승선일 (startDate)</label>
                                    <input
                                        type="date"
                                        style={inputStyle}
                                        value={formatDate(formData.startDate)}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...(prev || {}),
                                                startDate: e.target.value,
                                            }))
                                        }
                                    />
                                </div>

                                <div style={rowStyle}>
                                    <label>하선일 (endDate)</label>
                                    <input
                                        type="date"
                                        style={inputStyle}
                                        value={formatDate(formData.endDate)}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...(prev || {}),
                                                endDate: e.target.value,
                                            }))
                                        }
                                    />
                                </div>

                                <div style={rowStyle}>
                                    <label>출발 항구 (embarkPort)</label>
                                    <input
                                        style={inputStyle}
                                        value={formData.embarkPort || ""}
                                        onChange={handleFieldChange("embarkPort")}
                                    />
                                </div>

                                <div style={rowStyle}>
                                    <label>귀환 항구 (disembarkPort)</label>
                                    <input
                                        style={inputStyle}
                                        value={formData.disembarkPort || ""}
                                        onChange={handleFieldChange("disembarkPort")}
                                    />
                                </div>
                            </fieldset>

                            {/* 좌석 정보 */}
                            <fieldset style={fsStyle}>
                                <legend>좌석 정보</legend>

                                <p style={{ fontSize: "0.8rem", color: "#666", marginTop: 0 }}>
                                    아래 값은 객실 인벤토리 기준으로 자동 계산됩니다.
                                </p>

                                <div style={rowStyle}>
                                    <label>총 정원 (totalSpaces)</label>
                                    <div style={readonlyBoxStyle}>{computedTotalSpaces}</div>
                                </div>

                                <div style={rowStyle}>
                                    <label>예약 가능 (availableSpaces)</label>
                                    <div style={readonlyBoxStyle}>{computedAvailableSpaces}</div>
                                </div>

                                <div style={rowStyle}>
                                    <label>홀딩 (optionSpaces)</label>
                                    <div style={readonlyBoxStyle}>{computedHoldingSpaces}</div>
                                </div>

                                <div style={rowStyle}>
                                    <label>확정 (bookedSpaces)</label>
                                    <div style={readonlyBoxStyle}>{computedBookedSpaces}</div>
                                </div>
                            </fieldset>

                            {/* 가격 정책 */}
                            <fieldset style={fsStyle}>
                                <legend>가격 정책</legend>

                                <div style={rowStyle}>
                                    <label>통화</label>
                                    <select
                                        style={inputStyle}
                                        value={formData.pricing?.currency || "USD"}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...(prev || {}),
                                                pricing: {
                                                    ...(prev?.pricing || {}),
                                                    currency: e.target.value,
                                                },
                                            }))
                                        }
                                    >
                                        <option value="USD">USD</option>
                                        <option value="EUR">EUR</option>
                                        <option value="IDR">IDR</option>
                                        <option value="KRW">KRW</option>
                                    </select>
                                </div>

                                <div style={rowStyle}>
                                    <label>기준가 (Base Price)</label>
                                    <input
                                        type="number"
                                        style={inputStyle}
                                        value={formData.pricing?.basePrice ?? ""}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...(prev || {}),
                                                pricing: {
                                                    ...(prev?.pricing || {}),
                                                    basePrice:
                                                        e.target.value === ""
                                                            ? null
                                                            : Number(e.target.value),
                                                },
                                            }))
                                        }
                                    />
                                </div>

                                <div style={rowStyle}>
                                    <label>일반 할인율 (%)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="50"
                                        style={inputStyle}
                                        value={formData.pricing?.publicDiscountPercent ?? 0}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...(prev || {}),
                                                pricing: {
                                                    ...(prev?.pricing || {}),
                                                    publicDiscountPercent:
                                                        e.target.value === ""
                                                            ? 0
                                                            : Number(e.target.value),
                                                },
                                            }))
                                        }
                                    />
                                </div>

                                <div style={rowStyle}>
                                    <label>강사 소그룹 특가</label>
                                    <input
                                        type="number"
                                        style={inputStyle}
                                        value={formData.pricing?.instructorGroupPrice ?? ""}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...(prev || {}),
                                                pricing: {
                                                    ...(prev?.pricing || {}),
                                                    instructorGroupPrice:
                                                        e.target.value === ""
                                                            ? null
                                                            : Number(e.target.value),
                                                },
                                            }))
                                        }
                                    />
                                </div>

                                <div style={rowStyle}>
                                    <label>강사 FOC</label>
                                    <input
                                        style={inputStyle}
                                        value={formData.pricing?.instructorFOCPolicy || ""}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...(prev || {}),
                                                pricing: {
                                                    ...(prev?.pricing || {}),
                                                    instructorFOCPolicy: e.target.value,
                                                },
                                            }))
                                        }
                                        placeholder="예: 3+1"
                                    />
                                </div>

                                <div style={rowStyle}>
                                    <label>풀차터 가격</label>
                                    <input
                                        type="number"
                                        style={inputStyle}
                                        value={formData.pricing?.fullCharterPrice ?? ""}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...(prev || {}),
                                                pricing: {
                                                    ...(prev?.pricing || {}),
                                                    fullCharterPrice:
                                                        e.target.value === ""
                                                            ? null
                                                            : Number(e.target.value),
                                                },
                                            }))
                                        }
                                    />
                                </div>

                                {/* 객실 타입별 가격 */}
                                <div
                                    style={{
                                        marginTop: 12,
                                        paddingTop: 8,
                                        borderTop: "1px solid #ddd",
                                    }}
                                >
                                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                                        객실 타입별 가격
                                    </div>
                                    <p
                                        style={{
                                            fontSize: "0.8rem",
                                            color: "#666",
                                            marginTop: 0,
                                        }}
                                    >
                                        예: lower_twin / Lower Deck Twin, upper_double / Upper Deck Double 등
                                    </p>

                                    <table
                                        style={{
                                            width: "100%",
                                            borderCollapse: "collapse",
                                            fontSize: "0.8rem",
                                            marginBottom: 8,
                                        }}
                                    >
                                        <thead>
                                            <tr>
                                                <th style={thStyle}>코드</th>
                                                <th style={thStyle}>객실명</th>
                                                <th style={thStyle}>공개가 (1인)</th>
                                                <th style={thStyle}>강사 소그룹가 (1인)</th>
                                                <th style={thStyle}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(formData.pricing?.cabins || []).map((cabin, idx) => (
                                                <tr key={idx}>
                                                    <td style={tdStyle}>
                                                        <input
                                                            style={{ ...inputStyle, backgroundColor: "#f7f7f7" }}
                                                            value={cabin.cabinCode || ""}
                                                            readOnly
                                                        />
                                                    </td>
                                                    <td style={tdStyle}>
                                                        <input
                                                            style={{ ...inputStyle, backgroundColor: "#f7f7f7" }}
                                                            value={cabin.cabinName || ""}
                                                            readOnly
                                                        />
                                                    </td>
                                                    <td style={tdStyle}>
                                                        <input
                                                            type="number"
                                                            style={inputStyle}
                                                            value={cabin.publicPrice ?? ""}
                                                            onChange={handleCabinFieldChange(
                                                                idx,
                                                                "publicPrice",
                                                            )}
                                                        />
                                                    </td>
                                                    <td style={tdStyle}>
                                                        <input
                                                            type="number"
                                                            style={inputStyle}
                                                            value={cabin.instructorGroupPrice ?? ""}
                                                            onChange={handleCabinFieldChange(
                                                                idx,
                                                                "instructorGroupPrice",
                                                            )}
                                                        />
                                                    </td>
                                                    <td style={tdStyle}>
                                                        <button
                                                            type="button"
                                                            onClick={handleRemoveCabinRow(idx)}
                                                            style={{
                                                                padding: "4px 8px",
                                                                fontSize: "0.75rem",
                                                                backgroundColor: "#e57373",
                                                                color: "#fff",
                                                                border: "none",
                                                                borderRadius: 4,
                                                                cursor: "pointer",
                                                            }}
                                                        >
                                                            삭제
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </fieldset>

                            {/* 객실 인벤토리 */}
                            <fieldset style={fsStyle}>
                                <legend>객실 인벤토리</legend>

                                <p style={{ fontSize: "0.8rem", color: "#666", marginTop: 0 }}>
                                    실제 객실 번호별 상태를 관리합니다. 예약 화면에서는 이 정보를 기준으로
                                    어떤 객실이 예약 가능 / 홀딩 / 확정인지 표시하게 됩니다.
                                </p>

                                <table
                                    style={{
                                        width: "100%",
                                        borderCollapse: "collapse",
                                        fontSize: "0.85rem",
                                        marginBottom: 8,
                                    }}
                                >
                                    <thead>
                                        <tr>
                                            <th style={thStyle}>객실번호</th>
                                            <th style={thStyle}>객실명</th>
                                            <th style={thStyle}>객실타입</th>
                                            <th style={thStyle}>정원</th>
                                            <th style={thStyle}>점유</th>
                                            <th style={thStyle}>쉐어정책</th>
                                            <th style={thStyle}>상태</th>
                                            <th style={thStyle}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(formData.inventory || []).map((room, idx) => (
                                            <tr key={idx}>
                                                <td style={tdStyle}>
                                                    <input
                                                        style={inputStyle}
                                                        value={room.roomId || ""}
                                                        onChange={handleInventoryFieldChange(idx, "roomId")}
                                                        placeholder="1"
                                                    />
                                                </td>

                                                <td style={tdStyle}>
                                                    <input
                                                        style={inputStyle}
                                                        value={room.roomName || ""}
                                                        onChange={handleInventoryFieldChange(idx, "roomName")}
                                                        placeholder="Upper Deck Twin 1"
                                                    />
                                                </td>

                                                <td style={tdStyle}>
                                                    <input
                                                        style={inputStyle}
                                                        value={room.cabinType || ""}
                                                        onChange={handleInventoryFieldChange(idx, "cabinType")}
                                                        placeholder="Upper Deck Twin"
                                                    />
                                                </td>

                                                <td style={tdStyle}>
                                                    <input
                                                        type="number"
                                                        style={inputStyle}
                                                        value={room.capacity ?? 2}
                                                        onChange={handleInventoryFieldChange(idx, "capacity")}
                                                        min="1"
                                                    />
                                                </td>

                                                <td style={tdStyle}>
                                                    <input
                                                        type="number"
                                                        style={inputStyle}
                                                        value={room.occupied ?? 0}
                                                        onChange={handleInventoryFieldChange(idx, "occupied")}
                                                        min="0"
                                                        max={room.capacity ?? 0}
                                                    />
                                                </td>

                                                <td style={tdStyle}>
                                                    <select
                                                        style={inputStyle}
                                                        value={room.sharePolicy || "none"}
                                                        onChange={handleInventoryFieldChange(idx, "sharePolicy")}
                                                    >
                                                        <option value="none">none</option>
                                                        <option value="male">male</option>
                                                        <option value="female">female</option>
                                                        <option value="mixed">mixed</option>
                                                    </select>
                                                </td>

                                                <td style={tdStyle}>
                                                    <select
                                                        style={inputStyle}
                                                        value={room.status || "available"}
                                                        onChange={handleInventoryFieldChange(idx, "status")}
                                                    >
                                                        <option value="available">available</option>
                                                        <option value="holding">holding</option>
                                                        <option value="booked">booked</option>
                                                        <option value="maintenance">maintenance</option>
                                                    </select>
                                                </td>

                                                <td style={tdStyle}>
                                                    <button
                                                        type="button"
                                                        onClick={handleRemoveInventoryRow(idx)}
                                                        style={{
                                                            padding: "4px 8px",
                                                            fontSize: "0.75rem",
                                                            backgroundColor: "#e57373",
                                                            color: "#fff",
                                                            border: "none",
                                                            borderRadius: 4,
                                                            cursor: "pointer",
                                                        }}
                                                    >
                                                        삭제
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                <button
                                    type="button"
                                    onClick={handleAddInventoryRow}
                                    style={{
                                        padding: "4px 8px",
                                        fontSize: "0.8rem",
                                        backgroundColor: "#4caf50",
                                        color: "#fff",
                                        border: "none",
                                        borderRadius: 4,
                                        cursor: "pointer",
                                    }}
                                >
                                    + 객실 추가
                                </button>
                            </fieldset>

                            {/* 판매 모드 / 상태 / 내부 메모 */}
                            <fieldset style={fsStyle}>
                                <legend>판매 옵션 / 상태</legend>

                                <div style={rowStyle}>
                                    <label>판매 모드 (salesMode)</label>
                                    <div style={{ display: "flex", gap: 8 }}>
                                        <label style={{ fontSize: "0.85rem" }}>
                                            <input
                                                type="checkbox"
                                                checked={
                                                    Array.isArray(formData.salesMode) &&
                                                    formData.salesMode.includes("full")
                                                }
                                                onChange={() => toggleSalesMode("full")}
                                            />{" "}
                                            full
                                        </label>
                                        <label style={{ fontSize: "0.85rem" }}>
                                            <input
                                                type="checkbox"
                                                checked={
                                                    Array.isArray(formData.salesMode) &&
                                                    formData.salesMode.includes("group")
                                                }
                                                onChange={() => toggleSalesMode("group")}
                                            />{" "}
                                            group
                                        </label>
                                        <label style={{ fontSize: "0.85rem" }}>
                                            <input
                                                type="checkbox"
                                                checked={
                                                    Array.isArray(formData.salesMode) &&
                                                    formData.salesMode.includes("open")
                                                }
                                                onChange={() => toggleSalesMode("open")}
                                            />{" "}
                                            open
                                        </label>
                                    </div>
                                </div>

                                <div style={rowStyle}>
                                    <label>상태 (status)</label>
                                    <select
                                        style={inputStyle}
                                        value={formData.status || "open"}
                                        onChange={handleFieldChange("status")}
                                    >
                                        <option value="open">open</option>
                                        <option value="closed">closed</option>
                                        <option value="cancelled">cancelled</option>
                                    </select>
                                </div>

                                <div style={rowStyle}>
                                    <label>내부 메모 (internalNote)</label>
                                    <textarea
                                        style={textareaStyle}
                                        rows={2}
                                        value={formData.internalNote || ""}
                                        onChange={handleFieldChange("internalNote")}
                                    />
                                </div>
                            </fieldset>

                            <button
                                style={{
                                    marginTop: 10,
                                    padding: "6px 12px",
                                    backgroundColor: saving ? "#90caf9" : "#1976d2",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: 4,
                                    cursor: saving ? "default" : "pointer",
                                }}
                                onClick={saving ? undefined : handleSave}
                            >
                                {saving ? "저장 중..." : "저장"}
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* 리스트 테이블 */}
            {!loading && !error && trips.length > 0 && (
                <table
                    style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        marginTop: 12,
                        fontSize: "0.9rem",
                    }}
                >
                    <thead>
                        <tr>
                            <th style={thStyle}>ID</th>
                            <th style={thStyle}>타이틀</th>
                            <th style={thStyle}>지역 / 목적지</th>
                            <th style={thStyle}>출발일 ~ 종료일</th>
                            <th style={thStyle}>정원 / 가용 / 옵션 / 예약</th>
                            <th style={thStyle}>판매 모드</th>
                            <th style={thStyle}>FOC 정책</th>
                            <th style={thStyle}>상태</th>
                        </tr>
                    </thead>
                    <tbody>
                        {trips.map((t) => {
                            const id = t.specialTripId || t.id;
                            const isSelected =
                                selectedTrip &&
                                (selectedTrip.specialTripId || selectedTrip.id) === id;

                            return (
                                <tr
                                    key={id}
                                    onClick={() => setSelectedTrip(t)}
                                    style={{
                                        backgroundColor: isSelected ? "#ffecb3" : "transparent",
                                        cursor: "pointer",
                                    }}
                                >
                                    <td style={tdStyle}>
                                        <code>{id}</code>
                                    </td>
                                    <td style={tdStyle}>
                                        <div style={{ fontWeight: 600 }}>{t.title}</div>
                                        <div style={{ fontSize: "0.8rem", color: "#666" }}>
                                            vesselId: {t.vesselId}
                                        </div>
                                    </td>
                                    <td style={tdStyle}>
                                        {t.region} / {t.destination}
                                        <div style={{ fontSize: "0.8rem", color: "#666" }}>
                                            {t.routeSummary}
                                        </div>
                                    </td>
                                    <td style={tdStyle}>
                                        {formatDate(t.startDate)} ~ {formatDate(t.endDate)} (
                                        {t.nights}박)
                                    </td>
                                    <td style={tdStyle}>
                                        {t.totalSpaces} / {t.availableSpaces} / {t.optionSpaces} /{" "}
                                        {t.bookedSpaces}
                                    </td>
                                    <td style={tdStyle}>
                                        {Array.isArray(t.salesMode)
                                            ? t.salesMode.join(", ")
                                            : ""}
                                    </td>
                                    <td style={tdStyle}>{t.focPolicy}</td>
                                    <td style={tdStyle}>
                                        {t.status}
                                        {t.isScubanetSpecial && (
                                            <div
                                                style={{
                                                    marginTop: 4,
                                                    display: "inline-block",
                                                    padding: "2px 6px",
                                                    borderRadius: 6,
                                                    backgroundColor: "#ff9800",
                                                    color: "#fff",
                                                    fontSize: "0.75rem",
                                                }}
                                            >
                                                ScubaNet Special
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
        </div>
    );
}

const thStyle = {
    borderBottom: "1px solid " +
        "#ddd",
    padding: "6px 8px",
    backgroundColor: "#f5f5f5",
    textAlign: "left",
};

const tdStyle = {
    borderBottom: "1px solid #eee",
    padding: "6px 8px",
    verticalAlign: "top",
};

const inputStyle = {
    width: "100%",
    padding: "6px",
    marginTop: "4px",
    borderRadius: "4px",
    border: "1px solid #ccc",
};

const fsStyle = {
    marginBottom: 12,
    border: "1px solid #ddd",
    borderRadius: 6,
    padding: 8,
};

const rowStyle = {
    display: "flex",
    flexDirection: "column",
    marginBottom: 6,
};

const textareaStyle = {
    ...inputStyle,
    resize: "vertical",
};

const readonlyBoxStyle = {
    width: "100%",
    padding: "8px 10px",
    marginTop: "4px",
    borderRadius: "4px",
    border: "1px solid #ccc",
    backgroundColor: "#f7f7f7",
    color: "#333",
    minHeight: "36px",
    display: "flex",
    alignItems: "center",
    boxSizing: "border-box",
};