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
                <div style={logoWrapStyle}>
                    <Link to="/" style={logoStyle}>
                        <img src="/logo.png" alt="ScubaNet Travel" style={{ height: "60px", objectFit: "contain" }} />
                    </Link>
                    <span style={betaBadgeStyle}>BETA</span>
                </div>

                <nav style={navStyle}>
                    <Link to="/" style={linkStyle}>홈</Link>
                    <Link to="/triplist" style={linkStyle}>트립리스트</Link>

                    {!user && (
                        <>
                            <Link to="/auth/login" style={linkStyle}>로그인</Link>
                        </>
                    )}

                    {user?.role === "general" && (
                        <>
                            <Link to="/booking/summary" style={linkStyle}>내 예약</Link>
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

const logoWrapStyle = {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexShrink: 0,
};

const logoStyle = {
    fontSize: "22px",
    fontWeight: "700",
    color: "#111827",
    textDecoration: "none",
};

const betaBadgeStyle = {
    fontSize: "11px",
    fontWeight: "700",
    letterSpacing: "0.08em",
    color: "#1d4ed8",
    background: "#dbeafe",
    border: "1px solid #93c5fd",
    borderRadius: "999px",
    padding: "4px 8px",
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