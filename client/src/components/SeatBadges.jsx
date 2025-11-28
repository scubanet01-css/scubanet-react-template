// src/components/SeatBadges.jsx
import React from "react";
import "./SeatBadges.css";

/**
 * seats = { available, holding, booked }
 */
export default function SeatBadges({ seats }) {
    if (!seats) return null;

    const {
        available = 0,
        holding = 0,
        booked = 0,
    } = seats;

    return (
        <div className="seat-badges">
            <span className="seat-badge seat-available">{available}</span>
            <span className="seat-badge seat-hold">{holding}</span>
            <span className="seat-badge seat-booked">{booked}</span>
        </div>
    );
}
