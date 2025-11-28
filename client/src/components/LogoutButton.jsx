import React from "react";
import { useNavigate } from "react-router-dom";

function LogoutButton() {
    const navigate = useNavigate();

    const handleLogout = () => {
        // 💥 로그인 정보 모두 삭제
        localStorage.removeItem("role");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("email");

        // 전체 초기화(선택)
        // localStorage.clear();

        // 홈 또는 로그인 페이지로 이동
        navigate("/");
        window.location.reload(); // 🔥 상태 초기화(중요)
    };

    return (
        <button onClick={handleLogout} style={{ marginLeft: "12px" }}>
            로그아웃
        </button>
    );
}

export default LogoutButton;
