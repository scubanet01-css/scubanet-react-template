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
    const [selectedTrip, setSelectedTrip] = useState(null); // ✅ 선택된 트립

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

                // ✅ 첫 번째 항목 자동 선택
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

    return (
        <div style={{ padding: "20px" }}>
            <h2>스페셜 트립 관리 (읽기 전용 1단계)</h2>
            <p style={{ color: "#666", marginBottom: 16 }}>
                /var/scubanet-data/special-trips.json 내용을 API(4002)에서 불러와서 표시합니다.
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

            {/* ✅ 선택된 스페셜 트립 상세 (테이블 위에 표시) */}
            {selectedTrip && (
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
                        이 영역은 다음 단계에서 <strong>입력/수정 폼</strong>으로 확장할 예정입니다.
                        지금은 선택된 행의 데이터를 그대로 확인하는 용도입니다.
                    </p>

                    <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                        {/* 왼쪽: 요약 정보 */}
                        <div style={{ flex: 1, minWidth: 260 }}>
                            <div>
                                <strong>ID: </strong>
                                <code>{selectedTrip.specialTripId || selectedTrip.id}</code>
                            </div>
                            <div>
                                <strong>타이틀: </strong>
                                {selectedTrip.title}
                            </div>
                            <div>
                                <strong>지역/목적지: </strong>
                                {selectedTrip.region} / {selectedTrip.destination}
                            </div>
                            <div>
                                <strong>출발~종료: </strong>
                                {formatDate(selectedTrip.startDate)} ~{" "}
                                {formatDate(selectedTrip.endDate)} ({selectedTrip.nights}박)
                            </div>
                            <div>
                                <strong>정원/가용/옵션/예약: </strong>
                                {selectedTrip.totalSpaces} / {selectedTrip.availableSpaces} /{" "}
                                {selectedTrip.optionSpaces} / {selectedTrip.bookedSpaces}
                            </div>
                            <div>
                                <strong>판매 모드: </strong>
                                {Array.isArray(selectedTrip.salesMode)
                                    ? selectedTrip.salesMode.join(", ")
                                    : ""}
                            </div>
                            <div>
                                <strong>FOC 정책: </strong>
                                {selectedTrip.focPolicy}
                            </div>
                            <div>
                                <strong>상태: </strong>
                                {selectedTrip.status}
                            </div>
                            <div>
                                <strong>내부 메모: </strong>
                                {selectedTrip.internalNote}
                            </div>
                        </div>

                        {/* 오른쪽: raw JSON */}
                        <div style={{ flex: 1, minWidth: 260 }}>
                            <strong>raw JSON</strong>
                            <pre
                                style={{
                                    marginTop: 8,
                                    maxHeight: 260,
                                    overflow: "auto",
                                    fontSize: "0.8rem",
                                    backgroundColor: "#fff",
                                    border: "1px solid #eee",
                                    borderRadius: 4,
                                    padding: 8,
                                }}
                            >
                                {JSON.stringify(selectedTrip, null, 2)}
                            </pre>
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