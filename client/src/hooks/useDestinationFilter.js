import { useState, useEffect } from "react";

export function useDestinationFilter() {
    const [trips, setTrips] = useState([]);
    const [countryList, setCountryList] = useState(["전체"]);
    const [destinationList, setDestinationList] = useState(["전체"]);

    const [selectedCountry, setSelectedCountry] = useState("전체");
    const [selectedDestination, setSelectedDestination] = useState("전체");

    const [loading, setLoading] = useState(true);

    // ------------------------------
    // 1) Country 리스트 구성
    // ------------------------------
    useEffect(() => {
        if (!trips.length) return;

        const countrySet = new Set(
            trips.map(t => t.country || "Others").filter(Boolean)
        );

        const sorted = [...countrySet].filter(c => c !== "Others").sort();

        setCountryList(["전체", ...sorted, "Others"]);
        setLoading(false);
    }, [trips]);

    // ------------------------------
    // 2) Destination 리스트 구성
    //    → **배열이든 문자열이든 무조건 문자열 하나씩으로 정규화**
    // ------------------------------
    useEffect(() => {
        if (!trips.length) return;

        const target =
            selectedCountry === "전체"
                ? trips
                : trips.filter(t => t.country === selectedCountry);

        const destSet = new Set();

        target.forEach(t => {
            const rawDest = t.destination;

            // CASE 1: null/undefined/빈값 → skip
            if (!rawDest) return;

            // CASE 2: 배열 형태
            if (Array.isArray(rawDest)) {
                rawDest.forEach(d => {
                    if (typeof d === "string" && d.trim()) {
                        destSet.add(d.trim());
                    }
                });
            }
            // CASE 3: 문자열 형태
            else if (typeof rawDest === "string") {
                if (rawDest.trim()) {
                    destSet.add(rawDest.trim());
                }
            }
        });

        const sortedDest = [...destSet].sort();

        setDestinationList(["전체", ...sortedDest]);
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
