// /src/components/TripCard/TripCard.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import SeatBadges from "../SeatBadges";
import { formatCurrency } from "../../utils/formatCurrency";
import { chooseRateForDisplay } from "../../utils/tripPricing";
import { getCurrencyForTrip } from "../../utils/currencyUtils";

import { getInstructorOfferLabel } from "./tripOffers";
import { getLowestInstructorRate } from "./tripPricingInstructor";

import "./TripCard.css";

function getSeatCounts(trip) {
    const s = trip.spaces || {};
    return {
        available: s.availableSpaces || 0,
        holding: s.optionSpaces || 0,
        booked: s.bookedSpaces || 0,
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
    const currency = getCurrencyForTrip(trip);

    // -------------------------------
    // ✔ 가격 / 배지 (diver vs instructor)
    // -------------------------------
    let priceInfo;

    if (mode === "instructor") {
        // 강사용 최저가 (기존 로직 유지)
        priceInfo = getLowestInstructorRate(trip);
    } else {
        // 일반 다이버용 할인/배지 로직
        priceInfo = chooseRateForDisplay(trip, "diver");
    }

    const displayPrice = priceInfo?.displayPrice ?? priceInfo?.price ?? null;
    const strikePrice = priceInfo?.strikePrice ?? priceInfo?.parentPrice ?? null;
    const badgeFromPricing = priceInfo?.badge || null;
    const discountPercent = priceInfo?.discountPercent || null;

    // 할인 여부 (정가/할인가 비교)
    const hasDiscount =
        strikePrice &&
        displayPrice &&
        Number(displayPrice) < Number(strikePrice);

    // -------------------------------
    // ✔ instructor 전용 FOC/할인 오퍼
    // -------------------------------
    const instructorOffer =
        mode === "instructor"
            ? getInstructorOfferLabel(trip)
            : { foc: null, discount: null };

    return (
        <div className="trip-card">
            {/* ① 기본 정보 (보트명 + 상품명 + 일정) */}
            <div className="trip-info">
                <strong>{trip.boat?.name}</strong>
                <br />
                {trip.product?.name}
                <br />
                <small>
                    {trip.startDate} ~ {trip.endDate} (
                    {getNights(trip.startDate, trip.endDate)})
                </small>
            </div>

            {/* ② 오퍼/할인 배지 영역 */}
            <div className="trip-badge">

                {/* 🔥 tripPricing 에서 넘어온 텍스트 배지 (예: Early Bird, 20% OFF) */}
                {mode === "diver" && badgeFromPricing && (
                    <span className="offer-badge">{badgeFromPricing}</span>
                )}

                {/* 🔥 강사용 FOC/그룹 오퍼 배지 */}
                {mode === "instructor" && (
                    <div className="instructor-offer-wrapper">
                        {instructorOffer.foc && (
                            <span className="offer-foc-badge">
                                {instructorOffer.foc}
                            </span>
                        )}
                        {instructorOffer.discount && (
                            <span className="offer-discount-badge">
                                {instructorOffer.discount}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* ③ 가격 표시 */}
            <div className="price-box">
                {displayPrice ? (
                    <strong className="price-main">
                        {formatCurrency(displayPrice, currency)}
                    </strong>
                ) : (
                    <strong>-</strong>
                )}

                {strikePrice && (
                    <div className="price-original">
                        {formatCurrency(strikePrice, currency)}
                    </div>
                )}
            </div>

            {/* ④ 좌석 상태 */}
            <div className="status-box">
                <SeatBadges seats={seats} />
            </div>

            {/* ⑤ 버튼들 */}
            <div className="trip-actions">
                <button
                    className="btn-detail"
                    onClick={() => navigate(`/trip/${trip.id}`, { state: { trip } })}
                >
                    상세보기
                </button>

                {mode === "diver" ? (
                    <button
                        className="btn-reserve"
                        onClick={() =>
                            navigate(`/booking/${trip.id}`, { state: { trip } })
                        }
                    >
                        예약하기
                    </button>
                ) : (
                    <button
                        className="btn-reserve"
                        onClick={() =>
                            navigate(`/instructor/${trip.id}`, { state: { trip } })
                        }
                    >
                        예약하기
                    </button>
                )}
            </div>
        </div>
    );
}
