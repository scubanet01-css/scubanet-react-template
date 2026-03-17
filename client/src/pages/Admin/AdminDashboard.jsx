import React from "react";
import { useNavigate } from "react-router-dom";

function AdminDashboard() {
    const navigate = useNavigate();

    const cardStyle = {
        border: "1px solid #ddd",
        borderRadius: "12px",
        padding: "20px",
        background: "#fff",
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        cursor: "pointer",
    };

    const titleStyle = {
        margin: 0,
        fontSize: "20px",
        fontWeight: "700",
    };

    const descStyle = {
        marginTop: "8px",
        color: "#555",
        lineHeight: 1.5,
    };

    return (
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "24px" }}>
            <h2 style={{ marginBottom: "8px" }}>관리자 페이지</h2>
            <p style={{ color: "#666", marginBottom: "24px" }}>
                보트 자산, 스페셜 트립, 예약 내역을 여기서 관리합니다.
            </p>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                    gap: "16px",
                }}
            >
                <div
                    style={cardStyle}
                    onClick={() => navigate("/admin/boats/assets")}
                >
                    <h3 style={titleStyle}>보트 자산 관리</h3>
                    <p style={descStyle}>
                        선박 대표 이미지, 객실 사진, 기타 자산을 관리합니다.
                    </p>
                </div>

                <div
                    style={cardStyle}
                    onClick={() => navigate("/admin/special-trips")}
                >
                    <h3 style={titleStyle}>스페셜 트립 관리</h3>
                    <p style={descStyle}>
                        스쿠버넷 스페셜 트립 생성, 수정, 가격 및 FOC 정책을 관리합니다.
                    </p>
                </div>

                <div
                    style={cardStyle}
                    onClick={() => navigate("/admin/bookings")}
                >
                    <h3 style={titleStyle}>예약 관리</h3>
                    <p style={descStyle}>
                        일반 예약과 강사 예약을 확인하고, 인보이스와 예약 상태를 검토합니다.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default AdminDashboard;