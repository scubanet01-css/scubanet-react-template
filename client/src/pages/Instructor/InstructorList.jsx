// src/pages/Instructor/InstructorList.jsx
import React, { useState, useEffect, useMemo } from "react";
import "./InstructorList.css";

import {
  isWithinInterval,
  startOfDay,
  endOfDay,
  parseISO,
  isValid,
} from "date-fns";

import FilterBar from "../../components/Common/FilterBar";
import TripCard from "../../components/TripCard/TripCard.jsx";
import axios from "axios";

import {
  normalizeUTSTrips,
  getCountryOptions,
  getDestinationOptions,
  getBoatOptions,
} from "../../utils/utsFilterNormalizer";

function InstructorList() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedCountry, setSelectedCountry] = useState("전체");
  const [selectedDestination, setSelectedDestination] = useState("전체");
  const [selectedBoat, setSelectedBoat] = useState("전체");
  const [specialType, setSpecialType] = useState("전체");

  const [dateRange, setDateRange] = useState([null, null]);
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 20;
  const [startDate, endDate] = dateRange;

  // -----------------------------
  // 1. 데이터 로드
  // -----------------------------
  useEffect(() => {
    async function loadInstructorTrips() {
      try {
        setLoading(true);

        const [tripRes, policyRes] = await Promise.all([
          axios.get("/data/uts-trips.json"),
          axios.get("/api/instructor-policy"),
        ]);

        const raw = tripRes.data;
        const policyMap = policyRes.data || {};

        const list = Array.isArray(raw)
          ? raw
          : raw?.data || [];

        // 강사용: 좌석 있는 것만
        const withSeats = list.filter(
          (t) => Number(t?.spaces?.available || 0) > 0
        );

        // ✅ trip마다 policy 붙이기
        const hasCommissionValue =
          policy?.commissionPercent !== undefined &&
          policy?.commissionPercent !== null &&
          policy?.commissionPercent !== "";

        const merged = withSeats.map((trip) => {
          const vesselId = trip?.vesselId || trip?.boatId || trip?.boatCode || "";
          console.log("🔥 instructor vessel check:", trip?.boatName, vesselId, policyMap[vesselId]);
          const policy = policyMap[vesselId] || null;

          return {
            ...trip,
            instructorPolicy: policy,
            pricing: {
              ...(trip.pricing || {}),
              instructorCommissionPercent: hasCommissionValue
                ? Number(policy.commissionPercent)
                : 10,
              // inseanq는 원본 FOC 유지
              // 그 외(source가 special/scubadates 등)는 policy.focPolicy 사용
              instructorFOCPolicy:
                trip?.source === "inseanq"
                  ? (trip?.pricing?.instructorFOCPolicy ||
                    trip?.focPolicy ||
                    "")
                  : (policy?.focPolicy || ""),
            },
            instructorBookingMode: policy?.bookingMode || "inquiry",
            instructorContractStatus: policy?.contractStatus || "none",
            instructorPolicyMemo: policy?.memo || "",
          };
        });

        // 숨김 정책은 여기서 제외
        const visibleTrips = merged.filter(
          (trip) => trip.instructorBookingMode !== "hidden"
        );

        setTrips(visibleTrips);
      } catch (err) {
        console.error("❌ Instructor trips load error:", err);
        setTrips([]);
      } finally {
        setLoading(false);
      }
    }

    loadInstructorTrips();
  }, []);

  // -----------------------------
  // 2. TripList와 동일 정규화
  // -----------------------------
  const normalizedTrips = useMemo(() => {
    return normalizeUTSTrips(trips);
  }, [trips]);

  const countryList = useMemo(() => {
    return getCountryOptions(normalizedTrips);
  }, [normalizedTrips]);

  const destinationList = useMemo(() => {
    return getDestinationOptions(normalizedTrips, selectedCountry);
  }, [normalizedTrips, selectedCountry]);

  const boats = useMemo(() => {
    return getBoatOptions(
      normalizedTrips,
      selectedCountry,
      selectedDestination
    );
  }, [normalizedTrips, selectedCountry, selectedDestination]);

  // -----------------------------
  // 3. 필터
  // -----------------------------
  const filteredTrips = useMemo(() => {
    const today = startOfDay(new Date());

    let list = [...normalizedTrips].filter((t) => {
      if (!t.startDate) return false;
      const d = parseISO(t.startDate);
      return isValid(d) && d >= today;
    });

    // Country
    if (selectedCountry !== "전체") {
      list = list.filter((t) => t.normalizedCountry === selectedCountry);
    }

    // Destination (핵심: destinationFilterKeys)
    if (selectedDestination !== "전체") {
      list = list.filter(
        (t) =>
          Array.isArray(t.destinationFilterKeys) &&
          t.destinationFilterKeys.includes(selectedDestination)
      );
    }

    // Boat
    if (selectedBoat !== "전체") {
      list = list.filter((t) => t.boatName === selectedBoat);
    }

    // -----------------------------
    // 🔥 Instructor 전용 필터
    // -----------------------------
    if (specialType !== "전체") {
      list = list.filter((trip) => {
        const cabins = Array.isArray(trip.cabins) ? trip.cabins : [];
        const allRates = cabins.flatMap((c) =>
          Array.isArray(c.ratePlans) ? c.ratePlans : []
        );

        const names = allRates.map((rp) =>
          String(rp.ratePlanName || rp.name || "").toLowerCase()
        );

        // 그룹 / 강사 / FOC
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

        // 할인 상품만
        // FilterBar가 deal을 넘길 수도 있으므로 deal / discount 둘 다 허용
        if (specialType === "deal" || specialType === "discount") {
          return (
            allRates.some((rp) => Number(rp.discountPercent || 0) > 0) ||
            names.some((n) => n.includes("foc"))
          );
        }

        // 풀차터
        if (specialType === "charter") {
          const s = trip.spaces || {};
          const available = Number(s.available || 0);
          const total =
            Number(s.available || 0) +
            Number(s.booked || 0) +
            Number(s.holding || 0);

          return total > 0 && available === total;
        }

        // 스페셜트립
        if (specialType === "special") {
          return (
            trip.source === "special" ||
            trip.isSpecialTrip === true ||
            (trip.id || "").startsWith("SPC_")
          );
        }

        return true;
      });
    }

    // 날짜
    if (startDate && endDate) {
      list = list.filter((t) => {
        const d = new Date(t.startDate);
        return isWithinInterval(d, {
          start: startOfDay(startDate),
          end: endOfDay(endDate),
        });
      });
    }

    // 정렬 (TripList와 동일)
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
    selectedDestination,
    selectedBoat,
    specialType,
    startDate,
    endDate,
  ]);

  // -----------------------------
  // 4. 페이지네이션
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

      <div className="triplist-cards">
        {currentTrips.map((trip) => (
          <TripCard key={trip.id} trip={trip} mode="instructor" />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="triplist-pagination">
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
                className={page === currentPage ? "active" : ""}
              >
                {page}
              </button>
            ))}

          <button
            disabled={currentPage === totalPages}
            onClick={() =>
              setCurrentPage((p) => Math.min(totalPages, p + 1))
            }
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}

export default InstructorList;