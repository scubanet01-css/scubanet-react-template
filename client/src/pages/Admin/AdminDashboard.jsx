import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

function AdminDashboard() {
    const [summary, setSummary] = useState({
        totalUsers: 0,
        totalGeneralUsers: 0,
        totalInstructors: 0,
        pendingInstructors: 0,
        activeInstructors: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchSummary() {
            try {
                setLoading(true);
                const res = await axios.get("/api/admin/dashboard/summary");
                setSummary(res.data || {});
            } catch (err) {
                console.error("대시보드 요약 조회 실패:", err);
            } finally {
                setLoading(false);
            }
        }

        fetchSummary();
    }, []);

    return (
        <div style={{ padding: "24px" }}>
            <h2 style={{ marginBottom: "20px" }}>관리자 대시보드</h2>

            {/* 요약 카드 */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "16px",
                    marginBottom: "28px",
                }}
            >
                <SummaryCard
                    title="전체 회원 수"
                    value={loading ? "..." : summary.totalUsers}
                    desc="등록된 전체 회원"
                />

                <SummaryCard
                    title="일반회원 수"
                    value={loading ? "..." : summary.totalGeneralUsers}
                    desc="일반 사용자 계정"
                />

                <SummaryCard
                    title="강사회원 수"
                    value={loading ? "..." : summary.totalInstructors}
                    desc="전체 강사 계정"
                />

                <SummaryCard
                    title="강사 승인 대기"
                    value={loading ? "..." : summary.pendingInstructors}
                    desc="승인 대기 중인 강사"
                />

                <SummaryCard
                    title="승인 완료 강사"
                    value={loading ? "..." : summary.activeInstructors}
                    desc="활성화된 강사회원"
                />
            </div>

            {/* 관리 메뉴 */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: "16px",
                }}
            >
                <MenuCard
                    to="/admin/bookings"
                    title="예약 관리"
                    desc="전체 예약 목록을 확인하고 인보이스 및 예약 상태를 관리합니다."
                />

                <MenuCard
                    to="/admin/users"
                    title="회원 관리"
                    desc="일반회원, 강사회원, 관리자 계정을 조회하고 강사 승인 상태를 관리합니다."
                />

                <MenuCard
                    to="/admin/boats/assets"
                    title="보트 자산 관리"
                    desc="보트 대표 이미지, 객실 이미지, 상세 자산 정보를 관리합니다."
                />

                <MenuCard
                    to="/admin/special-trips"
                    title="스페셜 트립 관리"
                    desc="스쿠버넷 스페셜 트립을 등록하고 수정합니다."
                />
            </div>
        </div>
    );
}

function SummaryCard({ title, value, desc }) {
    return (
        <div
            style={{
                padding: "20px",
                border: "1px solid #ddd",
                borderRadius: "12px",
                background: "#fff",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            }}
        >
            <div style={{ fontSize: "14px", color: "#666", marginBottom: "8px" }}>
                {title}
            </div>
            <div style={{ fontSize: "32px", fontWeight: "700", marginBottom: "8px" }}>
                {value}
            </div>
            <div style={{ fontSize: "13px", color: "#888" }}>{desc}</div>
        </div>
    );
}

function MenuCard({ to, title, desc }) {
    return (
        <Link
            to={to}
            style={{
                display: "block",
                padding: "20px",
                border: "1px solid #ddd",
                borderRadius: "12px",
                background: "#fff",
                textDecoration: "none",
                color: "#111",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            }}
        >
            <h3
                style={{
                    margin: "0 0 8px",
                    fontSize: "20px",
                    fontWeight: "700",
                }}
            >
                {title}
            </h3>
            <p
                style={{
                    margin: 0,
                    fontSize: "14px",
                    color: "#555",
                    lineHeight: 1.6,
                }}
            >
                {desc}
            </p>
        </Link>
    );
}

export default AdminDashboard;