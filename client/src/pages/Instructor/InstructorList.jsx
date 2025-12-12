// src/pages/Instructor/InstructorList.jsx
import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { isWithinInterval, startOfDay, endOfDay } from "date-fns";

import FilterBar from "../../components/Common/FilterBar";
import TripCard from "../../components/TripCard/TripCard";

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

  // -----------------------------
  // 1) UTS JSON 로드 (TripList와 동일 구조)
  // -----------------------------
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get("/data/uts-trips.json");
        const raw = Array.isArray(res.data) ? res.data : res.data.data || [];

        // 좌석 있는 상품만 (TripList 기준과 동일)
        const withSeats = raw.filter(
          (t) => Number(t?.spaces?.available || 0) > 0
        );

        setTrips(withSeats);

        // Country 목록
        const countrySet = new Set(
          withSeats.map((t) => t.country).filter(Boolean)
        );
        const sortedCountries = Array.from(countrySet).sort((a, b) =>
          a.localeCompare(b)
        );
        setCountryList(["전체", ...sortedCountries]);

        // Boat 목록
        const boatSet = new Set(
          withSeats.map((t) => t.boatName).filter(Boolean)
        );
        const sortedBoats = Array.from(boatSet).sort((a, b) =>
          a.localeCompare(b)
        );
        setBoats(["전체", ...sortedBoats]);
      } catch (err) {
        console.error("❌ InstructorList 데이터 오류:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // -----------------------------
  // 2) Country 선택에 따른 Destination 리스트 갱신
  // -----------------------------
  useEffect(() => {
    if (!trips.length) {
      setDestinationList(["전체"]);
      return;
    }

    let destSet;

    if (selectedCountry === "전체") {
      destSet = new Set(trips.map((t) => t.destination).filter(Boolean));
    } else {
      destSet = new Set(
        trips
          .filter((t) => t.country === selectedCountry)
          .map((t) => t.destination)
          .filter(Boolean)
      );
    }

    const sorted = Array.from(destSet).sort((a, b) => a.localeCompare(b));
    setDestinationList(["전체", ...sorted]);
  }, [selectedCountry, trips]);

  // -----------------------------
  // 3) Instructor 전용 필터 로직
  //    - specialType = group / discount / charter
  // -----------------------------
  const filteredTrips = useMemo(() => {
    let list = [...trips];

    // Country 필터
    if (selectedCountry !== "전체") {
      list = list.filter((t) => t.country === selectedCountry);
    }

    // Destination 필터
    if (selectedDestination !== "전체") {
      list = list.filter((t) => t.destination === selectedDestination);
    }

    // Boat 필터
    if (selectedBoat !== "전체") {
      list = list.filter((t) => t.boatName === selectedBoat);
    }

    // Instructor 전용 special 필터
    if (specialType !== "전체") {
      list = list.filter((trip) => {
        const cabins = trip.cabins || [];
        const allRates = cabins.flatMap((c) => c.ratePlans || []);
        const names = allRates.map((rp) =>
          (rp.ratePlanName || rp.name || "").toLowerCase()
        );

        // ① 그룹 / FOC / 차터 성격 (강사용 오퍼)
        if (specialType === "group") {
          return (
            allRates.some((rp) => rp.isInstructorOnly) ||
            names.some(
              (n) =>
                n.includes("group") ||
                n.includes("charter") ||
                n.includes("foc")
            )
          );
        }

        // ② 퍼블릭 할인상품 (할인율 있는 경우)
        if (specialType === "discount") {
          return allRates.some(
            (rp) => Number(rp.discountPercent || 0) > 0
          );
        }

        // ③ 풀차터 가능상품 (좌석이 전부 비어있을 때)
        if (specialType === "charter") {
          const s = trip.spaces || {};
          const available = Number(s.available || 0);
          const total =
            Number(s.available || 0) +
            Number(s.booked || 0) +
            Number(s.holding || 0);

          return total > 0 && available === total;
        }

        return true;
      });
    }

    // 날짜 필터
    if (startDate && endDate) {
      list = list.filter((t) => {
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

  // -----------------------------
  // 4) 페이지네이션
  // -----------------------------
  const totalPages = Math.ceil(filteredTrips.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentTrips = filteredTrips.slice(
    startIndex,
    startIndex + itemsPerPage
  );

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

      {currentTrips.map((trip) => (
        <TripCard key={trip.id} trip={trip} mode="instructor" />
      ))}

      {totalPages > 1 && (
        <div style={{ marginTop: 20, textAlign: "center" }}>
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            ‹
          </button>

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

          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}

export default InstructorList;
