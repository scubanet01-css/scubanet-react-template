import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

function AdminUsers() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [keyword, setKeyword] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");

    async function fetchUsers() {
        try {
            setLoading(true);
            const res = await axios.get("/api/admin/users");
            setUsers(res.data || []);
        } catch (err) {
            console.error("회원 목록 조회 실패:", err);
            alert(err.response?.data?.message || "회원 목록을 불러오지 못했습니다.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchUsers();
    }, []);

    async function handleStatusChange(userId, nextStatus) {
        try {
            const confirmMessage =
                nextStatus === "active"
                    ? "이 회원을 승인하시겠습니까?"
                    : `이 회원 상태를 ${nextStatus} 로 변경하시겠습니까?`;

            const ok = window.confirm(confirmMessage);
            if (!ok) return;

            const res = await axios.patch(`/api/admin/users/${userId}/status`, {
                status: nextStatus,
            });

            alert(res.data?.message || "회원 상태가 변경되었습니다.");
            fetchUsers();
        } catch (err) {
            console.error("회원 상태 변경 실패:", err);
            alert(err.response?.data?.message || "회원 상태 변경에 실패했습니다.");
        }
    }

    const filteredUsers = useMemo(() => {
        return users.filter((user) => {
            const matchesKeyword =
                !keyword.trim() ||
                user.name?.toLowerCase().includes(keyword.toLowerCase()) ||
                user.email?.toLowerCase().includes(keyword.toLowerCase()) ||
                user.phone?.includes(keyword);

            const matchesRole = roleFilter === "all" || user.role === roleFilter;
            const matchesStatus = statusFilter === "all" || user.status === statusFilter;

            return matchesKeyword && matchesRole && matchesStatus;
        });
    }, [users, keyword, roleFilter, statusFilter]);

    if (loading) {
        return <div style={{ padding: "24px" }}>회원 목록을 불러오는 중...</div>;
    }

    return (
        <div style={{ padding: "24px" }}>
            <h2 style={{ marginBottom: "20px" }}>회원 관리</h2>

            <div
                style={{
                    display: "flex",
                    gap: "12px",
                    flexWrap: "wrap",
                    marginBottom: "20px",
                }}
            >
                <input
                    type="text"
                    placeholder="이름, 이메일, 연락처 검색"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    style={{ padding: "10px", minWidth: "240px" }}
                />

                <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    style={{ padding: "10px" }}
                >
                    <option value="all">전체 역할</option>
                    <option value="general">일반회원</option>
                    <option value="instructor">강사회원</option>
                    <option value="admin">관리자</option>
                </select>

                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{ padding: "10px" }}
                >
                    <option value="all">전체 상태</option>
                    <option value="pending">pending</option>
                    <option value="active">active</option>
                    <option value="rejected">rejected</option>
                    <option value="suspended">suspended</option>
                    <option value="withdrawn">withdrawn</option>
                </select>
            </div>

            <div style={{ overflowX: "auto" }}>
                <table
                    style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        background: "#fff",
                    }}
                >
                    <thead>
                        <tr style={{ background: "#f5f7fb" }}>
                            <th style={thStyle}>이름</th>
                            <th style={thStyle}>이메일</th>
                            <th style={thStyle}>연락처</th>
                            <th style={thStyle}>국적</th>
                            <th style={thStyle}>역할</th>
                            <th style={thStyle}>상태</th>
                            <th style={thStyle}>가입일</th>
                            <th style={thStyle}>마지막 로그인</th>
                            <th style={thStyle}>강사 정보</th>
                            <th style={thStyle}>관리</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.length === 0 ? (
                            <tr>
                                <td colSpan="10" style={emptyStyle}>
                                    회원이 없습니다.
                                </td>
                            </tr>
                        ) : (
                            filteredUsers.map((user) => (
                                <tr key={user._id}>
                                    <td style={tdStyle}>{user.name || "-"}</td>
                                    <td style={tdStyle}>{user.email || "-"}</td>
                                    <td style={tdStyle}>{user.phone || "-"}</td>
                                    <td style={tdStyle}>{user.nationality || "-"}</td>
                                    <td style={tdStyle}>{user.role || "-"}</td>
                                    <td style={tdStyle}>{user.status || "-"}</td>
                                    <td style={tdStyle}>
                                        {user.createdAt ? new Date(user.createdAt).toLocaleString() : "-"}
                                    </td>
                                    <td style={tdStyle}>
                                        {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "-"}
                                    </td>
                                    <td style={tdStyle}>
                                        {user.role === "instructor" && user.instructorProfile ? (
                                            <div style={{ minWidth: "220px" }}>
                                                <div><strong>소속:</strong> {user.instructorProfile.organization || "-"}</div>
                                                <div><strong>등급:</strong> {user.instructorProfile.certificationLevel || "-"}</div>
                                                <div><strong>경력:</strong> {user.instructorProfile.experienceYears ?? "-"}</div>
                                                <div style={{ marginTop: "6px" }}>
                                                    {user.instructorProfile.ccardFileUrl ? (
                                                        <a
                                                            href={user.instructorProfile.ccardFileUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                        >
                                                            C카드 보기
                                                        </a>
                                                    ) : (
                                                        "-"
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            "-"
                                        )}
                                    </td>
                                    <td style={tdStyle}>
                                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                            {user.status === "pending" && (
                                                <>
                                                    <button
                                                        onClick={() => handleStatusChange(user._id, "active")}
                                                        style={approveBtn}
                                                    >
                                                        승인
                                                    </button>
                                                    <button
                                                        onClick={() => handleStatusChange(user._id, "rejected")}
                                                        style={rejectBtn}
                                                    >
                                                        거절
                                                    </button>
                                                </>
                                            )}

                                            {user.status !== "suspended" && (
                                                <button
                                                    onClick={() => handleStatusChange(user._id, "suspended")}
                                                    style={suspendBtn}
                                                >
                                                    정지
                                                </button>
                                            )}

                                            {user.status !== "active" && (
                                                <button
                                                    onClick={() => handleStatusChange(user._id, "active")}
                                                    style={normalBtn}
                                                >
                                                    활성화
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

const thStyle = {
    border: "1px solid #ddd",
    padding: "10px",
    textAlign: "left",
    fontSize: "14px",
};

const tdStyle = {
    border: "1px solid #ddd",
    padding: "10px",
    verticalAlign: "top",
    fontSize: "14px",
};

const emptyStyle = {
    border: "1px solid #ddd",
    padding: "24px",
    textAlign: "center",
};

const approveBtn = {
    padding: "6px 10px",
    border: "none",
    background: "#1d4ed8",
    color: "#fff",
    cursor: "pointer",
    borderRadius: "6px",
};

const rejectBtn = {
    padding: "6px 10px",
    border: "none",
    background: "#dc2626",
    color: "#fff",
    cursor: "pointer",
    borderRadius: "6px",
};

const suspendBtn = {
    padding: "6px 10px",
    border: "none",
    background: "#6b7280",
    color: "#fff",
    cursor: "pointer",
    borderRadius: "6px",
};

const normalBtn = {
    padding: "6px 10px",
    border: "none",
    background: "#059669",
    color: "#fff",
    cursor: "pointer",
    borderRadius: "6px",
};

export default AdminUsers;