import React, { useEffect, useMemo, useState } from "react";
import { resizeImage } from "../../utils/imageResize";

const CABIN_TYPES = ["STANDARD", "DELUXE", "SUITE", "CUSTOM"];
const DECK_LEVELS = ["LOWER_DECK", "MAIN_DECK", "UPPER_DECK"];

function AdminBoatAssets() {
    const [utsTrips, setUtsTrips] = useState([]);
    const [vesselId, setVesselId] = useState("");
    const [boatName, setBoatName] = useState("");

    const [hero, setHero] = useState(null);
    const [deckPlans, setDeckPlans] = useState([]);
    const [cabins, setCabins] = useState([]);

    const [status, setStatus] = useState("");

    /* ======================
       Load UTS
    ====================== */
    useEffect(() => {
        fetch("/data/uts-trips.json")
            .then(r => r.json())
            .then(setUtsTrips)
            .catch(console.error);
    }, []);

    const vessels = useMemo(() => {
        const map = new Map();
        utsTrips.forEach(t => {
            if (t.vesselId && !map.has(t.vesselId)) {
                map.set(t.vesselId, {
                    vesselId: t.vesselId,
                    boatName: t.boatName
                });
            }
        });
        return Array.from(map.values());
    }, [utsTrips]);

    /* ======================
       Hero
    ====================== */
    async function onHeroUpload(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        const resized = await resizeImage(file, 1920, 0.85);
        setHero({
            id: `${vesselId}_hero`,
            file: resized,
            title: boatName,
            isPrimary: true
        });
    }

    /* ======================
       Deck Plans
    ====================== */
    function addDeck() {
        setDeckPlans([...deckPlans, {
            deckLevel: "MAIN_DECK",
            title: "",
            image: null
        }]);
    }

    async function setDeckImage(i, file) {
        const resized = await resizeImage(file, 2400, 0.85);
        const next = [...deckPlans];
        next[i].image = resized;
        setDeckPlans(next);
    }

    /* ======================
       Cabins
    ====================== */
    function addCabin() {
        setCabins([...cabins, {
            cabinType: "DELUXE",
            deckLevel: "MAIN_DECK",
            title: "",
            images: []
        }]);
    }

    async function addCabinImage(i, file) {
        const resized = await resizeImage(file, 1600, 0.8);
        const next = [...cabins];
        next[i].images.push({
            id: `${vesselId}_cabin_${Date.now()}`,
            file: resized,
            title: ""
        });
        setCabins(next);
    }

    /* ======================
       Save
    ====================== */
    async function save() {
        setStatus("저장 중...");

        const payload = {
            vesselId,
            boatName,
            lastUpdated: new Date().toISOString().slice(0, 10),
            assets: {
                hero: hero && {
                    id: hero.id,
                    url: `/assets/vessels/${vesselId}/hero/${hero.file.name}`,
                    title: hero.title,
                    isPrimary: true
                },
                deckPlans: deckPlans.map((d, i) => ({
                    deckLevel: d.deckLevel,
                    title: d.title,
                    image: {
                        url: `/assets/vessels/${vesselId}/deck-plans/${d.deckLevel}/${d.image?.name}`
                    }
                })),
                cabins: cabins.map(c => ({
                    cabinType: c.cabinType,
                    deckLevel: c.deckLevel,
                    title: c.title,
                    images: c.images.map(img => ({
                        url: `/assets/vessels/${vesselId}/cabins/${c.cabinType}/${img.file.name}`,
                        title: img.title
                    }))
                }))
            }
        };

        try {
            const res = await fetch("/admin/api/boats-assets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const json = await res.json();
            setStatus(json.success ? "✅ 저장 완료" : "❌ 저장 실패");
        } catch {
            setStatus("❌ 서버 오류");
        }
    }

    return (
        <div style={{ padding: 24, maxWidth: 1100 }}>
            <h2>Boat Assets Admin</h2>

            <select onChange={e => {
                const v = vessels.find(x => x.vesselId === e.target.value);
                setVesselId(v?.vesselId || "");
                setBoatName(v?.boatName || "");
            }}>
                <option value="">선박 선택</option>
                {vessels.map(v =>
                    <option key={v.vesselId} value={v.vesselId}>
                        {v.boatName} ({v.vesselId})
                    </option>
                )}
            </select>

            <h3>Hero</h3>
            <input type="file" onChange={onHeroUpload} />

            <h3>Deck Plans</h3>
            <button onClick={addDeck}>+ 덱 추가</button>
            {deckPlans.map((d, i) => (
                <div key={i}>
                    <select value={d.deckLevel}
                        onChange={e => {
                            const n = [...deckPlans];
                            n[i].deckLevel = e.target.value;
                            setDeckPlans(n);
                        }}>
                        {DECK_LEVELS.map(l => <option key={l}>{l}</option>)}
                    </select>
                    <input placeholder="Title"
                        value={d.title}
                        onChange={e => {
                            const n = [...deckPlans];
                            n[i].title = e.target.value;
                            setDeckPlans(n);
                        }} />
                    <input type="file" onChange={e => setDeckImage(i, e.target.files[0])} />
                </div>
            ))}

            <h3>Cabins</h3>
            <button onClick={addCabin}>+ 객실 추가</button>
            {cabins.map((c, i) => (
                <div key={i}>
                    <select value={c.cabinType}
                        onChange={e => {
                            const n = [...cabins];
                            n[i].cabinType = e.target.value;
                            setCabins(n);
                        }}>
                        {CABIN_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>

                    <select value={c.deckLevel}
                        onChange={e => {
                            const n = [...cabins];
                            n[i].deckLevel = e.target.value;
                            setCabins(n);
                        }}>
                        {DECK_LEVELS.map(l => <option key={l}>{l}</option>)}
                    </select>

                    <input placeholder="Title"
                        value={c.title}
                        onChange={e => {
                            const n = [...cabins];
                            n[i].title = e.target.value;
                            setCabins(n);
                        }} />

                    <input type="file" onChange={e => addCabinImage(i, e.target.files[0])} />
                </div>
            ))}

            <button onClick={save}>서버 저장</button>
            <div>{status}</div>
        </div>
    );
}

export default AdminBoatAssets;
