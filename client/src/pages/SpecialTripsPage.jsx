// /src/pages/SpecialTripsPage.jsx
import React from "react";
import SpecialTrips from "../components/SpecialTrips/SpecialTrips";

function SpecialTripsPage() {
    return (
        <div style={{ padding: "40px 20px", maxWidth: "1200px", margin: "0 auto" }}>
            <h2 style={{ fontSize: "28px", fontWeight: "700", marginBottom: "24px" }}>
                스쿠버넷 스페셜 트립
            </h2>

            <SpecialTrips />
        </div>
    );
}

export default SpecialTripsPage;
