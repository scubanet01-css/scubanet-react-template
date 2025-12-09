import { useState, useEffect } from "react";

export function useDestinationFilter() {
    const [trips, setTrips] = useState([]);
    const [countryList, setCountryList] = useState(["전체"]);
    const [destinationList, setDestinationList] = useState(["전체"]);

    const [selectedCountry, setSelectedCountry] = useState("전체");
    const [selectedDestination, setSelectedDestination] = useState("전체");

    const [loading, setLoading] = useState(true);

    // 🟢 TripList에서 데이터가 들어오면 Country 리스트 생성
    useEffect(() => {
        if (!trips.length) return;

        const countrySet = new Set(
            trips.map(t => t.country || "Others").filter(Boolean)
        );
        const sorted = [...countrySet].filter(c => c !== "Others").sort();
        setCountryList(["전체", ...sorted, "Others"]);

        setLoading(false);
    }, [trips]);

    // 🟢 Destination 리스트 생성
    useEffect(() => {
        if (!trips.length) return;

        let target =
            selectedCountry === "전체" ? trips : trips.filter(t => t.country === selectedCountry);

        const destSet = new Set(target.map(t => t.destination || "Others").filter(Boolean));
        setDestinationList(["전체", ...[...destSet].sort()]);
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
