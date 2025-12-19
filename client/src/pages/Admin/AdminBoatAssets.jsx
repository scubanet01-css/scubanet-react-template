import React, { useEffect, useMemo, useState } from "react";

/**
 * AdminBoatAssets (Full Schema)
 * - UTS 기반 vesselId 선택
 * - Hero / DeckPlans / Cabins / Facilities / Tenders / Food 메타데이터 입력
 * - 서버 저장: POST /admin/api/boats-assets
 *
 * ⚠️ 현재 단계는 "메타데이터 저장" 단계입니다.
 *    이미지 파일 자체 업로드는 다음 단계에서 multer로 처리합니다.
 */

const CABIN_TYPE_OPTIONS = [
    "STANDARD",
    "DELUXE",
    "SUITE",
    "UPPER_DECK",
    "LOWER_DECK",
    "CUSTOM",
];

const DECK_CODE_OPTIONS = [
    "LOWER_DECK",
    "MAIN_DECK",
    "UPPER_DECK",
    "SUN_DECK",
    "BRIDGE_DECK",
    "OTHER",
];

const FACILITY_TYPE_OPTIONS = [
    "LOUNGE",
    "RESTAURANT",
    "SUN_DECK",
    "DIVE_DECK",
    "CAMERA_ROOM",
    "BAR",
    "OTHER",
];

const FOOD_TYPE_OPTIONS = [
    "MEAL",
    "SNACK",
    "DRINK",
    "COCKTAIL",
    "OTHER",
];

// 파일명 기반 URL 규칙 (메타데이터용)
function buildUrl({ vesselId, bucket, sub, filename }) {
    // bucket: hero | deck-plans | cabins | facilities | tenders | food
    // sub: 예) cabins는 cabinTypeCode, facilities는 facilityType 등
    if (!filename) return "";
    const base = `/assets/vessels/${vesselId}/${bucket}`;
    return sub ? `${base}/${sub}/${filename}` : `${base}/${filename}`;
}

function toTagArray(tagsText) {
    if (!tagsText) return [];
    return tagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
}

