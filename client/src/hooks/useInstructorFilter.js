import { useState, useEffect } from "react";
import axios from "axios";
import { normalizeTrip } from "../utils/destinationNormalizer";

export function useInstructorFilter() {
    const [trips, setTrips] = useState([]);
    const [countryList, setCountryList] = useState(["전체"]);
    const [destinationList, setDestinationList] = useState(["전체"]);

    const [selectedCountry, setSelectedCountry] = useState("전체");
    const [selectedDestination, setSelectedDestination] = useState("전체");

    const [boats, setBoats] = useState(["전체"]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await axios.get("/data/availability-detailed.json");
                const raw = Array.isArray(res.data) ? res.data : res.data.data || [];

                // 강사용 rate plan 있는 것만
                const instructor = raw.filter((t) =>
                    (t.ratePlansRetail || []).some((p) =>
                        /(group|charter|foc|dema)/i.test(p.name || "")
                    )
                );

                // 정규화
                const normalized = instructor.map(normalizeTrip);
                setTrips(normalized);

                // 국가 리스트
                const countrySet = new Set(normalized.map(t => t.normalizedCountry));
                const sorted = [...countrySet].filter(c => c !== "Others").sort();
                setCountryList(["전체", ...sorted, "Others"]);

                // 보트 리스트
                const boatSet = new Set(normalized.map(t => t.boat?.name).filter(Boolean));
                setBoats(["전체", ...Array.from(boatSet).sort()]);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, []);

    /** ------------------------------------------------------------------
     *  📌 Destination 목록 생성 (Home과 동일한 구조)
     * ------------------------------------------------------------------ */
    useEffect(() => {
        if (!trips.length) {
            setDestinationList(["전체"]);
            return;
        }

        let destArray = [];

        // Case 1: Country = 전체 → 전체 Destination 목록 활성화
        if (selectedCountry === "전체") {
            const allDest = new Set(trips.map(t => t.normalizedDestination));
            destArray = Array.from(allDest).sort((a, b) => a.localeCompare(b));

            // Indonesia Others 맨 뒤
            const idx = destArray.indexOf("Indonesia - Other");
            if (idx !== -1) {
                destArray.splice(idx, 1);
                destArray.push("Indonesia - Other");
            }

            setDestinationList(["전체", ...destArray]);
            return;
        }

        // Case 2: Country 선택됨 → 해당 Country의 Destination만 표시
        const filtered = trips.filter(t => t.normalizedCountry === selectedCountry);
        const destSet = new Set(filtered.map(t => t.normalizedDestination));

        destArray = Array.from(destSet).sort((a, b) => a.localeCompare(b));

        if (selectedCountry === "Indonesia") {
            const idx = destArray.indexOf("Indonesia - Other");
            if (idx !== -1) {
                destArray.splice(idx, 1);
                destArray.push("Indonesia - Other");
            }
        }

        setDestinationList(["전체", ...destArray]);
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
        boats
    };
}
