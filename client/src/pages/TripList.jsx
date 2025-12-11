// src/pages/TripList.jsx
import React, { useState, useEffect, useMemo } from "react";
import "./TripList.css";
import { isWithinInterval, startOfDay, endOfDay } from "date-fns";
import FilterBar from "../components/Common/FilterBar";
import TripCard from "../components/TripCard/TripCard.jsx";
import { useDestinationFilter } from "../hooks/useDestinationFilter";
import axios from "axios";


function TripList() {
    console.log("🔥 destinationList =", destinationList);
    console.log("🔥 TripList 렌더링됨");
    const {
        trips,
        setTrips,
        loading,
        countryList,
        destinationList,
        selectedCountry,
        selectedDestination,
        setSelectedCountry,
        setSelectedDestination
    } = useDestinationFilter();

    // TripList 전용 필터
    const [selectedBoat, setSelectedBoat] = useState("전체");
    const [specialType, setSpecialType] = useState("전체");
    const [dateRange, setDateRange] = useState([null, null]);
    const [boats, setBoats] = useState(["전체"]);
    const [currentPage, setCurrentPage] = useState(1);

    const itemsPerPage = 20;
    const [startDate, endDate] = dateRange;

    // 🚤 Boat 목록 계산 (UTS boatName 기반)
    useEffect(() => {
        console.log("📌 API 요청 시작");
        axios.get("/data/uts-trips.json")


            .then(res => {
                console.log("📌 API 응답 원본:", res);
                console.log("📦 res.data:", res.data);
                console.log("📦 res.data.data:", res.data?.data);
                setTrips(Array.isArray(res.data) ? res.data : []);
            })
            .catch(err => {
                console.error("❌ API 요청 오류:", err);
            });
    }, []);

    useEffect(() => {
        if (!trips.length) return;
        const boatSet = new Set(trips.map(t => t.boatName).filter(Boolean));
        setBoats(["전체", ...Array.from(boatSet).sort()]);
    }, [trips]);

    // 🔍 필터링 로직
    const filteredTrips = useMemo(() => {
        let list = [...trips];

        // Country
        if (selectedCountry !== "전체") {
            list = list.filter(t => t.country === selectedCountry);
        }

        // Destination
        if (selectedDestination !== "전체") {
            list = list.filter(t => {
                return Array.isArray(t.destination)
                    ? t.destination.includes(selectedDestination)
                    : t.destination === selectedDestination;
            });

        }

        // Boat
        if (selectedBoat !== "전체") {
            list = list.filter(t => t.boatName === selectedBoat);
        }

        // 🔥 할인 상품만 (UTS 기반)
        if (specialType === "deal") {
            list = list.filter(trip =>
                trip.cabins?.some(c =>
                    c.ratePlans?.some(rp => (rp.discountPercent || 0) > 0)
                )
            );
        }

        // 📅 날짜 필터
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
        endDate
    ]);

    // 페이지네이션
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedCountry, selectedDestination, selectedBoat, specialType, startDate, endDate]);

    const totalPages = Math.ceil(filteredTrips.length / itemsPerPage) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentTrips = filteredTrips.slice(startIndex, startIndex + itemsPerPage);

    if (loading) return <p>데이터 불러오는 중...</p>;

    return (
        <div className="triplist-container">
            <h2 className="triplist-title">예약 가능한 리브어보드</h2>

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
                mode="list"
            />

            <div className="triplist-cards">
                {currentTrips.map(trip => (
                    <TripCard key={trip.id} trip={trip} mode="diver" />
                ))}
            </div>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
                <div className="triplist-pagination">
                    <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    >
                        ‹
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .slice(Math.max(0, currentPage - 3), currentPage + 2)
                        .map(page => (
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
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    >
                        ›
                    </button>
                </div>
            )}
        </div>
    );
}

export default TripList;
