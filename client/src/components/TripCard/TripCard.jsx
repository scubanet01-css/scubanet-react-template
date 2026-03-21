// src/components/TripCard/TripCard.jsx

import React from "react";
import { useNavigate } from "react-router-dom";
import SeatBadges from "../SeatBadges";
import { formatCurrency } from "../../utils/formatCurrency";
import { getCurrencyForTrip } from "../../utils/currencyUtils";
import "./TripCard.css";

// ✔ UTS JSON에서 최저가 찾기
// ✔ UTS JSON에서 최저가 찾기 (스페셜 트립 할인 반영)
function getLowestRatePlan(trip) {
    if (!trip.cabins || !trip.cabins.length) return null;

    let allRates = [];

    trip.cabins.forEach((cabin) => {
        if (Array.isArray(cabin.ratePlans)) {
            allRates.push(...cabin.ratePlans);
        }
    });

    allRates = allRates.filter((r) => r && r.price != null);

    if (!allRates.length) return null;

    // 기본 최저가 (Inseanq / 일반 트립 공통)
    let lowest = allRates.reduce((a, b) =>
        Number(a.price) < Number(b.price) ? a : b
    );

    // ⭐ 스페셜 트립이면 Admin에서 입력한 할인율 적용
    if (trip.source === "special" && trip.pricing) {
        const discountPercent =
            Number(trip.pricing.publicDiscountPercent ?? 0) || 0;

        if (discountPercent > 0) {
            const basePrice = Number(lowest.price);
            const discounted = Math.round(
                basePrice * (1 - discountPercent / 100)
            );

            lowest = {
                ...lowest,
                price: discounted,            // 화면에 보이는 가격
                parentPrice: basePrice,       // 취소선 가격
                discountPercent,              // 배지에 표시
            };
        }
    }

    return lowest;
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
// ⭐ FOC 조건 추출 (예: "5+1", "8+1", "10+2")
function getFOCLabel(trip) {
    // 1) 스페셜 트립 / Admin 저장된 FOC 우선
    const focSource =
        trip?.pricing?.instructorFOCPolicy ||
        trip?.focPolicy ||
        "";

    if (focSource) {
        const lower = String(focSource).toLowerCase();
        const match = lower.match(/(\d+\s*\+\s*\d+)/);
        if (match) {
            const numbers = match[1].replace(/\s+/g, "");
            return `${numbers} FOC`;
        }
        if (lower.includes("foc")) {
            return "FOC";
        }
    }

    // 2) 그 밖에 Inseanq ratePlan 이름에서 찾기 (기존 로직 유지)
    if (!trip.cabins) return null;

    for (const cabin of trip.cabins) {
        if (!Array.isArray(cabin.ratePlans)) continue;

        for (const rp of cabin.ratePlans) {
            const name = (rp.ratePlanName || rp.name || "").toLowerCase();

            const match = name.match(/(\d+\s*\+\s*\d+)/);
            if (match) {
                const numbers = match[1].replace(/\s+/g, "");
                return `${numbers} FOC`;
            }

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
    // ✅ ScubaNet Special Trip 여부
    const isSpecial =
        trip?.isSpecialTrip === true || trip?.source === "special";

    const rate = getLowestRatePlan(trip);

    const displayPrice = rate?.price ?? null;
    const strikePrice = rate?.parentPrice ?? null;
    const discountPercent = rate?.discountPercent ?? 0;
    const tripCurrency = getCurrencyForTrip(trip, "USD");

    const hasDiscount =
        strikePrice &&
        displayPrice &&
        Number(displayPrice) < Number(strikePrice);

    // ⭐ 인스트럭터 모드일 때만 FOC 표시
    const focLabel = mode === "instructor" ? getFOCLabel(trip) : null;

    return (
        <div className="trip-card">

            {/* 왼쪽 정보 */}
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

            {/* 오른쪽 메타 정보 묶음 */}
            <div className="trip-meta">

                {/* 배지 */}
                <div className="trip-badge">
                    <div className="instructor-offer-wrapper">
                        {isSpecial && (
                            <div className="trip-special-badge">
                                스페셜트립
                            </div>
                        )}

                        {hasDiscount && (
                            <span className="offer-badge">{discountPercent}% OFF</span>
                        )}

                        {focLabel && (
                            <span className="offer-foc-badge">{focLabel}</span>
                        )}
                    </div>
                </div>

                {/* 금액 */}
                <div className="price-box">
                    {displayPrice ? (
                        <strong className="price-main">
                            {formatCurrency(displayPrice, tripCurrency)}
                        </strong>
                    ) : (
                        <strong>-</strong>
                    )}

                    {hasDiscount && strikePrice && (
                        <div className="price-original">
                            {formatCurrency(strikePrice, tripCurrency)}
                        </div>
                    )}
                </div>

                {/* 좌석 */}
                <div className="status-box">
                    <SeatBadges seats={seats} />
                </div>

                {/* 버튼 */}
                <div className="trip-actions">
                    {/* 
<button
    className="btn-detail"
    onClick={() =>
        navigate(`/trip/${trip.id}`, { state: { trip } })
    }
>
    상세보기
</button>
*/}
                    <button
                        className={`btn-reserve ${mode === "instructor" ? "instructor" : ""}`}
                        onClick={() =>
                            navigate(
                                mode === "instructor"
                                    ? `/instructor/${trip.id}`
                                    : `/booking/${trip.id}`,
                                {
                                    state: {
                                        trip,
                                        bookingType:
                                            mode === "instructor" ? "instructor" : "general",
                                    },
                                }
                            )
                        }
                    >
                        {mode === "instructor" ? "강사예약" : "예약하기"}
                    </button>
                </div>
            </div>
        </div>
    );
}
