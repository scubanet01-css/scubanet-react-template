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
    navigate("/triplist", {
      state: {
        country: country || null,
        month: month ? format(month, "yyyy-MM") : null,
      },
    });
  };

  return (
    <div className="home-container">
      <section className="hero-section">
        <div className="hero-overlay">
          <h1 className="hero-title">스쿠버넷 트레블</h1>
          <p className="hero-sub">좋은 사람들과 함께하는 여행을 만드세요!</p>

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
              <option value="Galapagos">Galapagos</option>
              <option value="Palau">Palau</option>
              <option value="Philippines">Philippines</option>
              <option value="Thailand">Thailand</option>
              <option value="Red Sea">Red Sea</option>
              <option value="Others">Others</option>
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
