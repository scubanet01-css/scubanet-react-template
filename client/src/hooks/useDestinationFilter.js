// src/hooks/useDestinationFilter.js
import { useState, useEffect, useRef } from "react";
import axios from "axios";

export function useDestinationFilter() {
    const [trips, setTrips] = useState([]);
    const [countryList, setCountryList] = useState(["전체"]);
    const [destinationList, setDestinationList] = useState(["전체"]);

    const [selectedCountry, setSelectedCountry] = useState("전체");
    const [selectedDestination, setSelectedDestination] = useState("전체");

    const [loading, setLoading] = useState(true);
    const fetchedRef = useRef(false);

    useEffect(() => {
        async function loadUTS() {
            if (fetchedRef.current) return;
            fetchedRef.current = true;

            try {
                const res = await axios.get("/data/uts-trips.json");
                const list = Array.isArray(res.data) ? res.data : [];

                setTrips(list);

                // 📌 Country 목록
                const countrySet = new Set(list.map(t => t.country || "Others"));
                const sortedCountries = [...countrySet].filter(c => c !== "Others").sort();

                setCountryList(["전체", ...sortedCountries, "Others"]);

            } catch (err) {
                console.error("❌ loadUTS error:", err);
            } finally {
                setLoading(false);
            }
        }

        loadUTS();
    }, []);

    // 📌 Destination 목록 갱신
    useEffect(() => {
        if (!trips.length) {
            setDestinationList(["전체"]);
            return;
        }

        let dest = [];

        if (selectedCountry === "전체") {
            const allDest = new Set(trips.map(t => t.destination || "Others"));
            dest = [...allDest].sort();
        } else {
            const filtered = trips.filter(t => t.country === selectedCountry);
            const destSet = new Set(filtered.map(t => t.destination || "Others"));
            dest = [...destSet].sort();
        }

        setDestinationList(["전체", ...dest]);
    }, [selectedCountry, trips]);

    return {
        trips,
        loading,
        countryList,
        destinationList,
        selectedCountry,
        selectedDestination,
        setSelectedCountry,
        setSelectedDestination,
    };
}