function AdminBoatAssets() {
    const [utsTrips, setUtsTrips] = useState([]);
    const [loading, setLoading] = useState(true);

    const [vesselId, setVesselId] = useState("");
    const [boatName, setBoatName] = useState("");

    // Hero
    const [heroImage, setHeroImage] = useState(null); // {id,file,preview,title,description,isPrimary,order}

    // Deck Plans: 덱별 1장, 덱은 여러 개 가능
    const [deckPlans, setDeckPlans] = useState([]); // [{deckCode,deckName,description,image:{...}}]

    // Cabins
    const [cabins, setCabins] = useState([]); // [{cabinTypeCode,cabinName,description,deckCode,images:[{...}]}]

    // Facilities
    const [facilities, setFacilities] = useState([]); // [{facilityType,name,description,images:[...]}]

    // Tenders
    const [tenders, setTenders] = useState([]); // [{name,capacity,description,images:[...]}]

    // Food
    const [food, setFood] = useState([]); // [{foodType,name,description,images:[...]}]

    const [saveStatus, setSaveStatus] = useState("");

    /* =========================
       Load UTS Trips
    ========================= */
    useEffect(() => {
        fetch("/data/uts-trips.json")
            .then((res) => res.json())
            .then((data) => {
                setUtsTrips(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch((err) => {
                console.error("uts-trips.json 로드 실패", err);
                setLoading(false);
            });
    }, []);

    /* =========================
       Vessel Options
    ========================= */
    const vesselOptions = useMemo(() => {
        const map = new Map();
        utsTrips.forEach((t) => {
            if (t.vesselId && !map.has(t.vesselId)) {
                map.set(t.vesselId, {
                    vesselId: t.vesselId,
                    boatName: t.boatName || t.vesselId,
                });
            }
        });
        return Array.from(map.values());
    }, [utsTrips]);

    function resetAllStatesForNewVessel(nextVesselId, nextBoatName) {
        setVesselId(nextVesselId);
        setBoatName(nextBoatName);

        setHeroImage(null);
        setDeckPlans([]);
        setCabins([]);
        setFacilities([]);
        setTenders([]);
        setFood([]);
        setSaveStatus("");
    }

    function handleVesselSelect(e) {
        const selected = vesselOptions.find((v) => v.vesselId === e.target.value);
        if (!selected) return;
        resetAllStatesForNewVessel(selected.vesselId, selected.boatName);
    }

    /* =========================
       Hero
    ========================= */
    function handleHeroUpload(e) {
        const file = e.target.files?.[0];
        if (!file || !vesselId) return;

        setHeroImage({
            id: `${vesselId}_hero_01`,
            file,
            preview: URL.createObjectURL(file),
            title: boatName || "",
            description: "",
            order: 1,
            isPrimary: true,
        });
    }

    function updateHero(field, value) {
        if (!heroImage) return;
        setHeroImage({ ...heroImage, [field]: value });
    }

    /* =========================
       Deck Plans
    ========================= */
    function addDeckPlan() {
        if (!vesselId) return;
        setDeckPlans([
            ...deckPlans,
            {
                deckCode: "MAIN_DECK",
                deckName: "Main Deck",
                description: "",
                order: deckPlans.length + 1,
                image: null, // {id,file,preview,title,order}
            },
        ]);
    }

    function removeDeckPlan(index) {
        const updated = [...deckPlans];
        updated.splice(index, 1);
        // order 재정렬
        const normalized = updated.map((d, i) => ({ ...d, order: i + 1 }));
        setDeckPlans(normalized);
    }

    function updateDeckPlan(index, field, value) {
        const updated = [...deckPlans];
        updated[index][field] = value;
        setDeckPlans(updated);
    }

    function uploadDeckPlanImage(index, file) {
        if (!file || !vesselId) return;
        const updated = [...deckPlans];
        const deck = updated[index];

        updated[index].image = {
            id: `${vesselId}_deck_${deck.deckCode}_${Date.now()}`,
            file,
            preview: URL.createObjectURL(file),
            title: `${deck.deckName} Plan`,
            order: deck.order || index + 1,
        };

        setDeckPlans(updated);
    }

    /* =========================
       Cabins
    ========================= */
    function addCabin() {
        if (!vesselId) return;
        setCabins([
            ...cabins,
            {
                cabinTypeCode: "STANDARD",
                cabinName: "",
                description: "",
                deckCode: deckPlans?.[0]?.deckCode || "MAIN_DECK",
                images: [], // {id,file,preview,title,tagsText,tags[],order}
            },
        ]);
    }

    function removeCabin(index) {
        const updated = [...cabins];
        updated.splice(index, 1);
        setCabins(updated);
    }

    function updateCabin(index, field, value) {
        const updated = [...cabins];
        updated[index][field] = value;
        setCabins(updated);
    }

    function addCabinImage(cabinIndex, file) {
        if (!file || !vesselId) return;
        const updated = [...cabins];
        const cabin = updated[cabinIndex];

        cabin.images.push({
            id: `${vesselId}_cabin_${cabin.cabinTypeCode}_${Date.now()}`,
            file,
            preview: URL.createObjectURL(file),
            title: "",
            tagsText: "",
            order: cabin.images.length + 1,
        });

        setCabins(updated);
    }

    function updateCabinImage(cabinIndex, imageIndex, field, value) {
        const updated = [...cabins];
        const img = updated[cabinIndex].images[imageIndex];
        updated[cabinIndex].images[imageIndex] = { ...img, [field]: value };
        setCabins(updated);
    }

    function removeCabinImage(cabinIndex, imageIndex) {
        const updated = [...cabins];
        updated[cabinIndex].images.splice(imageIndex, 1);
        // order 재정렬
        updated[cabinIndex].images = updated[cabinIndex].images.map((img, i) => ({
            ...img,
            order: i + 1,
        }));
        setCabins(updated);
    }

    /* =========================
       Facilities
    ========================= */
    function addFacility() {
        if (!vesselId) return;
        setFacilities([
            ...facilities,
            {
                facilityType: "LOUNGE",
                name: "",
                description: "",
                images: [],
            },
        ]);
    }

    function removeFacility(index) {
        const updated = [...facilities];
        updated.splice(index, 1);
        setFacilities(updated);
    }

    function updateFacility(index, field, value) {
        const updated = [...facilities];
        updated[index][field] = value;
        setFacilities(updated);
    }

    function addFacilityImage(facilityIndex, file) {
        if (!file || !vesselId) return;
        const updated = [...facilities];
        const fac = updated[facilityIndex];

        fac.images.push({
            id: `${vesselId}_facility_${fac.facilityType}_${Date.now()}`,
            file,
            preview: URL.createObjectURL(file),
            title: "",
            order: fac.images.length + 1,
        });

        setFacilities(updated);
    }

    function updateFacilityImage(facilityIndex, imageIndex, field, value) {
        const updated = [...facilities];
        const img = updated[facilityIndex].images[imageIndex];
        updated[facilityIndex].images[imageIndex] = { ...img, [field]: value };
        setFacilities(updated);
    }

    function removeFacilityImage(facilityIndex, imageIndex) {
        const updated = [...facilities];
        updated[facilityIndex].images.splice(imageIndex, 1);
        updated[facilityIndex].images = updated[facilityIndex].images.map((img, i) => ({
            ...img,
            order: i + 1,
        }));
        setFacilities(updated);
    }

    /* =========================
       Tenders
    ========================= */
    function addTender() {
        if (!vesselId) return;
        setTenders([
            ...tenders,
            {
                name: "",
                capacity: "",
                description: "",
                images: [],
            },
        ]);
    }

    function removeTender(index) {
        const updated = [...tenders];
        updated.splice(index, 1);
        setTenders(updated);
    }

    function updateTender(index, field, value) {
        const updated = [...tenders];
        updated[index][field] = value;
        setTenders(updated);
    }

    function addTenderImage(tenderIndex, file) {
        if (!file || !vesselId) return;
        const updated = [...tenders];
        const t = updated[tenderIndex];

        t.images.push({
            id: `${vesselId}_tender_${Date.now()}`,
            file,
            preview: URL.createObjectURL(file),
            title: "",
            order: t.images.length + 1,
        });

        setTenders(updated);
    }

    function updateTenderImage(tenderIndex, imageIndex, field, value) {
        const updated = [...tenders];
        const img = updated[tenderIndex].images[imageIndex];
        updated[tenderIndex].images[imageIndex] = { ...img, [field]: value };
        setTenders(updated);
    }

    function removeTenderImage(tenderIndex, imageIndex) {
        const updated = [...tenders];
        updated[tenderIndex].images.splice(imageIndex, 1);
        updated[tenderIndex].images = updated[tenderIndex].images.map((img, i) => ({
            ...img,
            order: i + 1,
        }));
        setTenders(updated);
    }

    /* =========================
       Food
    ========================= */
    function addFood() {
        if (!vesselId) return;
        setFood([
            ...food,
            {
                foodType: "MEAL",
                name: "",
                description: "",
                images: [],
            },
        ]);
    }

    function removeFood(index) {
        const updated = [...food];
        updated.splice(index, 1);
        setFood(updated);
    }

    function updateFood(index, field, value) {
        const updated = [...food];
        updated[index][field] = value;
        setFood(updated);
    }

    function addFoodImage(foodIndex, file) {
        if (!file || !vesselId) return;
        const updated = [...food];
        const f = updated[foodIndex];

        f.images.push({
            id: `${vesselId}_food_${f.foodType}_${Date.now()}`,
            file,
            preview: URL.createObjectURL(file),
            title: "",
            order: f.images.length + 1,
        });

        setFood(updated);
    }

    function updateFoodImage(foodIndex, imageIndex, field, value) {
        const updated = [...food];
        const img = updated[foodIndex].images[imageIndex];
        updated[foodIndex].images[imageIndex] = { ...img, [field]: value };
        setFood(updated);
    }

    function removeFoodImage(foodIndex, imageIndex) {
        const updated = [...food];
        updated[foodIndex].images.splice(imageIndex, 1);
        updated[foodIndex].images = updated[foodIndex].images.map((img, i) => ({
            ...img,
            order: i + 1,
        }));
        setFood(updated);
    }

    /* =========================
       Payload
    ========================= */
    function buildPayload() {
        if (!vesselId) return null;

        const payload = {
            vesselId,
            boatName,
            lastUpdated: new Date().toISOString().slice(0, 10),
            assets: {},
        };

        // hero
        if (heroImage?.file) {
            payload.assets.hero = {
                id: heroImage.id,
                url: buildUrl({
                    vesselId,
                    bucket: "hero",
                    filename: heroImage.file.name,
                }),
                title: heroImage.title || "",
                description: heroImage.description || "",
                order: heroImage.order || 1,
                isPrimary: !!heroImage.isPrimary,
            };
        } else {
            payload.assets.hero = null;
        }

        // deckPlans (덱별 1장)
        const deckPlansOut = deckPlans
            .filter((d) => d.deckCode)
            .map((d) => {
                const img = d.image;
                return {
                    deckCode: d.deckCode,
                    deckName: d.deckName || d.deckCode,
                    description: d.description || "",
                    order: d.order || 1,
                    image: img?.file
                        ? {
                            id: img.id,
                            url: buildUrl({
                                vesselId,
                                bucket: "deck-plans",
                                sub: d.deckCode,
                                filename: img.file.name,
                            }),
                            title: img.title || `${d.deckName || d.deckCode} Plan`,
                            order: img.order || d.order || 1,
                        }
                        : null,
                };
            })
            .filter((d) => d.image); // 이미지 없는 덱플랜은 저장에서 제외(원하시면 제외 조건 제거 가능)

        if (deckPlansOut.length) payload.assets.deckPlans = deckPlansOut;

        // cabins
        const cabinsOut = cabins
            .filter((c) => c.cabinTypeCode)
            .map((c) => ({
                cabinTypeCode: c.cabinTypeCode,
                cabinName: c.cabinName || "",
                description: c.description || "",
                deckCode: c.deckCode || "OTHER",
                images: (c.images || [])
                    .filter((img) => img.file)
                    .map((img) => ({
                        id: img.id,
                        url: buildUrl({
                            vesselId,
                            bucket: "cabins",
                            sub: c.cabinTypeCode,
                            filename: img.file.name,
                        }),
                        title: img.title || "",
                        tags: toTagArray(img.tagsText),
                        order: img.order || 1,
                    })),
            }))
            .filter((c) => c.images.length > 0 || c.cabinName || c.description);

        if (cabinsOut.length) payload.assets.cabins = cabinsOut;

        // facilities
        const facilitiesOut = facilities
            .filter((f) => f.facilityType)
            .map((f) => ({
                facilityType: f.facilityType,
                name: f.name || "",
                description: f.description || "",
                images: (f.images || [])
                    .filter((img) => img.file)
                    .map((img) => ({
                        id: img.id,
                        url: buildUrl({
                            vesselId,
                            bucket: "facilities",
                            sub: f.facilityType,
                            filename: img.file.name,
                        }),
                        title: img.title || "",
                        order: img.order || 1,
                    })),
            }))
            .filter((f) => f.images.length > 0 || f.name || f.description);

        if (facilitiesOut.length) payload.assets.facilities = facilitiesOut;

        // tenders
        const tendersOut = tenders
            .map((t) => ({
                name: t.name || "",
                capacity: t.capacity === "" ? null : Number(t.capacity),
                description: t.description || "",
                images: (t.images || [])
                    .filter((img) => img.file)
                    .map((img) => ({
                        id: img.id,
                        url: buildUrl({
                            vesselId,
                            bucket: "tenders",
                            filename: img.file.name,
                        }),
                        title: img.title || "",
                        order: img.order || 1,
                    })),
            }))
            .filter((t) => t.images.length > 0 || t.name || t.description);

        if (tendersOut.length) payload.assets.tenders = tendersOut;

        // food
        const foodOut = food
            .filter((f) => f.foodType)
            .map((f) => ({
                foodType: f.foodType,
                name: f.name || "",
                description: f.description || "",
                images: (f.images || [])
                    .filter((img) => img.file)
                    .map((img) => ({
                        id: img.id,
                        url: buildUrl({
                            vesselId,
                            bucket: "food",
                            sub: f.foodType,
                            filename: img.file.name,
                        }),
                        title: img.title || "",
                        order: img.order || 1,
                    })),
            }))
            .filter((f) => f.images.length > 0 || f.name || f.description);

        if (foodOut.length) payload.assets.food = foodOut;

        return payload;
    }

    /* =========================
       Save to Server
    ========================= */
    async function handleSaveToServer() {
        const payload = buildPayload();
        if (!payload) {
            alert("선박을 먼저 선택하세요.");
            return;
        }

        setSaveStatus("저장 중...");

        try {
            const res = await fetch("/admin/api/boats-assets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(`서버 오류 ${res.status}: ${text}`);
            }

            const result = await res.json();

            if (result.success) {
                setSaveStatus(`✅ 저장 완료 (${payload.vesselId})`);
            } else {
                setSaveStatus(`❌ 저장 실패: ${result.message || ""}`);
            }
        } catch (err) {
            console.error("서버 저장 실패:", err);
            setSaveStatus("❌ 서버 오류 (콘솔 확인)");
        }
    }

    const previewJson = useMemo(() => buildPayload(), [
        vesselId,
        boatName,
        heroImage,
        deckPlans,
        cabins,
        facilities,
        tenders,
        food,
    ]);

    if (loading) {
        return <div style={{ padding: 24 }}>UTS 데이터 로딩 중...</div>;
    }

    const deckPlanCodesForCabinSelect = deckPlans.length
        ? deckPlans.map((d) => d.deckCode).filter(Boolean)
        : DECK_CODE_OPTIONS;

    return (
        <div style={{ padding: 24, maxWidth: 1100 }}>
            <h2>Boat Assets Admin (Full Schema)</h2>

            {/* Vessel Select */}
            <section style={{ padding: 12, border: "1px solid #e5e5e5", borderRadius: 10 }}>
                <h3 style={{ marginTop: 0 }}>UTS 선박 선택</h3>
                <select value={vesselId} onChange={handleVesselSelect} style={{ minWidth: 380 }}>
                    <option value="">선박 선택</option>
                    {vesselOptions.map((v) => (
                        <option key={v.vesselId} value={v.vesselId}>
                            {v.boatName} ({v.vesselId})
                        </option>
                    ))}
                </select>

                {vesselId && (
                    <div style={{ marginTop: 8, color: "#666" }}>
                        선택됨: <strong>{boatName}</strong> / <code>{vesselId}</code>
                    </div>
                )}
            </section>

            {!vesselId ? (
                <div style={{ marginTop: 16, color: "#777" }}>
                    선박을 선택하면 입력 섹션이 활성화됩니다.
                </div>
            ) : (
                <>
                    {/* Hero */}
                    <section style={{ marginTop: 18, padding: 12, border: "1px solid #e5e5e5", borderRadius: 10 }}>
                        <h3 style={{ marginTop: 0 }}>Hero (대표 이미지)</h3>

                        <input type="file" accept="image/*" onChange={handleHeroUpload} />
                        {heroImage?.preview && (
                            <div style={{ marginTop: 10, display: "flex", gap: 12, alignItems: "flex-start" }}>
                                <img
                                    src={heroImage.preview}
                                    alt="hero"
                                    style={{ width: 260, borderRadius: 8, border: "1px solid #ddd" }}
                                />
                                <div style={{ flex: 1 }}>
                                    <div style={{ marginBottom: 8 }}>
                                        <label style={{ display: "block", fontSize: 12, color: "#555" }}>Title</label>
                                        <input
                                            value={heroImage.title || ""}
                                            onChange={(e) => updateHero("title", e.target.value)}
                                            style={{ width: "100%" }}
                                        />
                                    </div>
                                    <div style={{ marginBottom: 8 }}>
                                        <label style={{ display: "block", fontSize: 12, color: "#555" }}>Description</label>
                                        <textarea
                                            value={heroImage.description || ""}
                                            onChange={(e) => updateHero("description", e.target.value)}
                                            rows={3}
                                            style={{ width: "100%" }}
                                        />
                                    </div>
                                    <label style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                                        <input
                                            type="checkbox"
                                            checked={!!heroImage.isPrimary}
                                            onChange={(e) => updateHero("isPrimary", e.target.checked)}
                                        />
                                        대표 이미지로 설정
                                    </label>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Deck Plans */}
                    <section style={{ marginTop: 18, padding: 12, border: "1px solid #e5e5e5", borderRadius: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <h3 style={{ marginTop: 0 }}>Deck Plans (덱 플랜)</h3>
                            <button onClick={addDeckPlan}>+ 덱 추가</button>
                        </div>

                        {deckPlans.length === 0 && (
                            <div style={{ color: "#777" }}>
                                보통 Lower/Main/Upper 3개를 추가하는 것을 권장합니다.
                            </div>
                        )}

                        {deckPlans.map((d, idx) => (
                            <div
                                key={`${d.deckCode}_${idx}`}
                                style={{ marginTop: 12, padding: 12, border: "1px solid #ddd", borderRadius: 10 }}
                            >
                                <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
                                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                        <select
                                            value={d.deckCode}
                                            onChange={(e) => updateDeckPlan(idx, "deckCode", e.target.value)}
                                        >
                                            {DECK_CODE_OPTIONS.map((opt) => (
                                                <option key={opt} value={opt}>
                                                    {opt}
                                                </option>
                                            ))}
                                        </select>

                                        <input
                                            placeholder="Deck Name (예: Main Deck)"
                                            value={d.deckName}
                                            onChange={(e) => updateDeckPlan(idx, "deckName", e.target.value)}
                                            style={{ width: 220 }}
                                        />

                                        <input
                                            placeholder="간단 설명"
                                            value={d.description}
                                            onChange={(e) => updateDeckPlan(idx, "description", e.target.value)}
                                            style={{ width: 360 }}
                                        />
                                    </div>

                                    <button onClick={() => removeDeckPlan(idx)} style={{ color: "#b00" }}>
                                        삭제
                                    </button>
                                </div>

                                <div style={{ marginTop: 10, display: "flex", gap: 12, alignItems: "flex-start" }}>
                                    <div>
                                        <div style={{ fontSize: 12, color: "#555", marginBottom: 6 }}>Deck Plan Image (덱당 1장)</div>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => uploadDeckPlanImage(idx, e.target.files?.[0])}
                                        />
                                        {d.image?.preview && (
                                            <img
                                                src={d.image.preview}
                                                alt="deck plan"
                                                style={{ marginTop: 10, width: 260, borderRadius: 8, border: "1px solid #ddd" }}
                                            />
                                        )}
                                    </div>

                                    {d.image && (
                                        <div style={{ flex: 1 }}>
                                            <div style={{ marginBottom: 8 }}>
                                                <label style={{ display: "block", fontSize: 12, color: "#555" }}>Image Title</label>
                                                <input
                                                    value={d.image.title || ""}
                                                    onChange={(e) => {
                                                        const updated = [...deckPlans];
                                                        updated[idx].image = { ...updated[idx].image, title: e.target.value };
                                                        setDeckPlans(updated);
                                                    }}
                                                    style={{ width: "100%" }}
                                                />
                                            </div>
                                            <div style={{ fontSize: 12, color: "#666" }}>
                                                저장 URL 예시:{" "}
                                                <code>
                                                    {buildUrl({
                                                        vesselId,
                                                        bucket: "deck-plans",
                                                        sub: d.deckCode,
                                                        filename: d.image.file?.name,
                                                    })}
                                                </code>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </section>

                    {/* Cabins */}
                    <section style={{ marginTop: 18, padding: 12, border: "1px solid #e5e5e5", borderRadius: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <h3 style={{ marginTop: 0 }}>Cabins (객실)</h3>
                            <button onClick={addCabin}>+ 객실 타입 추가</button>
                        </div>

                        {cabins.length === 0 && <div style={{ color: "#777" }}>객실 타입을 추가하세요.</div>}

                        {cabins.map((c, cIdx) => (
                            <div
                                key={`${c.cabinTypeCode}_${cIdx}`}
                                style={{ marginTop: 12, padding: 12, border: "1px solid #ddd", borderRadius: 10 }}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                        <select
                                            value={c.cabinTypeCode}
                                            onChange={(e) => updateCabin(cIdx, "cabinTypeCode", e.target.value)}
                                        >
                                            {CABIN_TYPE_OPTIONS.map((opt) => (
                                                <option key={opt} value={opt}>
                                                    {opt}
                                                </option>
                                            ))}
                                        </select>

                                        <select
                                            value={c.deckCode || "OTHER"}
                                            onChange={(e) => updateCabin(cIdx, "deckCode", e.target.value)}
                                            title="Deck Code (Deck Plan과 연결)"
                                        >
                                            {deckPlanCodesForCabinSelect.map((opt) => (
                                                <option key={opt} value={opt}>
                                                    {opt}
                                                </option>
                                            ))}
                                        </select>

                                        <input
                                            placeholder="Cabin Name (예: Deluxe Twin)"
                                            value={c.cabinName}
                                            onChange={(e) => updateCabin(cIdx, "cabinName", e.target.value)}
                                            style={{ width: 240 }}
                                        />

                                        <input
                                            placeholder="Cabin Description"
                                            value={c.description}
                                            onChange={(e) => updateCabin(cIdx, "description", e.target.value)}
                                            style={{ width: 360 }}
                                        />
                                    </div>

                                    <button onClick={() => removeCabin(cIdx)} style={{ color: "#b00" }}>
                                        삭제
                                    </button>
                                </div>

                                <div style={{ marginTop: 10 }}>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => addCabinImage(cIdx, e.target.files?.[0])}
                                    />
                                    <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>
                                        저장 URL 예시:{" "}
                                        <code>
                                            /assets/vessels/{vesselId}/cabins/{c.cabinTypeCode}/파일명.jpg
                                        </code>
                                    </div>
                                </div>

                                {c.images.length > 0 && (
                                    <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                                        {c.images.map((img, iIdx) => (
                                            <div
                                                key={img.id}
                                                style={{ border: "1px solid #eee", borderRadius: 10, padding: 10 }}
                                            >
                                                {img.preview && (
                                                    <img
                                                        src={img.preview}
                                                        alt="cabin"
                                                        style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 8 }}
                                                    />
                                                )}

                                                <div style={{ marginTop: 8 }}>
                                                    <label style={{ display: "block", fontSize: 12, color: "#555" }}>Title</label>
                                                    <input
                                                        value={img.title || ""}
                                                        onChange={(e) => updateCabinImage(cIdx, iIdx, "title", e.target.value)}
                                                        style={{ width: "100%" }}
                                                    />
                                                </div>

                                                <div style={{ marginTop: 8 }}>
                                                    <label style={{ display: "block", fontSize: 12, color: "#555" }}>
                                                        Tags (comma)
                                                    </label>
                                                    <input
                                                        value={img.tagsText || ""}
                                                        onChange={(e) => updateCabinImage(cIdx, iIdx, "tagsText", e.target.value)}
                                                        style={{ width: "100%" }}
                                                        placeholder="interior, bed, bathroom"
                                                    />
                                                </div>

                                                <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
                                                    order: <strong>{img.order}</strong>
                                                </div>

                                                <div style={{ marginTop: 8 }}>
                                                    <button onClick={() => removeCabinImage(cIdx, iIdx)} style={{ color: "#b00" }}>
                                                        이미지 삭제
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </section>

                    {/* Facilities */}
                    <section style={{ marginTop: 18, padding: 12, border: "1px solid #e5e5e5", borderRadius: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <h3 style={{ marginTop: 0 }}>Facilities (공용시설)</h3>
                            <button onClick={addFacility}>+ 시설 추가</button>
                        </div>

                        {facilities.length === 0 && <div style={{ color: "#777" }}>시설이 없으면 생략해도 됩니다.</div>}

                        {facilities.map((f, fIdx) => (
                            <div
                                key={`${f.facilityType}_${fIdx}`}
                                style={{ marginTop: 12, padding: 12, border: "1px solid #ddd", borderRadius: 10 }}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                        <select
                                            value={f.facilityType}
                                            onChange={(e) => updateFacility(fIdx, "facilityType", e.target.value)}
                                        >
                                            {FACILITY_TYPE_OPTIONS.map((opt) => (
                                                <option key={opt} value={opt}>
                                                    {opt}
                                                </option>
                                            ))}
                                        </select>

                                        <input
                                            placeholder="Facility Name (예: Indoor Lounge)"
                                            value={f.name}
                                            onChange={(e) => updateFacility(fIdx, "name", e.target.value)}
                                            style={{ width: 260 }}
                                        />

                                        <input
                                            placeholder="Description"
                                            value={f.description}
                                            onChange={(e) => updateFacility(fIdx, "description", e.target.value)}
                                            style={{ width: 420 }}
                                        />
                                    </div>

                                    <button onClick={() => removeFacility(fIdx)} style={{ color: "#b00" }}>
                                        삭제
                                    </button>
                                </div>

                                <div style={{ marginTop: 10 }}>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => addFacilityImage(fIdx, e.target.files?.[0])}
                                    />
                                </div>

                                {f.images.length > 0 && (
                                    <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                                        {f.images.map((img, iIdx) => (
                                            <div key={img.id} style={{ border: "1px solid #eee", borderRadius: 10, padding: 10 }}>
                                                {img.preview && (
                                                    <img
                                                        src={img.preview}
                                                        alt="facility"
                                                        style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 8 }}
                                                    />
                                                )}
                                                <div style={{ marginTop: 8 }}>
                                                    <label style={{ display: "block", fontSize: 12, color: "#555" }}>Title</label>
                                                    <input
                                                        value={img.title || ""}
                                                        onChange={(e) => updateFacilityImage(fIdx, iIdx, "title", e.target.value)}
                                                        style={{ width: "100%" }}
                                                    />
                                                </div>
                                                <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
                                                    order: <strong>{img.order}</strong>
                                                </div>
                                                <div style={{ marginTop: 8 }}>
                                                    <button onClick={() => removeFacilityImage(fIdx, iIdx)} style={{ color: "#b00" }}>
                                                        이미지 삭제
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </section>

                    {/* Tenders */}
                    <section style={{ marginTop: 18, padding: 12, border: "1px solid #e5e5e5", borderRadius: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <h3 style={{ marginTop: 0 }}>Tenders / Dinghy (딩기/도니)</h3>
                            <button onClick={addTender}>+ 보트 추가</button>
                        </div>

                        {tenders.length === 0 && <div style={{ color: "#777" }}>없으면 생략해도 됩니다.</div>}

                        {tenders.map((t, tIdx) => (
                            <div
                                key={`tender_${tIdx}`}
                                style={{ marginTop: 12, padding: 12, border: "1px solid #ddd", borderRadius: 10 }}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                        <input
                                            placeholder="Name (예: Aluminium Dinghy)"
                                            value={t.name}
                                            onChange={(e) => updateTender(tIdx, "name", e.target.value)}
                                            style={{ width: 320 }}
                                        />

                                        <input
                                            placeholder="Capacity (예: 10)"
                                            value={t.capacity}
                                            onChange={(e) => updateTender(tIdx, "capacity", e.target.value)}
                                            style={{ width: 120 }}
                                        />

                                        <input
                                            placeholder="Description"
                                            value={t.description}
                                            onChange={(e) => updateTender(tIdx, "description", e.target.value)}
                                            style={{ width: 420 }}
                                        />
                                    </div>

                                    <button onClick={() => removeTender(tIdx)} style={{ color: "#b00" }}>
                                        삭제
                                    </button>
                                </div>

                                <div style={{ marginTop: 10 }}>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => addTenderImage(tIdx, e.target.files?.[0])}
                                    />
                                </div>

                                {t.images.length > 0 && (
                                    <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                                        {t.images.map((img, iIdx) => (
                                            <div key={img.id} style={{ border: "1px solid #eee", borderRadius: 10, padding: 10 }}>
                                                {img.preview && (
                                                    <img
                                                        src={img.preview}
                                                        alt="tender"
                                                        style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 8 }}
                                                    />
                                                )}
                                                <div style={{ marginTop: 8 }}>
                                                    <label style={{ display: "block", fontSize: 12, color: "#555" }}>Title</label>
                                                    <input
                                                        value={img.title || ""}
                                                        onChange={(e) => updateTenderImage(tIdx, iIdx, "title", e.target.value)}
                                                        style={{ width: "100%" }}
                                                    />
                                                </div>
                                                <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
                                                    order: <strong>{img.order}</strong>
                                                </div>
                                                <div style={{ marginTop: 8 }}>
                                                    <button onClick={() => removeTenderImage(tIdx, iIdx)} style={{ color: "#b00" }}>
                                                        이미지 삭제
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </section>

                    {/* Food */}
                    <section style={{ marginTop: 18, padding: 12, border: "1px solid #e5e5e5", borderRadius: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <h3 style={{ marginTop: 0 }}>Food / Dining (음식/바)</h3>
                            <button onClick={addFood}>+ 항목 추가</button>
                        </div>

                        {food.length === 0 && <div style={{ color: "#777" }}>없으면 생략해도 됩니다.</div>}

                        {food.map((f, fIdx) => (
                            <div
                                key={`food_${fIdx}`}
                                style={{ marginTop: 12, padding: 12, border: "1px solid #ddd", borderRadius: 10 }}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                        <select
                                            value={f.foodType}
                                            onChange={(e) => updateFood(fIdx, "foodType", e.target.value)}
                                        >
                                            {FOOD_TYPE_OPTIONS.map((opt) => (
                                                <option key={opt} value={opt}>
                                                    {opt}
                                                </option>
                                            ))}
                                        </select>

                                        <input
                                            placeholder="Name (예: On-board Meals)"
                                            value={f.name}
                                            onChange={(e) => updateFood(fIdx, "name", e.target.value)}
                                            style={{ width: 320 }}
                                        />

                                        <input
                                            placeholder="Description"
                                            value={f.description}
                                            onChange={(e) => updateFood(fIdx, "description", e.target.value)}
                                            style={{ width: 460 }}
                                        />
                                    </div>

                                    <button onClick={() => removeFood(fIdx)} style={{ color: "#b00" }}>
                                        삭제
                                    </button>
                                </div>

                                <div style={{ marginTop: 10 }}>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => addFoodImage(fIdx, e.target.files?.[0])}
                                    />
                                </div>

                                {f.images.length > 0 && (
                                    <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                                        {f.images.map((img, iIdx) => (
                                            <div key={img.id} style={{ border: "1px solid #eee", borderRadius: 10, padding: 10 }}>
                                                {img.preview && (
                                                    <img
                                                        src={img.preview}
                                                        alt="food"
                                                        style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 8 }}
                                                    />
                                                )}
                                                <div style={{ marginTop: 8 }}>
                                                    <label style={{ display: "block", fontSize: 12, color: "#555" }}>Title</label>
                                                    <input
                                                        value={img.title || ""}
                                                        onChange={(e) => updateFoodImage(fIdx, iIdx, "title", e.target.value)}
                                                        style={{ width: "100%" }}
                                                    />
                                                </div>
                                                <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
                                                    order: <strong>{img.order}</strong>
                                                </div>
                                                <div style={{ marginTop: 8 }}>
                                                    <button onClick={() => removeFoodImage(fIdx, iIdx)} style={{ color: "#b00" }}>
                                                        이미지 삭제
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </section>

                    {/* Save + Preview */}
                    <section style={{ marginTop: 22, padding: 12, border: "1px solid #e5e5e5", borderRadius: 10 }}>
                        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                            <button onClick={handleSaveToServer} style={{ padding: "10px 16px" }}>
                                서버에 저장
                            </button>
                            <div style={{ color: saveStatus.startsWith("✅") ? "green" : "#666" }}>{saveStatus}</div>
                        </div>

                        <div style={{ marginTop: 12 }}>
                            <h3 style={{ marginTop: 0 }}>JSON 미리보기</h3>
                            <pre
                                style={{
                                    background: "#f5f5f5",
                                    padding: 12,
                                    borderRadius: 10,
                                    maxHeight: 420,
                                    overflow: "auto",
                                    fontSize: 12,
                                }}
                            >
                                {JSON.stringify(previewJson, null, 2)}
                            </pre>
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}

export default AdminBoatAssets;
