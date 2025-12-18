import React, { useEffect, useMemo, useState } from "react";

/**
 * AdminBoatAssets (서버 저장 최종본)
 * - UTS 기반 vesselId 선택
 * - 이미지 메타데이터 → 서버 저장
 */

const CABIN_TYPE_OPTIONS = [
    "STANDARD",
    "DELUXE",
    "SUITE",
    "UPPER_DECK",
    "LOWER_DECK",
    "CUSTOM"
];

function AdminBoatAssets() {
    const [utsTrips, setUtsTrips] = useState([]);
    const [loading, setLoading] = useState(true);

    const [vesselId, setVesselId] = useState("");
    const [boatName, setBoatName] = useState("");

    const [heroImage, setHeroImage] = useState(null);
    const [cabins, setCabins] = useState([]);

    const [saveStatus, setSaveStatus] = useState("");

    /* =========================
       Load UTS Trips
    ========================= */
    useEffect(() => {
        fetch("/data/uts-trips.json")
            .then(res => res.json())
            .then(data => {
                setUtsTrips(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(err => {
                console.error("uts-trips.json 로드 실패", err);
                setLoading(false);
            });
    }, []);

    /* =========================
       Vessel Options
    ========================= */
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
        setHeroImage(null);
        setCabins([]);
        setSaveStatus("");
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
            title: boatName,
            description: ""
        });
    }

    /* =========================
       Cabins
    ========================= */
    function addCabin() {
        if (!vesselId) return;
        setCabins([
            ...cabins,
            { cabinTypeCode: "STANDARD", cabinName: "", images: [] }
        ]);
    }

    function updateCabin(index, field, value) {
        const updated = [...cabins];
        updated[index][field] = value;
        setCabins(updated);
    }

    function addCabinImage(cabinIndex, file) {
        if (!file || !vesselId) return;
        const updated = [...cabins];
        updated[cabinIndex].images.push({
            id: `${vesselId}_${updated[cabinIndex].cabinTypeCode}_${Date.now()}`,
            file,
            title: "",
            tags: [],
            order: updated[cabinIndex].images.length + 1
        });
        setCabins(updated);
    }

    /* =========================
       Payload 생성
    ========================= */
    function buildPayload() {
        if (!vesselId) return null;

        return {
            vesselId,
            boatName,
            lastUpdated: new Date().toISOString().slice(0, 10),
            assets: {
                hero: heroImage
                    ? {
                        id: heroImage.id,
                        url: `/assets/vessels/${vesselId}/hero/${heroImage.file.name}`,
                        title: heroImage.title,
                        description: heroImage.description,
                        order: 1,
                        isPrimary: true
                    }
                    : null,
                cabins: cabins.map(c => ({
                    cabinTypeCode: c.cabinTypeCode,
                    cabinName: c.cabinName,
                    images: c.images.map(img => ({
                        id: img.id,
                        url: `/assets/vessels/${vesselId}/cabins/${c.cabinTypeCode}/${img.file.name}`,
                        title: img.title,
                        tags: img.tags,
                        order: img.order
                    }))
                }))
            }
        };
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
            const res = await fetch("/api/admin/boats-assets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const result = await res.json();

            if (result.success) {
                setSaveStatus(`✅ 저장 완료 (${payload.vesselId})`);
            } else {
                setSaveStatus("❌ 저장 실패");
            }
        } catch (err) {
            console.error(err);
            setSaveStatus("❌ 서버 오류");
        }
    }

    if (loading) {
        return <div style={{ padding: 24 }}>UTS 데이터 로딩 중...</div>;
    }

    return (
        <div style={{ padding: 24, maxWidth: 1000 }}>
            <h2>Boat Assets Admin (서버 저장)</h2>

            <section>
                <h3>UTS 선박 선택</h3>
                <select value={vesselId} onChange={handleVesselSelect}>
                    <option value="">선박 선택</option>
                    {vesselOptions.map(v => (
                        <option key={v.vesselId} value={v.vesselId}>
                            {v.boatName} ({v.vesselId})
                        </option>
                    ))}
                </select>
            </section>

            <section style={{ marginTop: 24 }}>
                <h3>대표 이미지 (Hero)</h3>
                <input type="file" accept="image/*" onChange={handleHeroUpload} />
            </section>

            <section style={{ marginTop: 24 }}>
                <h3>객실 이미지</h3>
                <button onClick={addCabin}>+ 객실 타입 추가</button>

                {cabins.map((cabin, index) => (
                    <div key={index} style={{ border: "1px solid #ccc", padding: 16, marginTop: 12 }}>
                        <select
                            value={cabin.cabinTypeCode}
                            onChange={e => updateCabin(index, "cabinTypeCode", e.target.value)}
                        >
                            {CABIN_TYPE_OPTIONS.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>

                        <input
                            placeholder="객실 이름"
                            value={cabin.cabinName}
                            onChange={e => updateCabin(index, "cabinName", e.target.value)}
                            style={{ marginLeft: 8 }}
                        />

                        <div style={{ marginTop: 8 }}>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={e => addCabinImage(index, e.target.files?.[0])}
                            />
                        </div>

                        <ul>
                            {cabin.images.map(img => (
                                <li key={img.id}>{img.file.name}</li>
                            ))}
                        </ul>
                    </div>
                ))}
            </section>

            {vesselId && (
                <section style={{ marginTop: 32 }}>
                    <button onClick={handleSaveToServer}>
                        서버에 저장
                    </button>
                    <div style={{ marginTop: 8 }}>{saveStatus}</div>
                </section>
            )}
        </div>
    );
}

export default AdminBoatAssets;
