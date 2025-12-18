import React, { useEffect, useMemo, useState } from "react";

/**
 * AdminBoatAssets (UTS 기반 최종본)
 * - /data/uts-trips.json fetch
 * - vesselId 기준 선박 선택
 * - 이미지 자산 → boats-assets.json Export
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
    /* =========================
       State
    ========================= */
    const [utsTrips, setUtsTrips] = useState([]);
    const [loading, setLoading] = useState(true);

    const [vesselId, setVesselId] = useState("");
    const [boatName, setBoatName] = useState("");

    const [heroImage, setHeroImage] = useState(null);
    const [cabins, setCabins] = useState([]);

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
       Vessel options (중복 제거)
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

    /* =========================
       Vessel select
    ========================= */
    function handleVesselSelect(e) {
        const selected = vesselOptions.find(
            v => v.vesselId === e.target.value
        );
        if (!selected) return;

        setVesselId(selected.vesselId);
        setBoatName(selected.boatName);

        // 선박 변경 시 초기화 (안전)
        setHeroImage(null);
        setCabins([]);
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
            {
                cabinTypeCode: "STANDARD",
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
       JSON 생성
    ========================= */
    function generatePreviewJSON() {
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
       Export
    ========================= */
    function handleExportJSON() {
        const data = generatePreviewJSON();
        if (!data) {
            alert("UTS 선박을 먼저 선택하세요.");
            return;
        }

        const blob = new Blob(
            [JSON.stringify(data, null, 2)],
            { type: "application/json;charset=utf-8;" }
        );

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `boats-assets-${vesselId}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }

    /* =========================
       Render
    ========================= */
    if (loading) {
        return <div style={{ padding: 24 }}>UTS 데이터 로딩 중...</div>;
    }

    return (
        <div style={{ padding: 24, maxWidth: 1000 }}>
            <h2>Boat Assets Admin (UTS 기반)</h2>

            {/* Vessel select */}
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

                {vesselId && (
                    <div style={{ marginTop: 8, fontSize: 14, color: "#555" }}>
                        <div><strong>vesselId:</strong> {vesselId}</div>
                        <div><strong>boatName:</strong> {boatName}</div>
                    </div>
                )}
            </section>

            {/* Hero */}
            <section style={{ marginTop: 24 }}>
                <h3>대표 이미지 (Hero)</h3>
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleHeroUpload}
                    disabled={!vesselId}
                />
                {heroImage && (
                    <div style={{ marginTop: 8 }}>
                        선택된 파일: <strong>{heroImage.file.name}</strong>
                    </div>
                )}
            </section>

            {/* Cabins */}
            <section style={{ marginTop: 24 }}>
                <h3>객실 이미지</h3>
                <button onClick={addCabin} disabled={!vesselId}>
                    + 객실 타입 추가
                </button>

                {cabins.map((cabin, index) => (
                    <div
                        key={index}
                        style={{
                            border: "1px solid #ccc",
                            padding: 16,
                            marginTop: 12
                        }}
                    >
                        <select
                            value={cabin.cabinTypeCode}
                            onChange={e =>
                                updateCabin(index, "cabinTypeCode", e.target.value)
                            }
                        >
                            {CABIN_TYPE_OPTIONS.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>

                        <input
                            placeholder="객실 이름"
                            value={cabin.cabinName}
                            onChange={e =>
                                updateCabin(index, "cabinName", e.target.value)
                            }
                            style={{ marginLeft: 8 }}
                        />

                        <div style={{ marginTop: 8 }}>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={e =>
                                    addCabinImage(index, e.target.files?.[0])
                                }
                            />
                        </div>

                        <ul style={{ marginTop: 8 }}>
                            {cabin.images.map(img => (
                                <li key={img.id}>{img.file.name}</li>
                            ))}
                        </ul>
                    </div>
                ))}
            </section>

            {/* Export + Preview */}
            {vesselId && (
                <section style={{ marginTop: 32 }}>
                    <button onClick={handleExportJSON}>
                        boats-assets.json 다운로드
                    </button>

                    <pre
                        style={{
                            background: "#f5f5f5",
                            padding: 16,
                            marginTop: 12,
                            maxHeight: 400,
                            overflow: "auto"
                        }}
                    >
                        {JSON.stringify(generatePreviewJSON(), null, 2)}
                    </pre>
                </section>
            )}
        </div>
    );
}

export default AdminBoatAssets;
