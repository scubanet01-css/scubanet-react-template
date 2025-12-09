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
                const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
                setTrips(list);

                const countrySet = new Set(
                    list.map(t => t.country || "Others").filter(Boolean)
                );

                const sorted = [...countrySet].filter(c => c !== "Others").sort();
                setCountryList(["전체", ...sorted, "Others"]);


            } catch (err) {
                console.error("❌ loadUTS error:", err);
            } finally {
                setLoading(false);
            }
        }

        loadUTS();
    }, []);

    // ✔ destination 리스트 갱신
    useEffect(() => {
        if (!trips.length) {
            setDestinationList(["전체"]);
            return;
        }

        let targetTrips =
            selectedCountry === "전체"
                ? trips
                : trips.filter(t => t.country === selectedCountry);

        const destSet = new Set(
            targetTrips.map(t => t.destination || "Others").filter(Boolean)
        );

        const destArr = [...destSet].sort();

        setDestinationList(["전체", ...destArr]);
    }, [selectedCountry, trips]);

    return {
        trips,
        setTrips,
        loading,
        countryList,
        destinationList,
        selectedCountry,
        selectedDestination,
        setSelectedCountry,
        setSelectedDestination,
    };
}
