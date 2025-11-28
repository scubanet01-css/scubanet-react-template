// src/pages/Instructor/InstructorList.jsx
import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { isWithinInterval, startOfDay, endOfDay } from "date-fns";

import FilterBar from "../../components/Common/FilterBar";
import TripCard from "../../components/TripCard/TripCard";

import {
  normalizeTrip,
  ALL_COUNTRIES,
} from "../../utils/destinationNormalizer";

import "./InstructorList.css";

function InstructorList() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  // 필터 상태
  const [selectedCountry, setSelectedCountry] = useState("전체");
  const [selectedDestination, setSelectedDestination] = useState("전체");
  const [selectedBoat, setSelectedBoat] = useState("전체");
  const [specialType, setSpecialType] = useState("전체");
  const [dateRange, setDateRange] = useState([null, null]);

  const [countryList, setCountryList] = useState(["전체"]);
  const [destinationList, setDestinationList] = useState(["전체"]);
  const [boats, setBoats] = useState(["전체"]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [startDate, endDate] = dateRange;

  // ⭐ 데이터 로드 (전체 트립 + 정규화)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get("/data/availability-detailed.json");
        const raw = Array.isArray(res.data) ? res.data : res.data.data || [];

        const available = raw.filter(t => Number(t?.spaces?.availableSpaces || 0) > 0);

        const normalized = available.map(normalizeTrip);

        setTrips(normalized);

        // ⭐ Country 목록 구성 (Home과 동일)
        const sorted = ALL_COUNTRIES
          .filter(c => c !== "Others")
          .sort((a, b) => a.localeCompare(b));

        setCountryList(["전체", ...sorted, "Others"]);

        // ⭐ Boat 목록 구성
        const boatSet = new Set(normalized.map(t => t.boat?.name).filter(Boolean));
        setBoats(["전체", ...Array.from(boatSet).sort()]);
      } catch (err) {
        console.error("❌ InstructorList 데이터 오류:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ⭐ Country 선택 시 Destination 자동 생성 (Home 동일 로직)
  useEffect(() => {
    if (!trips.length) {
      setDestinationList(["전체"]);
      return;
    }

    let destArray = [];

    // 📌 Case 1: Country = 전체 → 전체 Destination 목록
    if (selectedCountry === "전체") {
      const allDest = new Set(trips.map(t => t.normalizedDestination));
      destArray = Array.from(allDest).sort((a, b) => a.localeCompare(b));

      // Indonesia - Other 맨 뒤
      const idx = destArray.indexOf("Indonesia - Other");
      if (idx !== -1) {
        destArray.splice(idx, 1);
        destArray.push("Indonesia - Other");
      }

      setDestinationList(["전체", ...destArray]);
      return;
    }

    // 📌 Case 2: 특정 Country 선택됨
    const filtered = trips.filter(t => t.normalizedCountry === selectedCountry);
    const destSet = new Set(filtered.map(t => t.normalizedDestination));

    destArray = Array.from(destSet).sort((a, b) => a.localeCompare(b));

    if (selectedCountry === "Indonesia") {
      const idx = destArray.indexOf("Indonesia - Other");
      if (idx !== -1) {
        destArray.splice(idx, 1);
        destArray.push("Indonesia - Other");
      }
    }

    setDestinationList(["전체", ...destArray]);
  }, [selectedCountry, trips]);


  // ⭐ 필터링 로직 (Home과 동일 + Instructor만의 special 처리)
  const filteredTrips = useMemo(() => {
    let list = [...trips];

    if (selectedCountry !== "전체") {
      list = list.filter(t => t.normalizedCountry === selectedCountry);
    }

    if (selectedDestination !== "전체") {
      list = list.filter(t => t.normalizedDestination === selectedDestination);
    }

    if (selectedBoat !== "전체") {
      list = list.filter(t => t.boat?.name === selectedBoat);
    }

    // ⭐ Instructor 전용 special 필터 적용
    if (specialType !== "전체") {
      list = list.filter(trip => {
        const plans = trip.ratePlansRetail || [];
        const names = plans.map(p => (p.name || "").toLowerCase());
        const spaces = trip.spaces || {};

        /* ① 그룹 + FOC */
        if (specialType === "group") {
          return names.some(n =>
            n.includes("group") ||
            n.includes("charter") ||
            n.includes("foc")
          );
        }

        /* ② 퍼블릭 할인상품 (Home과 동일) */
        if (specialType === "discount") {
          return names.some(n =>
            n.includes("discount") ||
            n.includes("off") ||
            n.includes("promo") ||
            n.includes("special") ||
            n.includes("early")
          );
        }

        /* ③ 풀차터 가능상품 */
        if (specialType === "charter") {
          const available = Number(spaces.availableSpaces || 0);
          const total =
            Number(spaces.totalSpaces || spaces.maxSpaces || spaces.capacity || 0);

          if (!total) return false;
          return available === total;
        }

        return true;
      });
    }


    if (startDate && endDate) {
      list = list.filter(t => {
        const d = new Date(t.startDate);
        return isWithinInterval(d, {
          start: startOfDay(startDate),
          end: endOfDay(endDate),
        });
      });
    }

    return list;
  }, [
    trips,
    selectedCountry,
    selectedDestination,
    selectedBoat,
    specialType,
    startDate,
    endDate,
  ]);

  // 페이지네이션
  const totalPages = Math.ceil(filteredTrips.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentTrips = filteredTrips.slice(startIndex, startIndex + itemsPerPage);

  if (loading) return <p>데이터 불러오는 중...</p>;

  return (
    <div className="instructor-container">
      <h2>강사 전용 예약 관리</h2>
      <p>강사 전용 가격 / FOC / 그룹할인 / 차터 오퍼가 적용됩니다.</p>

      <FilterBar
        startDate={startDate}
        endDate={endDate}
        onChangeDate={setDateRange}

        countryList={countryList}
        selectedCountry={selectedCountry}
        onChangeCountry={setSelectedCountry}

        destinationList={destinationList}
        selectedDestination={selectedDestination}
        onChangeDestination={setSelectedDestination}

        boats={boats}
        selectedBoat={selectedBoat}
        onChangeBoat={setSelectedBoat}

        specialType={specialType}
        onChangeSpecialType={setSpecialType}

        mode="instructor"
      />


      {currentTrips.map(trip => (
        <TripCard key={trip.id} trip={trip} mode="instructor" />
      ))}

      {totalPages > 1 && (
        <div style={{ marginTop: 20, textAlign: "center" }}>
          {/* 이전 페이지 */}
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          >
            ‹
          </button>

          {/* 주변 페이지만 표시 */}
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .slice(Math.max(0, currentPage - 3), currentPage + 2)
            .map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                style={{
                  margin: 3,
                  background: page === currentPage ? "#007bff" : "#f5f5f5",
                  color: page === currentPage ? "white" : "black",
                }}
              >
                {page}
              </button>
            ))}

          {/* 다음 페이지 */}
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          >
            ›
          </button>
        </div>
      )}

    </div>
  );
}

export default InstructorList;
