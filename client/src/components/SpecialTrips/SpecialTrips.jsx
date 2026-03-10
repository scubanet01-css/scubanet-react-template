import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./SpecialTrips.css";

function SpecialTrips() {
    const navigate = useNavigate();
    const [specialTrips, setSpecialTrips] = useState([]);

    useEffect(() => {
        async function loadSpecialTrips() {
            try {
                const res = await axios.get("/data/uts-trips.json");
                const raw = Array.isArray(res.data)
                    ? res.data
                    : res.data?.data || [];

                const specials = raw.filter(
                    (trip) =>
                        trip.source === "special" ||
                        trip.isSpecialTrip === true ||
                        (trip.id || "").startsWith("SPC_")
                );

                // 필요하면 출발일 순 정렬
                specials.sort((a, b) => {
                    const aTime = a.startDate ? new Date(a.startDate).getTime() : 0;
                    const bTime = b.startDate ? new Date(b.startDate).getTime() : 0;
                    return aTime - bTime;
                });

                setSpecialTrips(specials);
            } catch (err) {
                console.error("❌ SpecialTrips UTS 로드 오류:", err);
            }
        }

        loadSpecialTrips();
    }, []);

    return (
        <div className="special-container">
            {specialTrips.map((trip) => {
                const cover =
                    trip?.images?.cover ||
                    trip?.boatAssets?.assets?.hero?.url ||
                    "";

                const displayPrice =
                    trip?.pricing?.basePrice ??
                    trip?.cabins?.[0]?.ratePlans?.[0]?.price ??
                    null;

                return (
                    <div
                        key={trip.id}
                        className="special-card"
                        onClick={() => navigate(`/trip/${trip.id}`, { state: { trip } })}
                    >
                        <div className="special-image-wrapper">
                            {cover ? (
                                <img
                                    src={cover}
                                    alt={trip.title}
                                    className="special-image"
                                />
                            ) : (
                                <div className="special-image-placeholder">
                                    이미지 준비 중
                                </div>
                            )}
                        </div>

                        <div className="special-info">
                            <h3 className="special-title">{trip.title}</h3>
                            <p className="special-dates">
                                {trip.startDate} ~ {trip.endDate}
                            </p>
                            <p className="special-description">
                                {trip.destination || trip.country || ""}
                            </p>

                            <div className="special-footer">
                                <span className="special-price">
                                    {displayPrice != null ? `from $${displayPrice}` : "요금 문의"}
                                </span>

                                <button
                                    className="special-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/trip/${trip.id}`, { state: { trip } });
                                    }}
                                >
                                    자세히 보기
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default SpecialTrips;