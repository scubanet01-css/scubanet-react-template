// /src/components/Footer/Footer.jsx
import React from "react";
import { Link } from "react-router-dom";
import "./Footer.css";

function Footer() {
    return (
        <footer className="footer">

            {/* 사이트맵 */}
            <div className="footer-section sitemap">
                <h3>사이트맵</h3>
                <ul>
                    <li><Link to="/list">여행목록</Link></li>
                    <li><Link to="/instructor/list">강사프로그램</Link></li>
                    <li><Link to="/special">스쿠버넷 투어</Link></li>
                    <li><Link to="/mybooking">내 예약</Link></li>
                    <li><Link to="/login">로그인</Link></li>
                </ul>
            </div>

            {/* 회사 정보 */}
            <div className="footer-section company-info">
                <h3>스쿠버넷 여행사</h3>
                <p>대표: 최성순</p>
                <p>사업자등록번호: 000-00-00000</p>
                <p>주소: 서울시 ○○구 ○○로 123</p>
                <p>이메일: scubanet@scubanet.kr</p>
                <p>전화번호: 02-1234-5678</p>
            </div>

            {/* 증서 이미지 */}
            <div className="footer-section certificates">
                <h3>증서 / 등록증</h3>
                <div className="cert-image-wrapper">
                    <img src="/images/certificates/travel-license.jpg" alt="여행업 등록증" />
                </div>

                <div className="cert-image-wrapper">
                    <img src="/images/certificates/insurance.jpg" alt="해외여행 보증보험증서" />
                </div>
            </div>

            {/* 카피라이트 */}
            <div className="footer-bottom">
                © 2025 ScubaNet Travel. All rights reserved.
            </div>

        </footer>
    );
}

export default Footer;
