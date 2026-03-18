import React from "react";
import { Link } from "react-router-dom";

function AdminDashboard() {
    const cardStyle = {
        display: "block",
        padding: "20px",
        border: "1px solid #ddd",
        borderRadius: "12px",
        background: "#fff",
        textDecoration: "none",
        color: "#111",
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
    };

    const titleStyle = {
        margin: "0 0 8px",
        fontSize: "20px",
        fontWeight: "700",
    };

    const descStyle = {
        margin: 0,
        fontSize: "14px",
        color: "#555",
        lineHeight: 1.6,
    };

    return (
        <div style={{ padding: "24px" }}>
            <h2 style={{ marginBottom: "20px" }}>관리자 대시보드</h2>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: "16px",
                }}
            >
                <Link to="/admin/bookings" style={cardStyle}>
                    <h3 style={titleStyle}>예약 관리</h3>
                    <p style={descStyle}>
                        전체 예약 목록을 확인하고 인보이스 및 예약 상태를 관리합니다.
                    </p>
                </Link>

                <Link to="/admin/users" style={cardStyle}>
                    <h3 style={titleStyle}>회원 관리</h3>
                    <p style={descStyle}>
                        일반회원, 강사회원, 관리자 계정을 조회하고 강사 승인 상태를 관리합니다.
                    </p>
                </Link>

                <Link to="/admin/boats/assets" style={cardStyle}>
                    <h3 style={titleStyle}>보트 자산 관리</h3>
                    <p style={descStyle}>
                        보트 대표 이미지, 객실 이미지, 상세 자산 정보를 관리합니다.
                    </p>
                </Link>

                <Link to="/admin/special-trips" style={cardStyle}>
                    <h3 style={titleStyle}>스페셜 트립 관리</h3>
                    <p style={descStyle}>
                        스쿠버넷 스페셜 트립을 등록하고 수정합니다.
                    </p>
                </Link>
            </div>
        </div>
    );
}

export default AdminDashboard;