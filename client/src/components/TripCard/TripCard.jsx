// src/components/TripCard/TripCard.jsx

import React from "react";
import { useNavigate } from "react-router-dom";
import SeatBadges from "../SeatBadges";
import { formatCurrency } from "../../utils/formatCurrency";
import "./TripCard.css";

// ✔ UTS JSON에서 최저가 찾기
function getLowestRatePlan(trip) {
    if (!trip.cabins || !trip.cabins.length) return null;

    let allRates = [];

    trip.cabins.forEach(cabin => {
        if (Array.isArray(cabin.ratePlans)) {
            allRates.push(...cabin.ratePlans);
        }
    });

    allRates = allRates.filter(r => r.price != null);

    if (!allRates.length) return null;

    return allRates.reduce((a, b) => (a.price < b.price ? a : b));
}

// ✔ 좌석 계산
function getSeatCounts(trip) {
    const s = trip.spaces || {};
    return {
        available: s.available || 0,
        holding: s.holding || 0,
        booked: s.booked || 0,
    };
}

// ✔ 박수 계산
function getNights(start, end) {
    try {
        const s = new Date(start);
        const e = new Date(end);
        return `${Math.round((e - s) / (1000 * 60 * 60 * 24))}박`;
    } catch {
        return "";
    }
}

// ⭐ NEW: FOC 조건 추출 (예: "5+1", "8+1", "10+2")
function getFOCLabel(trip) {
    if (!trip.cabins) return null;

    for (const cabin of trip.cabins) {
        if (!Array.isArray(cabin.ratePlans)) continue;

        for (const rp of cabin.ratePlans) {
            const name = (rp.ratePlanName || rp.name || "").toLowerCase();

            // 5+1 패턴 탐지
            const match = name.match(/(\d+\s*\+\s*\d+)/);
            if (match) {
                return match[1].replace(/\s+/g, ""); // 공백 제거한 5+1
            }

            // "foc" 단독 사용인 경우
            if (name.includes("foc")) {
                return "FOC";
            }
        }
    }
    return null;
}

export default function TripCard({ trip, mode = "public" }) {
    const navigate = useNavigate();
    const seats = getSeatCounts(trip);

    const rate = getLowestRatePlan(trip);

    const displayPrice = rate?.price ?? null;
    const strikePrice = rate?.parentPrice ?? null;
    const discountPercent = rate?.discountPercent ?? 0;

    const hasDiscount =
        strikePrice &&
        displayPrice &&
        Number(displayPrice) < Number(strikePrice);

    // ⭐ 인스트럭터 모드일 때만 FOC 표시
    const focLabel = mode === "instructor" ? getFOCLabel(trip) : null;

    return (
        <div className="trip-card">

            {/* ✔ 보트명 + 상품명 */}
            <div className="trip-info">
                <strong>{trip.boatName}</strong>
                <br />
                {trip.title}
                <br />
                <small>
                    {trip.startDate} ~ {trip.endDate} (
                    {getNights(trip.startDate, trip.endDate)} )
                </small>
            </div>

            {/* ✔ 할인 + FOC 배지 */}
            <div className="trip-badge instructor-offer-wrapper">

                {hasDiscount && (
                    <span className="offer-badge">{discountPercent}% OFF</span>
                )}

                {focLabel && (
                    <span className="offer-foc-badge">{focLabel}</span>
                )}
            </div>

            {/* ✔ 금액 */}
            <div className="price-box">
                {displayPrice ? (
                    <strong className="price-main">
                        {formatCurrency(displayPrice, "USD")}
                    </strong>
                ) : (
                    <strong>-</strong>
                )}

                {hasDiscount && strikePrice && (
                    <div className="price-original">
                        {formatCurrency(strikePrice, "USD")}
                    </div>
                )}
            </div>

            {/* ✔ 좌석 */}
            <div className="status-box">
                <SeatBadges seats={seats} />
            </div>

            {/* ✔ 버튼 */}
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
