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

    // -----------------------------------------
    // 2) Destination 리스트 구성 (Country 기준 강제 필터)
    // -----------------------------------------
    useEffect(() => {
        if (!trips.length) return;

        const target =
            selectedCountry === "전체"
                ? trips
                : trips.filter(t => t.country === selectedCountry);

        const destSet = new Set();

        target.forEach(t => {
            // destination이 문자열이면 그대로
            if (typeof t.destination === "string") {
                if (t.destination) destSet.add(t.destination);
            }

            // destination이 배열이면 각 항목을 개별 추가
            else if (Array.isArray(t.destination)) {
                t.destination.forEach(d => {
                    if (d) destSet.add(d);
                });
            }
        });

        setDestinationList(["전체", ...Array.from(destSet).sort()]);
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
