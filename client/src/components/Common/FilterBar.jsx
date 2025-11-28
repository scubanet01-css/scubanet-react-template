// src/components/Common/FilterBar.jsx
import React from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./FilterBar.css";

function FilterBar({
    startDate,
    endDate,
    onChangeDate,

    countryList = [],
    selectedCountry,
    onChangeCountry,

    destinationList = [],
    selectedDestination,
    onChangeDestination,

    boats = [],
    selectedBoat,
    onChangeBoat,

    specialType,
    onChangeSpecialType,

    mode = "home"
}) {
    return (
        <div className="filter-bar-container">

            <div className="filter-group">
                <label>출발일</label>
                <DatePicker
                    selectsRange
                    startDate={startDate}
                    endDate={endDate}
                    onChange={onChangeDate}
                    isClearable
                    dateFormat="yyyy-MM-dd"
                />
            </div>

            <div className="filter-group">
                <label>Country</label>
                <select value={selectedCountry} onChange={(e) => onChangeCountry(e.target.value)}>
                    {countryList.map((c) => (
                        <option key={c}>{c}</option>
                    ))}
                </select>
            </div>

            <div className="filter-group">
                <label>Destination</label>
                <select
                    value={selectedDestination}
                    onChange={(e) => onChangeDestination(e.target.value)}
                >

                    {destinationList.map((d) => (
                        <option key={d}>{d}</option>
                    ))}
                </select>
            </div>

            <div className="filter-group">
                <label>리브어보드</label>
                <select value={selectedBoat} onChange={(e) => onChangeBoat(e.target.value)}>
                    {boats.map((b) => (
                        <option key={b}>{b}</option>
                    ))}
                </select>
            </div>

            <div className="filter-group">
                <label>오퍼</label>
                <select value={specialType} onChange={(e) => onChangeSpecialType(e.target.value)}>
                    <option value="전체">전체</option>
                    <option value="deal">할인 상품만</option>
                </select>
            </div>

        </div>
    );
}

export default FilterBar;
