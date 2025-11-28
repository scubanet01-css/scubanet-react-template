// /src/components/Navbar/Navbar.jsx
import React from "react";
import { Link } from "react-router-dom";
import "./Navbar.css";

function Navbar() {
    return (
        <nav className="navbar">
            <div className="navbar-logo">ScubaNet Travel</div>

            <ul className="navbar-menu">
                <li><Link to="/triplist">여행목록</Link></li>
                <li><Link to="/instructor/list">강사프로그램</Link></li>
                <li><Link to="/specialtrips">스쿠버넷투어</Link></li>
                <li><Link to="/mybooking">내예약</Link></li>
                <li><Link to="/login">로그인</Link></li>
            </ul>
        </nav>
    );
}

export default Navbar;
