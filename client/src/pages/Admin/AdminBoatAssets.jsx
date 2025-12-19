import React, { useEffect, useMemo, useState } from "react";

/* ======================
   ENUMS
====================== */

const CABIN_TYPE_OPTIONS = [
    "STANDARD",
    "DELUXE",
    "SUITE",
    "CUSTOM"
];

const DECK_LEVEL_OPTIONS = [
    { code: "LOWER_DECK", label: "Lower Deck" },
    { code: "MAIN_DECK", label: "Main Deck" },
    { code: "UPPER_DECK", label: "Upper Deck" },
    { code: "OTHER", label: "Other / All Deck" }
];

const FACILITY_TYPES = [
    "RESTAURANT",
    "LOUNGE",
    "SUN_DECK",
    "DIVE_DECK",
    "CAMERA_ROOM",
    "BAR",
    "OTHER"
];

/* ======================
   COMPONENT
====================== */

function AdminBoatAssets() {
    const [utsTrips, setUtsTrips] = useState([]);
    const [loading, setLoading] = useState(true);

    const [vesselId, setVesselId] = useState("");
    const [boatName, setBoatName] = useState("");

    const [hero, setHero] = useState(null);
    const [deckPlans, setDeckPlans] = useState([]);
    const [cabins, setCabins] = useState([]);
    const [facilities, setFacilities] = useState([]);

    const [saveStatus, setSaveStatus] = useState("");

    /* ======================
       Load UTS
    ====================== */
    useEffect(() => {
        fetch("/data/uts-trips.json")
            .then(res => res.json())
            .then(data => {
                setUtsTrips(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const vesselOptions = useMemo(() => {
        const map = new Map();
        utsTrips.forEach(t => {
            if (t.vesselId && !map.has(t.vesselId)) {
                map.set(t.vesselId, {
                    vesselId: t.vesselId,
                    boatName: t.boatName || t.vesselId
                });
            }
        });
        return Array.from(map.values());
    }, [utsTrips]);

    function handleVesselSelect(e) {
        const selected = vesselOptions.find(v => v.vesselId === e.target.value);
        if (!selected) return;

        setVesselId(selected.vesselId);
        setBoatName(selected.boatName);
        setHero(null);
        setDeckPlans([]);
        setCabins([]);
        setFacilities([]);
        setSaveStatus("");
    }

    /* ======================
       HERO
    ====================== */
    function handleHeroUpload(e) {
        const file = e.target.files?.[0];
        if (!file || !vesselId) return;

        setHero({
            id: `${vesselId}_hero`,
            file,
            title: boatName,
            description: ""
        });
    }

    /* ======================
       DECK PLANS
    ====================== */
    function addDeckPlan() {
        setDeckPlans([
            ...deckPlans,
            {
                deckLevel: "MAIN_DECK",
                deckName: "",
                images: []
            }
        ]);
    }

    function updateDeckPlan(index, field, value) {
        const updated = [...deckPlans];
        updated[index][field] = value;
        setDeckPlans(updated);
    }

    function addDeckPlanImage(index, file) {
        if (!file || !vesselId) return;

        const updated = [...deckPlans];
        updated[index].images.push({
            id: `${vesselId}_deck_${Date.now()}`,
            file,
            title: ""
        });
        setDeckPlans(updated);
    }

    /* ======================
       CABINS
    ====================== */
    function addCabin() {
        setCabins([
            ...cabins,
            {
                cabinType: "DELUXE",
                deckLevel: "MAIN_DECK",
                cabinName: "",
                images: []
            }
        ]);
    }

    function updateCabin(index, field, value) {
        const updated = [...cabins];
        updated[index][field] = value;
        setCabins(updated);
    }

    function addCabinImage(index, file) {
        if (!file || !vesselId) return;

        const updated = [...cabins];
        updated[index].images.push({
            id: `${vesselId}_cabin_${Date.now()}`,
            file,
            title: ""
        });
        setCabins(updated);
    }

    /* ======================
       FACILITIES
    ====================== */
    function addFacility() {
        setFacilities([
            ...facilities,
            {
                facilityType: "LOUNGE",
                name: "",
                images: []
            }
        ]);
    }

    function updateFacility(index, field, value) {
        const updated = [...facilities];
        updated[index][field] = value;
        setFacilities(updated);
    }

    function addFacilityImage(index, file) {
        if (!file || !vesselId) return;

        const updated = [...facilities];
        updated[index].images.push({
            id: `${vesselId}_facility_${Date.now()}`,
            file,
            title: ""
        });
        setFacilities(updated);
    }

    /* ======================
       BUILD PAYLOAD
    ====================== */
    function buildPayload() {
        if (!vesselId) return null;

        return {
            vesselId,
            boatName,
            lastUpdated: new Date().toISOString().slice(0, 10),
            assets: {
                hero: hero
                    ? {
                        id: hero.id,
                        url: `/assets/vessels/${vesselId}/hero/${hero.file.name}`,
                        title: hero.title,
                        description: hero.description
                    }
                    : null,

                deckPlans: deckPlans.map(d => ({
                    deckLevel: d.deckLevel,
                    deckName: d.deckName,
                    images: d.images.map(img => ({
                        id: img.id,
                        url: `/assets/vessels/${vesselId}/deck-plans/${d.deckLevel}/${img.file.name}`,
                        title: img.title
                    }))
                })),

                cabins: cabins.map(c => ({
                    cabinType: c.cabinType,
                    deckLevel: c.deckLevel,
                    cabinName: c.cabinName,
                    images: c.images.map(img => ({
                        id: img.id,
                        url: `/assets/vessels/${vesselId}/cabins/${c.cabinType}/${img.file.name}`,
                        title: img.title
                    }))
                })),

                facilities: facilities.map(f => ({
                    facilityType: f.facilityType,
                    name: f.name,
                    images: f.images.map(img => ({
                        id: img.id,
                        url: `/assets/vessels/${vesselId}/facilities/${f.facilityType}/${img.file.name}`,
                        title: img.title
                    }))
                }))
            }
        };
    }

    /* ======================
       SAVE
    ====================== */
    async function handleSave() {
        const payload = buildPayload();
        if (!payload) {
            alert("선박을 선택하세요.");
            return;
        }

        setSaveStatus("저장 중...");

        try {
            const res = await fetch("/admin/api/boats-assets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            setSaveStatus(result.success ? "✅ 저장 완료" : "❌ 저장 실패");
        } catch {
            setSaveStatus("❌ 서버 오류");
        }
    }

    if (loading) {
        return <div style={{ padding: 24 }}>UTS 데이터 로딩 중...</div>;
    }

    /* ======================
       RENDER
    ====================== */
    return (
        <div style={{ padding: 24, maxWidth: 1200 }}>
            <h2>Boat Assets Admin</h2>

            {/* Vessel */}
            <section>
                <h3>선박 선택</h3>
                <select value={vesselId} onChange={handleVesselSelect}>
                    <option value="">선박 선택</option>
                    {vesselOptions.map(v => (
                        <option key={v.vesselId} value={v.vesselId}>
                            {v.boatName} ({v.vesselId})
                        </option>
                    ))}
                </select>
            </section>

            {/* Hero */}
            <section>
                <h3>Hero</h3>
                <input type="file" accept="image/*" onChange={handleHeroUpload} />
                {hero && <div>선택됨: {hero.file.name}</div>}
            </section>

            {/* Deck Plans */}
            <section>
                <h3>Deck Plans</h3>
                <button onClick={addDeckPlan}>+ 덱 추가</button>
                {deckPlans.map((d, i) => (
                    <div key={i} style={{ border: "1px solid #ccc", padding: 12, marginTop: 8 }}>
                        <select
                            value={d.deckLevel}
                            onChange={e => updateDeckPlan(i, "deckLevel", e.target.value)}
                        >
                            {DECK_LEVEL_OPTIONS.map(o => (
                                <option key={o.code} value={o.code}>{o.label}</option>
                            ))}
                        </select>
                        <input
                            placeholder="Deck Name"
                            value={d.deckName}
                            onChange={e => updateDeckPlan(i, "deckName", e.target.value)}
                        />
                        <input
                            type="file"
                            accept="image/*"
                            onChange={e => addDeckPlanImage(i, e.target.files[0])}
                        />
                    </div>
                ))}
            </section>

            {/* Cabins */}
            <section>
                <h3>Cabins</h3>
                <button onClick={addCabin}>+ 객실 추가</button>
                {cabins.map((c, i) => (
                    <div key={i} style={{ border: "1px solid #ccc", padding: 12, marginTop: 8 }}>
                        <select
                            value={c.cabinType}
                            onChange={e => updateCabin(i, "cabinType", e.target.value)}
                        >
                            {CABIN_TYPE_OPTIONS.map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>

                        <select
                            value={c.deckLevel}
                            onChange={e => updateCabin(i, "deckLevel", e.target.value)}
                        >
                            {DECK_LEVEL_OPTIONS.map(o => (
                                <option key={o.code} value={o.code}>{o.label}</option>
                            ))}
                        </select>

                        <input
                            placeholder="Cabin Name"
                            value={c.cabinName}
                            onChange={e => updateCabin(i, "cabinName", e.target.value)}
                        />

                        <input
                            type="file"
                            accept="image/*"
                            onChange={e => addCabinImage(i, e.target.files[0])}
                        />
                    </div>
                ))}
            </section>

            {/* Facilities */}
            <section>
                <h3>Facilities</h3>
                <button onClick={addFacility}>+ 공용시설 추가</button>
                {facilities.map((f, i) => (
                    <div key={i} style={{ border: "1px solid #ccc", padding: 12, marginTop: 8 }}>
                        <select
                            value={f.facilityType}
                            onChange={e => updateFacility(i, "facilityType", e.target.value)}
                        >
                            {FACILITY_TYPES.map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>

                        <input
                            placeholder="Facility Name"
                            value={f.name}
                            onChange={e => updateFacility(i, "name", e.target.value)}
                        />

                        <input
                            type="file"
                            accept="image/*"
                            onChange={e => addFacilityImage(i, e.target.files[0])}
                        />
                    </div>
                ))}
            </section>

            {/* Save */}
            <section style={{ marginTop: 24 }}>
                <button onClick={handleSave}>서버 저장</button>
                <div style={{ marginTop: 8 }}>{saveStatus}</div>
            </section>

            {/* JSON Preview */}
            <section style={{ marginTop: 24 }}>
                <h3>JSON Preview</h3>
                <pre style={{ background: "#f5f5f5", padding: 16, maxHeight: 400, overflow: "auto" }}>
                    {JSON.stringify(buildPayload(), null, 2)}
                </pre>
            </section>
        </div>
    );
}

export default AdminBoatAssets;
