// src/pages/Home.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format } from "date-fns";
import SpecialTrips from "../components/SpecialTrips/SpecialTrips";
import Footer from "../components/Footer/Footer";

function Home() {
  const navigate = useNavigate();

  // 간단 검색 필드
  const [country, setCountry] = useState("전체");
  const [month, setMonth] = useState(null);

  // 검색 버튼 → TripList 초기 필터 전달
  const handleSearch = () => {
    const payload = {
      country: country || null,
      month: month ? format(month, "yyyy-MM") : null,
    };

    console.log("HOME SEARCH payload:", payload);

    navigate("/triplist", {
      state: payload,
    });
  };

  return (
    <div className="home-container">
      <section className="hero-section">
        <div className="hero-overlay">
          <h1 className="hero-title">ScubaNet Travel</h1>

          <p className="hero-sub">
            전 세계 리브어보드 & 다이빙 리조트 예약 플랫폼
          </p>

          <p className="hero-beta">
            현재 베타(가오픈) 테스트 중입니다. 일부 기능은 제한될 수 있으나,
            예약 및 문의는 정상적으로 이용 가능합니다.
          </p>

          <p className="hero-desc">
            스쿠버넷은 30년 다이빙 전문 경험을 바탕으로 검증된 리브어보드와
            다이빙 여행을 제공합니다.
          </p>

          <p className="hero-contact">
            베타 테스트 리뷰를 SNS에 공유하고, 오류 신고를 해주시면 추첨을 통해 최고급 리브어보드 이용권을 드립니다.
            오류 발견 또는 예약 문의는 현장 스태프 또는 아래 문의처로 연락해주세요.
          </p>

          {/* Quick Search */}
          <div className="quick-search">
            {/* 나라 선택 */}
            <select
              className="qs-input"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            >
              <option value="전체">전체</option>
              <option value="Indonesia">Indonesia</option>
              <option value="Maldives">Maldives</option>
              <option value="Mexico">Mexico</option>
              <option value="Ecuador">Galapagos</option>
              <option value="Palau">Palau</option>
              <option value="Philippines">Philippines</option>
              <option value="Thailand">Thailand</option>
              <option value="Egypt">Red Sea</option>
            </select>

            {/* 출발월 선택 */}
            <DatePicker
              selected={month}
              onChange={(date) => setMonth(date)}
              dateFormat="yyyy-MM"
              showMonthYearPicker
              className="qs-input"
              placeholderText="출발월 선택"
            />

            {/* Search button */}
            <button className="qs-btn" onClick={handleSearch}>
              검색하기
            </button>
          </div>
        </div>
      </section>

      <section className="special-section">
        <h2 className="section-title">스페셜 리브어보드 트립</h2>
        <SpecialTrips />
      </section>

      <Footer />
    </div>
  );
}

export default Home;