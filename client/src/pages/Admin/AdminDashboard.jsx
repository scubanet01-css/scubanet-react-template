import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

function AdminDashboard() {
    const [summary, setSummary] = useState({
        totalUsers: 0,
        totalGeneralUsers: 0,
        totalInstructors: 0,
        pendingInstructors: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchSummary() {
            try {
                setLoading(true);
                const res = await axios.get("/api/admin/dashboard/summary");
                setSummary({
                    totalUsers: res.data?.totalUsers || 0,
                    totalGeneralUsers: res.data?.totalGeneralUsers || 0,
                    totalInstructors: res.data?.totalInstructors || 0,
                    pendingInstructors: res.data?.pendingInstructors || 0,
                });
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

            {/* 요약 카드 - 한 줄 배치 */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                    gap: "12px",
                    marginBottom: "28px",
                }}
            >
                <CompactSummaryCard
                    label="전체회원"
                    value={loading ? "..." : `${summary.totalUsers}명`}
                />
                <CompactSummaryCard
                    label="일반회원"
                    value={loading ? "..." : `${summary.totalGeneralUsers}명`}
                />
                <CompactSummaryCard
                    label="강사회원"
                    value={loading ? "..." : `${summary.totalInstructors}명`}
                />
                <CompactSummaryCard
                    label="강사승인대기"
                    value={loading ? "..." : `${summary.pendingInstructors}명`}
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
                    to="/admin/promotions"
                    title="할인 이벤트 관리"
                    desc="프로모션을 등록하고 수정합니다."
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

function CompactSummaryCard({ label, value }) {
    return (
        <div
            style={{
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "10px",
                padding: "14px 16px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            }}
        >
            <div
                style={{
                    fontSize: "13px",
                    color: "#6b7280",
                    marginBottom: "6px",
                    fontWeight: "500",
                }}
            >
                {label}
            </div>
            <div
                style={{
                    fontSize: "24px",
                    fontWeight: "700",
                    color: "#111827",
                    lineHeight: 1.2,
                }}
            >
                {value}
            </div>
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