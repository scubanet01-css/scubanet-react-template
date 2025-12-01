// src/components/TripCard/TripCard.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import SeatBadges from "../SeatBadges";
import { formatCurrency } from "../../utils/formatCurrency";

import "./TripCard.css";

// ✔ UTS JSON에서 가장 저렴한 요금 찾기
function getLowestRatePlan(trip) {
    if (!trip.cabins || !trip.cabins.length) return null;

    let allRates = [];

    trip.cabins.forEach(cabin => {
        if (Array.isArray(cabin.ratePlans)) {
            allRates.push(...cabin.ratePlans);
        }
    });

    if (!allRates.length) return null;

    allRates = allRates.filter(r => r.price);

    if (!allRates.length) return null;

    const lowest = allRates.reduce((a, b) =>
        a.price < b.price ? a : b
    );

    return lowest;
}

function getSeatCounts(trip) {
    const s = trip.spaces || {};
    return {
        available: s.available || 0,
        holding: s.holding || 0,
        booked: s.booked || 0,
    };
}

function getNights(start, end) {
    try {
        const s = new Date(start);
        const e = new Date(end);
        return `${Math.round((e - s) / (1000 * 60 * 60 * 24))}박`;
    } catch {
        return "";
    }
}

export default function TripCard({ trip, mode = "diver" }) {
    const navigate = useNavigate();

    const seats = getSeatCounts(trip);

    // ✔ UTS용 가격 계산
    const rate = getLowestRatePlan(trip);
    const displayPrice = rate?.price || null;
    const strikePrice = rate?.parentPrice || null;
    const discountPercent = rate?.discountPercent || 0;

    const hasDiscount =
        strikePrice &&
        displayPrice &&
        Number(displayPrice) < Number(strikePrice);

    return (
        <div className="trip-card">
            {/* ✔ boatName + title 표시 */}
            <div className="trip-info">
                <strong>{trip.boatName}</strong>
                <br />
                {trip.title}
                <br />
                <small>
                    {trip.startDate} ~ {trip.endDate} (
                    {getNights(trip.startDate, trip.endDate)})
                </small>
            </div>

            {/* ✔ 할인 배지 */}
            <div className="trip-badge">
                {hasDiscount && (
                    <span className="offer-badge">
                        {discountPercent}% OFF
                    </span>
                )}
            </div>

            {/* ✔ 가격 */}
            <div className="price-box">
                {displayPrice ? (
                    <strong className="price-main">
                        {formatCurrency(displayPrice, "USD")}
                    </strong>
                ) : (
                    <strong>-</strong>
                )}

                {hasDiscount && (
                    <div className="price-original">
                        {formatCurrency(strikePrice, "USD")}
                    </div>
                )}
            </div>

            {/* ✔ 좌석 */}
            <div className="status-box">
                <SeatBadges seats={seats} />
            </div>

            {/* ✔ 상세보기 & 예약하기 */}
            <div className="trip-actions">
                <button
                    className="btn-detail"
                    onClick={() => navigate(`/trip/${trip.id}`, { state: { trip } })}
                >
                    상세보기
                </button>

                <button
                    className="btn-reserve"
                    onClick={() =>
                        navigate(`/booking/${trip.id}`, { state: { trip } })
                    }
                >
                    예약하기
                </button>
            </div>
        </div>
    );
}
