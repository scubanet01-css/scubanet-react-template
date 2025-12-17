import React, { useState } from "react";

console.log("AdminBoatAssets mounted");


/**
 * 1차 목적:
 * - 관리자 입력 → boats-assets.json 구조 state로 생성
 * - 실제 파일 저장은 다음 단계
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
    const [vesselId, setVesselId] = useState("");
    const [vesselName, setVesselName] = useState("");

    const [heroImage, setHeroImage] = useState(null);

    const [cabins, setCabins] = useState([]);

    /* ---------------- Hero ---------------- */

    function handleHeroUpload(e) {
        const file = e.target.files && e.target.files[0];
        if (!file || !vesselId) return;

        setHeroImage({
            id: `${vesselId}_hero_01`,
            file,
            preview: URL.createObjectURL(file),
            title: vesselName,
            description: ""
        });
    }


    /* ---------------- Cabin ---------------- */

    function addCabinImage(cabinIndex, file) {
        if (!file || !vesselId) return;

        const updated = [...cabins];

        updated[cabinIndex].images.push({
            id: `${vesselId}_${updated[cabinIndex].cabinTypeCode}_${Date.now()}`,
            file,
            preview: URL.createObjectURL(file),
            title: "",
            tags: [],
            order: updated[cabinIndex].images.length + 1
        });

        setCabins(updated);
    }


    function updateCabin(index, field, value) {
        const updated = [...cabins];
        updated[index][field] = value;
        setCabins(updated);
    }

    function addCabinImage(cabinIndex, file) {
        const updated = [...cabins];
        updated[cabinIndex].images.push({
            id: `${vesselId}_${cabins[cabinIndex].cabinTypeCode}_${Date.now()}`,
            file,
            preview: URL.createObjectURL(file),
            title: "",
            tags: [],
            order: updated[cabinIndex].images.length + 1
        });
        setCabins(updated);
    }

    /* ---------------- Preview JSON ---------------- */

    function generatePreviewJSON() {
        if (!vesselId) return null;

        return {
            vesselId,
            vesselName,
            lastUpdated: new Date().toISOString().slice(0, 10),
            assets: {
                hero: heroImage && heroImage.file
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
                    images: c.images
                        .filter(img => img.file)
                        .map(img => ({
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


    return (
        <div style={{ padding: 24, maxWidth: 1000 }}>
            <h2>Boat Assets Admin</h2>

            {/* Vessel Info */}
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
            <section>
                <h3>대표 이미지 (Hero)</h3>
                <input type="file" accept="image/*" onChange={handleHeroUpload} />
                {heroImage && (
                    <div>
                        <img
                            src={heroImage.preview}
                            alt="hero preview"
                            style={{ width: 300, marginTop: 10 }}
                        />
                    </div>
                )}
            </section>

            {/* Cabins */}
            <section>
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
                                    addCabinImage(index, e.target.files[0])
                                }
                            />
                        </div>

                        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                            {cabin.images.map(img => (
                                <img
                                    key={img.id}
                                    src={img.preview}
                                    alt=""
                                    style={{ width: 120 }}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </section>

            {/* JSON Preview */}
            <section style={{ marginTop: 32 }}>
                <h3>boats-assets.json 미리보기</h3>
                <pre
                    style={{
                        background: "#f5f5f5",
                        padding: 16,
                        maxHeight: 400,
                        overflow: "auto"
                    }}
                >
                    {JSON.stringify(generatePreviewJSON(), null, 2)}
                </pre>
            </section>
        </div>
    );
}

export default AdminBoatAssets;
