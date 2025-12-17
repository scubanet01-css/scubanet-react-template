import React, { useState } from "react";

/**
 * AdminBoatAssets
 * - 관리자 입력 → boats-assets.json 구조 생성
 * - Export 버튼으로 JSON 다운로드
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

    const [vesselId, setVesselId] = useState("");
    const [vesselName, setVesselName] = useState("");

    const [heroImage, setHeroImage] = useState(null);
    const [cabins, setCabins] = useState([]);

    /* =========================
       Hero
    ========================= */

    function handleHeroUpload(e) {
        const file = e.target.files?.[0];
        if (!file || !vesselId) return;

        setHeroImage({
            id: `${vesselId}_hero_01`,
            file,
            title: vesselName,
            description: ""
        });
    }

    /* =========================
       Cabin
    ========================= */

    function addCabin() {
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
            vesselName,
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
        if (!data) return;

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

    return (
        <div style={{ padding: 24, maxWidth: 1000 }}>
            <h2>Boat Assets Admin</h2>

            {/* 선박 정보 */}
            <section>
                <h3>선박 정보</h3>
                <input
                    placeholder="vesselId (예: vessel_almoda)"
                    value={vesselId}
                    onChange={e => setVesselId(e.target.value)}
                />
                <br />
                <input
                    placeholder="선박 이름"
                    value={vesselName}
                    onChange={e => setVesselName(e.target.value)}
                />
            </section>

            {/* Hero */}
            <section style={{ marginTop: 24 }}>
                <h3>대표 이미지 (Hero)</h3>
                <input type="file" accept="image/*" onChange={handleHeroUpload} />
                {heroImage && (
                    <div style={{ marginTop: 8 }}>
                        선택된 파일: <strong>{heroImage.file.name}</strong>
                    </div>
                )}
            </section>

            {/* Cabins */}
            <section style={{ marginTop: 24 }}>
                <h3>객실 이미지</h3>
                <button onClick={addCabin}>+ 객실 타입 추가</button>

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
                                <option key={opt} value={opt}>
                                    {opt}
                                </option>
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

            {/* Export */}
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
