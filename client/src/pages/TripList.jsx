// src/pages/TripList.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import "./TripList.css";
import {
    isWithinInterval,
    startOfDay,
    endOfDay,
    parseISO,
    isValid,
} from "date-fns";
import FilterBar from "../components/Common/FilterBar";
import TripCard from "../components/TripCard/TripCard.jsx";
import axios from "axios";

import {
    normalizeUTSTrips,
    getCountryOptions,
    getDestinationOptions,
    getBoatOptions,
} from "../utils/utsFilterNormalizer";

console.log("🚀 TripList.jsx Loaded at", new Date().toISOString());

function TripList() {
    const location = useLocation();

    const homeCountry = location.state?.country || "전체";
    const homeMonth = location.state?.month || null;

    const initialDateRange = useMemo(() => {
        if (!homeMonth) return [null, null];

        const firstDay = new Date(`${homeMonth}-01T00:00:00`);
        if (isNaN(firstDay.getTime())) return [null, null];

        return [firstDay, firstDay];
    }, [homeMonth]);

    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);

    const [selectedCountry, setSelectedCountry] = useState(homeCountry);
    const [selectedDestination, setSelectedDestination] = useState("전체");
    const [selectedBoat, setSelectedBoat] = useState("전체");
    const [specialType, setSpecialType] = useState("전체");
    const [dateRange, setDateRange] = useState(initialDateRange);
    const [currentPage, setCurrentPage] = useState(1);

    const itemsPerPage = 20;
    const [startDate, endDate] = dateRange;

    useEffect(() => {
        setSelectedCountry(homeCountry);

        if (homeMonth) {
            const firstDay = new Date(`${homeMonth}-01T00:00:00`);
            if (!isNaN(firstDay.getTime())) {
                setDateRange([firstDay, firstDay]);
            } else {
                setDateRange([null, null]);
            }
        } else {
            setDateRange([null, null]);
        }

        setSelectedDestination("전체");
        setSelectedBoat("전체");
        setCurrentPage(1);
    }, [homeCountry, homeMonth]);

    useEffect(() => {
        setLoading(true);

        axios
            .get("/data/uts-trips.json")
            .then((res) => {
                const raw = res.data;

                const list = Array.isArray(raw)
                    ? raw
                    : raw && Array.isArray(raw.data)
                        ? raw.data
                        : [];

                const specialCount = list.filter(
                    (t) =>
                        t.source === "special" ||
                        t.isSpecialTrip === true ||
                        (t.id || "").startsWith("SPC_")
                ).length;

                console.log(
                    "✅ uts-trips loaded:",
                    list.length,
                    "개 / special:",
                    specialCount,
                    "개"
                );

                setTrips(list);
            })
            .catch((err) => {
                console.error("❌ uts-trips.json 로드 오류:", err);
                setTrips([]);
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

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

    useEffect(() => {
        const suspicious = normalizedTrips.filter((t) =>
            ["The Smiling Seahorse", "Bavaria", "Sachika"].includes(t.boatName)
        );

        console.log(
            "🔎 normalizedTrips suspicious",
            suspicious.map((t) => ({
                boatName: t.boatName,
                title: t.tripName || t.title || t.routeName || "",
                rawCountry: t.country,
                normalizedCountry: t.normalizedCountry,
                normalizedDestinations: t.normalizedDestinations,
            }))
        );
    }, [normalizedTrips]);

    useEffect(() => {
        setSelectedDestination("전체");
        setSelectedBoat("전체");
    }, [selectedCountry]);

    useEffect(() => {
        setSelectedBoat("전체");
    }, [selectedDestination]);

    const filteredTrips = useMemo(() => {
        const today = startOfDay(new Date());

        let list = [...normalizedTrips].filter((t) => {
            if (!t.startDate) return false;
            const d = parseISO(t.startDate);
            return isValid(d) && d >= today;
        });

        if (selectedCountry !== "전체") {
            list = list.filter((t) => t.normalizedCountry === selectedCountry);
        }

        if (selectedDestination !== "전체") {
            list = list.filter(
                (t) =>
                    Array.isArray(t.destinationFilterKeys) &&
                    t.destinationFilterKeys.includes(selectedDestination)
            );
        }

        if (selectedBoat !== "전체") {
            list = list.filter((t) => t.boatName === selectedBoat);
        }

        if (specialType === "deal") {
            list = list.filter((trip) =>
                trip.cabins?.some((c) =>
                    c.ratePlans?.some((rp) => (rp.discountPercent || 0) > 0)
                )
            );
        }

        if (specialType === "special") {
            list = list.filter(
                (trip) =>
                    trip.source === "special" ||
                    trip.isSpecialTrip === true ||
                    (trip.id || "").startsWith("SPC_")
            );
        }

        if (startDate && endDate) {
            list = list.filter((t) => {
                const d = new Date(t.startDate);
                return isWithinInterval(d, {
                    start: startOfDay(startDate),
                    end: endOfDay(endDate),
                });
            });
        }

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
                {currentTrips.map((trip) => (
                    <TripCard key={trip.id} trip={trip} mode="diver" />
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
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    >
                        ›
                    </button>
                </div>
            )}
        </div>
    );
}

export default TripList;