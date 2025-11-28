// /src/components/SpecialTrips/SpecialTrips.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import specialTrips from "../../data/specialTrips.json";

import "./SpecialTrips.css";

function SpecialTrips() {
    const navigate = useNavigate();

    return (
        <div className="special-container">

            {specialTrips.map((trip) => (
                <div
                    key={trip.id}
                    className="special-card"
                    onClick={() => navigate(trip.link)}
                >
                    <div className="special-image-wrapper">
                        <img src={trip.image} alt={trip.title} className="special-image" />
                    </div>

                    <div className="special-info">
                        <h3 className="special-title">{trip.title}</h3>
                        <p className="special-dates">{trip.dates}</p>
                        <p className="special-description">{trip.description}</p>

                        <div className="special-footer">
                            <span className="special-price">from ${trip.price}</span>
                            <button
                                className="special-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(trip.link);
                                }}
                            >
                                자세히 보기
                            </button>
                        </div>
                    </div>
                </div>
            ))}

        </div>
    );
}

export default SpecialTrips;
