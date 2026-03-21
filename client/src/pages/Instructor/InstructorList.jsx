// src/pages/Instructor/InstructorList.jsx
import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  isWithinInterval,
  startOfDay,
  endOfDay,
  parseISO,
  isValid,
} from "date-fns";

import FilterBar from "../../components/Common/FilterBar";
import TripCard from "../../components/TripCard/TripCard";
import {
  normalizeUTSTrips,
  getCountryOptions,
  getDestinationOptions,
  getBoatOptions,
} from "../../utils/destinationUtils";

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

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [startDate, endDate] = dateRange;

  // -----------------------------
  // 1) UTS JSON 로드
  // -----------------------------
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get("/data/uts-trips.json");
        const raw = Array.isArray(res.data) ? res.data : res.data.data || [];

        const specialCount = raw.filter((t) => t.isSpecialTrip).length;
        console.log(
          "📘 [InstructorList] uts-trips loaded:",
          raw.length,
          "개 / special:",
          specialCount,
          "개"
        );

        // 강사용 리스트 정책: 좌석 있는 상품만
        const withSeats = raw.filter(
          (t) => Number(t?.spaces?.available || 0) > 0
        );

        setTrips(withSeats);
      } catch (err) {
        console.error("❌ InstructorList 데이터 오류:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // -----------------------------
  // 2) TripList와 동일한 정규화 적용
  // -----------------------------
  const normalizedTrips = useMemo(() => {
    return normalizeUTSTrips(trips);
  }, [trips]);

  const countryList = useMemo(() => {
    return getCountryOptions(normalizedTrips);
  }, [normalizedTrips]);

  const destinationOptions = useMemo(() => {
    return getDestinationOptions(normalizedTrips, selectedCountry);
  }, [normalizedTrips, selectedCountry]);

  const destinationList = useMemo(() => {
    return destinationOptions.map((opt) => opt.label);
  }, [destinationOptions]);

  const selectedDestinationKey = useMemo(() => {
    if (selectedDestination === "전체") return "전체";

    const found = destinationOptions.find((opt) => opt.label === selectedDestination);
    return found ? found.value : "전체";
  }, [destinationOptions, selectedDestination]);

  const boats = useMemo(() => {
    return getBoatOptions(
      normalizedTrips,
      selectedCountry,
      selectedDestinationKey
    );
  }, [normalizedTrips, selectedCountry, selectedDestinationKey]);

  // -----------------------------
  // 3) Instructor 전용 필터 로직
  //    - Country / Destination 은 TripList와 동일한 normalized 기준
  //    - specialType(group / discount / charter)는 강사용 유지
  // -----------------------------
  const filteredTrips = useMemo(() => {
    const today = startOfDay(new Date());

    let list = [...normalizedTrips].filter((t) => {
      if (!t.startDate) return false;
      const d = parseISO(t.startDate);
      return isValid(d) && d >= today;
    });

    // Country 필터
    if (selectedCountry !== "전체") {
      list = list.filter((t) => t.normalizedCountry === selectedCountry);
    }

    // Destination 필터
    if (selectedDestinationKey !== "전체") {
      list = list.filter(
        (t) =>
          Array.isArray(t.destinationFilterKeys) &&
          t.destinationFilterKeys.includes(selectedDestinationKey)
      );
    }

    // Boat 필터
    if (selectedBoat !== "전체") {
      list = list.filter((t) => t.boatName === selectedBoat);
    }

    // Instructor 전용 specialType
    if (specialType !== "전체") {
      list = list.filter((trip) => {
        const cabins = Array.isArray(trip.cabins) ? trip.cabins : [];
        const allRates = cabins.flatMap((c) =>
          Array.isArray(c.ratePlans) ? c.ratePlans : []
        );
        const names = allRates.map((rp) =>
          String(rp.ratePlanName || rp.name || "").toLowerCase()
        );

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

        if (specialType === "discount") {
          return (
            allRates.some((rp) => Number(rp.discountPercent || 0) > 0) ||
            names.some((n) => n.includes("foc"))
          );
        }

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

    // TripList와 동일한 정렬: 스페셜 먼저, 그 다음 출발일 빠른 순
    list.sort((a, b) => {
      const aSpecial =
        a.source === "special" ||
        a.isSpecialTrip ||
        (a.id || "").startsWith("SPC_");
      const bSpecial =
        b.source === "special" ||
        b.isSpecialTrip ||
        (b.id || "").startsWith("SPC_");

      if (aSpecial !== bSpecial) {
        return aSpecial ? -1 : 1;
      }

      if (a.startDate && b.startDate) {
        return new Date(a.startDate) - new Date(b.startDate);
      }
      return 0;
    });

    return list;
  }, [
    normalizedTrips,
    selectedCountry,
    selectedDestinationKey,
    selectedBoat,
    specialType,
    startDate,
    endDate,
  ]);

  // -----------------------------
  // 4) 페이지네이션
  // -----------------------------
  useEffect(() => {
    setCurrentPage(1);
  }, [
    selectedCountry,
    selectedDestination,
    selectedBoat,
    specialType,
    startDate,
    endDate,
  ]);

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
        onChangeCountry={(value) => {
          setSelectedCountry(value);
          setSelectedDestination("전체");
          setSelectedBoat("전체");
        }}
        destinationList={destinationList}
        selectedDestination={selectedDestination}
        onChangeDestination={(value) => {
          setSelectedDestination(value);
          setSelectedBoat("전체");
        }}
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