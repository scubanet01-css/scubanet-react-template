import React from "react";
import "./TripSummaryHeader.css";

function calcNights(start, end) {
    try {
        const s = new Date(start);
        const e = new Date(end);
        const diff = Math.round((e - s) / (1000 * 60 * 60 * 24));
        return Number.isFinite(diff) && diff > 0 ? diff : null;
    } catch {
        return null;
    }
}

function TripSummaryHeader({ trip, scrollTo, goBooking }) {
    // ✅ UTS 기준
    const boatName = trip?.boatName || "보트명 미등록";
    const tripName = trip?.title || "Trip 정보 없음";

    const start = trip?.startDate || "-";
    const end = trip?.endDate || "-";
    const nights = trip?.nights ?? calcNights(start, end) ?? "-";

    const depPort = trip?.departurePort?.name || "출발지 미등록";
    const arrPort = trip?.arrivalPort?.name || "도착지 미등록";

    // ✅ (UTS에 명확한 필드가 없으면 기본 문구)
    const minDiveOrReq =
        trip?.requirements ||
        trip?.minRequirements ||
        "최소 다이브 로그/자격 요건 정보 없음";

    // ✅ UTS에 최대 인원 필드가 없을 수 있으니 방어
    const maxGuests =
        trip?.maxGuests ??
        trip?.capacity ??
        trip?.spaces?.total ??
        0;

    return (
        <div className="trip-summary-header">
            <div className="trip-summary-info">
                <h1>{boatName}</h1>
                <h3>{tripName}</h3>

                <p className="trip-date">
                    {start} ~ {end} ({nights} nights)
                </p>

                <p className="trip-route">
                    {depPort} → {arrPort}
                </p>

                <div className="trip-meta">
                    <span>🧭 {minDiveOrReq}</span>
                    {Number(maxGuests) > 0 && <span>👥 최대 {maxGuests}명</span>}
                </div>
            </div>

            <div className="trip-summary-actions">
                <button className="btn-outline" onClick={() => scrollTo?.("price")}>
                    상세정보
                </button>
                <button className="btn-primary" onClick={goBooking}>
                    예약하기
                </button>
            </div>
        </div>
    );
}

export default TripSummaryHeader;
