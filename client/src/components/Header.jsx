import React from "react";
import { Link, useNavigate } from "react-router-dom";

function Header() {
    const navigate = useNavigate();

    const rawUser = localStorage.getItem("scubanetUser");
    const user = rawUser ? JSON.parse(rawUser) : null;

    function handleLogout() {
        localStorage.removeItem("scubanetUser");
        alert("로그아웃되었습니다.");
        navigate("/");
    }

    return (
        <header style={headerStyle}>
            <div style={innerStyle}>
                <div style={logoAreaStyle}>
                    <Link to="/" style={logoStyle}>
                        ScubaNet Travel
                    </Link>
                </div>

                <nav style={navStyle}>
                    <Link to="/" style={linkStyle}>홈</Link>
                    <Link to="/triplist" style={linkStyle}>트립리스트</Link>
                    <Link to="/specialtrips" style={linkStyle}>스페셜트립</Link>

                    {!user && (
                        <>
                            <Link to="/auth/login" style={linkStyle}>로그인</Link>
                            <Link to="/auth/register" style={primaryLinkStyle}>회원가입</Link>
                        </>
                    )}

                    {user?.role === "general" && (
                        <>
                            <Link to="/my-booking" style={linkStyle}>내 예약</Link>
                            <button onClick={handleLogout} style={logoutButtonStyle}>
                                로그아웃
                            </button>
                        </>
                    )}

                    {user?.role === "instructor" && (
                        <>
                            <Link to="/instructor" style={linkStyle}>강사페이지</Link>
                            <Link to="/instructor/my-booking" style={linkStyle}>내 예약</Link>
                            <button onClick={handleLogout} style={logoutButtonStyle}>
                                로그아웃
                            </button>
                        </>
                    )}

                    {user?.role === "admin" && (
                        <>
                            <Link to="/admin" style={linkStyle}>관리자</Link>
                            <button onClick={handleLogout} style={logoutButtonStyle}>
                                로그아웃
                            </button>
                        </>
                    )}
                </nav>
            </div>
        </header>
    );
}

const headerStyle = {
    width: "100%",
    borderBottom: "1px solid #e5e7eb",
    background: "#ffffff",
    position: "sticky",
    top: 0,
    zIndex: 100,
};

const innerStyle = {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "14px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
};

const logoAreaStyle = {
    flexShrink: 0,
};

const logoStyle = {
    fontSize: "22px",
    fontWeight: "700",
    color: "#111827",
    textDecoration: "none",
};

const navStyle = {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    flexWrap: "wrap",
};

const linkStyle = {
    textDecoration: "none",
    color: "#374151",
    fontSize: "15px",
    fontWeight: "500",
};

const primaryLinkStyle = {
    textDecoration: "none",
    color: "#ffffff",
    background: "#1d4ed8",
    padding: "8px 14px",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
};

const logoutButtonStyle = {
    border: "1px solid #d1d5db",
    background: "#fff",
    color: "#374151",
    padding: "8px 12px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
};

export default Header;