import React from "react";
import "./TripSummaryHeader.css";

function TripSummaryHeader({ trip, boatDetail, navigate, scrollTo, goBooking }) {
    // ===============================
    // ✅ UTS 기준 데이터 매핑
    // ===============================

    // 보트명
    const boatName =
        trip?.boatName ||
        boatDetail?.name ||
        "보트명 미등록";

    // 트립명 / 루트명
    const tripName =
        trip?.title ||
        trip?.routeName ||
        "Trip 정보 없음";

    // 일정
    const start = trip?.startDate || "-";
    const end = trip?.endDate || "-";

    // 박수
    const nights =
        trip?.nights ??
        (trip?.startDate && trip?.endDate
            ? Math.round(
                (new Date(trip.endDate) - new Date(trip.startDate)) /
                (1000 * 60 * 60 * 24)
            )
            : "-");

    // 출발 / 도착 항구
    const depPort =
        trip?.departurePortName ||
        trip?.departurePort ||
        boatDetail?.departurePort ||
        "출발지 미등록";

    const arrPort =
        trip?.arrivalPortName ||
        trip?.arrivalPort ||
        boatDetail?.arrivalPort ||
        "도착지 미등록";

    // 최대 인원
    const maxGuests =
        trip?.maxGuests ||
        boatDetail?.capacity ||
        boatDetail?.maxOccupancy ||
        0;

    // 최소 다이빙 요건 / 특이사항
    const minDiveOrReq =
        trip?.requirements ||
        boatDetail?.requirements ||
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
                <button
                    className="btn-outline"
                    onClick={() => scrollTo("price")}
                >
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
