// client/src/pages/Admin/AdminSpecialTrips.jsx
import React, { useEffect, useState } from "react";

// 상황 단순화를 위해 일단 하드코딩
const API_BASE = "http://localhost:4002";

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
                setTrips(Array.isArray(data) ? data : []);
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
                        {trips.map((t) => (
                            <tr key={t.specialTripId || t.id}>
                                <td style={tdStyle}>
                                    <code>{t.specialTripId || t.id}</code>
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
                        ))}
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