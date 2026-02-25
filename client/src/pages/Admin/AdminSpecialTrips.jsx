// client/src/pages/Admin/AdminSpecialTrips.jsx
import React, { useEffect, useState } from "react";

// 개발용 API 서버 주소
const API_BASE = "http://210.114.22.82:4002";

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

export default function AdminSpecialTrips() {
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedTrip, setSelectedTrip] = useState(null); // 선택된 트립
    const [formData, setFormData] = useState(null);        // 편집용 폼 데이터
    const [saving, setSaving] = useState(false);

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
            setFormData({
                ...selectedTrip,
                pricing: selectedTrip.pricing || {
                    currency: "USD",
                    basePrice: null,
                    publicDiscountPercent: 0,
                    instructorGroupPrice: null,
                    instructorFOCPolicy: "",
                    fullCharterPrice: null,
                },
            });
        }
    }, [selectedTrip]);

    // 공통 change 핸들러
    const handleFieldChange = (field) => (e) => {
        const value = e.target.value;
        setFormData((prev) => ({
            ...(prev || {}),
            [field]: value,
        }));
    };

    // ─────────────────────────────
    // 배 이름 → vesselId 자동 생성을 위한 slug
    // ─────────────────────────────
    const slugifySimple = (text) => {
        return String(text || "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, " ")   // 영문+숫자만 남기고 나머지는 공백 처리
            .trim()
            .replace(/\s+/g, "");          // 공백 제거 → molamola01
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
            // 날짜 파싱 실패 시 자동 생성 포기
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

            // 기존 vesselId가 비어 있으면 자동으로 채워줌
            const nextVesselId = prev.vesselId ? prev.vesselId : autoId;

            return {
                ...prev,
                boatName,
                vesselId: nextVesselId,
            };
        });
    };

    // ID 자동 생성 버튼 클릭 시
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

    // salesMode 토글용 헬퍼
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

    // 저장 버튼 클릭
    const handleSave = async () => {
        if (!formData) return;

        try {
            setSaving(true);

            const res = await fetch(`${API_BASE}/api/admin/special-trips`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }

            alert("✅ 저장 완료");

            // 저장 후 리스트도 최신 상태로 반영 (간단히 메모리 업데이트)
            setTrips((prev) => {
                const id = formData.specialTripId || formData.id;
                const copied = [...prev];
                const idx = copied.findIndex(
                    (t) => (t.specialTripId || t.id) === id
                );
                if (idx >= 0) {
                    copied[idx] = formData;
                }
                return copied;
            });

            setSelectedTrip(formData);
        } catch (err) {
            console.error("❌ 저장 중 오류:", err);
            alert("저장 중 오류가 발생했습니다.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ padding: "20px" }}>
            <h2>스페셜 트립 관리 (읽기 전용 1단계 + 간단 편집)</h2>
            <p style={{ color: "#666", marginBottom: 16 }}>
                /var/scubanet-data/special-trips.json 내용을 API(4002)에서 불러와서
                표시합니다. 선택된 트립의 일부 필드는 여기서 바로 수정할 수 있습니다.
            </p>

            {loading && <div>불러오는 중...</div>}
            {error && (
                <div style={{ color: "red", marginBottom: 12 }}>
                    {error}
                </div>
            )}

            {!loading && !error && trips.length === 0 && (
                <div>등록된 스페셜 트립이 없습니다.</div>
            )}

            {/* ✅ 선택된 스페셜 트립 상세 + 편집 폼 */}
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
                    <p style={{ fontSize: "0.9rem", color: "#555", marginTop: 0 }}>
                        이 영역은 다음 단계에서 <strong>입력/수정 전체 폼</strong>으로 확장할 예정입니다.
                        지금은 타이틀 / FOC / 상태 정도만 서버에 저장해 보는 단계입니다.
                    </p>

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
                                        <code>{makeAutoSpecialTripId(formData) || "배 이름 / 목적지 / 승선일 입력 후 [자동]을 누르세요"}</code>
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
                                        <div style={{ fontSize: "0.8rem", color: "#666", marginTop: 2 }}>
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
                                        onChange={handleFieldChange("vesselId")}
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

                                <div style={rowStyle}>
                                    <label>총 정원 (totalSpaces)</label>
                                    <input
                                        type="number"
                                        style={inputStyle}
                                        value={formData.totalSpaces ?? ""}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...(prev || {}),
                                                totalSpaces:
                                                    e.target.value === ""
                                                        ? null
                                                        : Number(e.target.value),
                                            }))
                                        }
                                    />
                                </div>

                                <div style={rowStyle}>
                                    <label>예약 가능 (availableSpaces)</label>
                                    <input
                                        type="number"
                                        style={inputStyle}
                                        value={formData.availableSpaces ?? ""}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...(prev || {}),
                                                availableSpaces:
                                                    e.target.value === ""
                                                        ? null
                                                        : Number(e.target.value),
                                            }))
                                        }
                                    />
                                </div>

                                <div style={rowStyle}>
                                    <label>홀딩 (optionSpaces)</label>
                                    <input
                                        type="number"
                                        style={inputStyle}
                                        value={formData.optionSpaces ?? ""}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...(prev || {}),
                                                optionSpaces:
                                                    e.target.value === ""
                                                        ? null
                                                        : Number(e.target.value),
                                            }))
                                        }
                                    />
                                </div>

                                <div style={rowStyle}>
                                    <label>확정 (bookedSpaces)</label>
                                    <input
                                        type="number"
                                        style={inputStyle}
                                        value={formData.bookedSpaces ?? ""}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...(prev || {}),
                                                bookedSpaces:
                                                    e.target.value === ""
                                                        ? null
                                                        : Number(e.target.value),
                                            }))
                                        }
                                    />
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

            {/* ✅ 리스트 테이블 */}
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
    borderBottom: "1px solid #ddd",
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