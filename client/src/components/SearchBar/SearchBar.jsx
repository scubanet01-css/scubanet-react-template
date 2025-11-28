// /src/components/SearchBar/SearchBar.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./SearchBar.css";

function SearchBar() {
    const navigate = useNavigate();

    const [destination, setDestination] = useState("");
    const [startDate, setStartDate] = useState("");

    const handleSearch = () => {
        navigate("/list", {
            state: {
                destination,
                startDate,
            },
        });
    };

    return (
        <div className="searchbar-container">
            {/* 목적지 */}
            <div className="search-item">
                <label>목적지</label>
                <input
                    type="text"
                    placeholder="예: Maldives, Galapagos, Komodo"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                />
            </div>

            {/* 출발일 */}
            <div className="search-item">
                <label>출발일</label>
                <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                />
            </div>

            {/* 검색 버튼 */}
            <button className="search-btn" onClick={handleSearch}>
                검색하기
            </button>
        </div>
    );
}

export default SearchBar;
