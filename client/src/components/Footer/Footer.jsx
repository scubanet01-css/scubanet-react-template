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
                    <li><Link to="/triplist">여행목록</Link></li>
                    <li><Link to="/specialtrips">스페셜트립</Link></li>
                    <li><Link to="/booking/summary">내예약</Link></li>
                    <li><Link to="/auth/login">로그인</Link></li>
                </ul>
            </div>

            {/* 회사 정보 */}
            <div className="footer-section company-info">
                <h3>(주)스쿠버넷트레블</h3>

                {/* ✅ 추가: 서비스 설명 */}
                <p className="footer-desc">
                    전 세계 리브어보드 & 다이빙 리조트 예약 플랫폼
                </p>

                {/* ✅ 추가: 베타 안내 */}
                <p className="footer-beta">
                    현재 베타(가오픈) 테스트 중입니다.
                </p>

                <p>사업자등록번호: 230-81-02952</p>
                <p>주소: 경기도 화성시 동탄영천로 101, 서영아너시티 1014호</p>
                <p>
                    이메일:{" "}
                    <a href="mailto:info@scubanet-travel.com">
                        info@scubanet-travel.com
                    </a>
                </p>
                <p>카카오톡채널: 스쿠버넷</p>
            </div>

            {/* 증서 / 등록증 */}
            <div className="footer-section certificates">
                <h3>증서 / 등록증</h3>
                <ul className="certificate-list">
                    <li>여행업등록증</li>
                    <li>해외여행 보증보험증서</li>
                </ul>
            </div>

            {/* 카피라이트 */}
            <div className="footer-bottom">
                © 2026 ScubaNet Travel. All rights reserved.
            </div>

        </footer>
    );
}

export default Footer;