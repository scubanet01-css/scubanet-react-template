import React from "react";
import "./TripSummaryHeader.css";

function TripSummaryHeader({ trip, boatDetail, navigate, scrollTo, goBooking }) {
    // ✅ 데이터 방어 + 가공
    const boatName = trip?.boat?.name || "보트명 미등록";
    const tripName = trip?.product?.name || "Trip 정보 없음";
    const start = trip?.startDate || "-";
    const end = trip?.endDate || "-";
    const depPort = trip?.departurePort?.name || "출발지 미등록";
    const arrPort = trip?.arrivalPort?.name || "도착지 미등록";
    const nights = trip?.nights ?? 7;
    const maxGuests = boatDetail?.capacity || boatDetail?.maxOccupancy || 0;

    // ✅ 최소 다이브/자격 요건 (데이터에 있으면 교체)
    const minDiveOrReq =
        trip?.requirements ||
        boatDetail?.additionalInfo ||
        "최소 다이브 로그/자격 요건 정보 없음";

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
                    {maxGuests > 0 && <span>👥 최대 {maxGuests}명</span>}
                </div>
            </div>

            <div className="trip-summary-actions">
                <button className="btn-outline" onClick={() => scrollTo("price")}>
                    상세정보
                </button>
                <button
                    className="btn-primary"
                    onClick={goBooking}
                >
                    예약하기
                </button>
            </div>
        </div>
    );
}

export default TripSummaryHeader;
