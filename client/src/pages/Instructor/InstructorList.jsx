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

  // ------------------------------------------------------
  // ⭐ 1. UTS Trips(JSON) 로드
  // ------------------------------------------------------
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get("/data/uts-trips.json");
        const raw = Array.isArray(res.data) ? res.data : [];

        // 좌석이 1개라도 있는 Trip만 표시
        const available = raw.filter(
          (t) => Number(t?.spaces?.available || 0) > 0
        );

        setTrips(available);

        // ------------------------------------------------------
        // Country 목록 구성
        // ------------------------------------------------------
        const sortedCountries = Array.from(
          new Set(available.map((t) => t.country).filter(Boolean))
        ).sort((a, b) => a.localeCompare(b));

        setCountryList(["전체", ...sortedCountries]);

        // ------------------------------------------------------
        // Boat 목록 구성
        // ------------------------------------------------------
        const boatSet = Array.from(
          new Set(available.map((t) => t.boatName).filter(Boolean))
        ).sort();

        setBoats(["전체", ...boatSet]);

      } catch (err) {
        console.error("❌ InstructorList 데이터 오류:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ------------------------------------------------------
  // ⭐ 2. Country 선택 시 Destination 목록 자동 구성
  // ------------------------------------------------------
  useEffect(() => {
    if (!trips.length) {
      setDestinationList(["전체"]);
      return;
    }

    let dests = [];

    if (selectedCountry === "전체") {
      dests = Array.from(
        new Set(trips.map((t) => t.destination).filter(Boolean))
      ).sort((a, b) => a.localeCompare(b));

      setDestinationList(["전체", ...dests]);
      return;
    }

    // 특정 국가 선택 시 해당 국가의 Destination만 추출
    const subset = trips.filter((t) => t.country === selectedCountry);

    dests = Array.from(
      new Set(subset.map((t) => t.destination).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));

    setDestinationList(["전체", ...dests]);
  }, [selectedCountry, trips]);

  // ------------------------------------------------------
  // ⭐ 3. 스페셜 필터 관련 로직 (UTS JSON 기준)
  // ------------------------------------------------------
  function hasSpecialGroup(trip) {
    // groups / charter / FOC 등
    return trip.cabins?.some((cb) =>
      cb.ratePlans?.some((rp) => {
        const name = (rp.ratePlanName || "").toLowerCase();
        return (
          name.includes("group") ||
          name.includes("charter") ||
          name.includes("foc") ||
          rp.isInstructorOnly === true
        );
      })
    );
  }

  function hasDiscount(trip) {
    // discount/off/promo/special 등을 포함하는 요금제 탐색
    return trip.cabins?.some((cb) =>
      cb.ratePlans?.some((rp) => {
        const name = (rp.ratePlanName || "").toLowerCase();
        return (
          name.includes("discount") ||
          name.includes("off") ||
          name.includes("promo") ||
          name.includes("special") ||
          name.includes("early")
        );
      })
    );
  }

  function isFullCharter(trip) {
    const s = trip.spaces || {};
    const total = Number(s.available + s.booked + s.holding);
    if (!total) return false;
    return s.available === total;
  }

  // ------------------------------------------------------
  // ⭐ 4. 필터링 (UTS 구조 기준으로 재작성)
  // ------------------------------------------------------
  const filteredTrips = useMemo(() => {
    let list = [...trips];

    if (selectedCountry !== "전체") {
      list = list.filter((t) => t.country === selectedCountry);
    }

    if (selectedDestination !== "전체") {
      list = list.filter((t) => t.destination === selectedDestination);
    }

    if (selectedBoat !== "전체") {
      list = list.filter((t) => t.boatName === selectedBoat);
    }

    // ⭐ Instructor 전용 스페셜 필터
    if (specialType !== "전체") {
      if (specialType === "group") {
        list = list.filter((t) => hasSpecialGroup(t));
      }
      if (specialType === "discount") {
        list = list.filter((t) => hasDiscount(t));
      }
      if (specialType === "charter") {
        list = list.filter((t) => isFullCharter(t));
      }
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

  // ------------------------------------------------------
  // ⭐ 5. 페이지네이션
  // ------------------------------------------------------
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
