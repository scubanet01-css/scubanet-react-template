import React from "react";

function VesselDetails({ boatDetail }) {
    if (!boatDetail) return <p>보트 상세 정보가 없습니다.</p>;

    const langs =
        (boatDetail.languagesCrew || []).filter(Boolean).join(", ") || "N/A";

    return (
        <div style={{ padding: 16 }}>
            <h3 style={{ marginBottom: 12 }}>{boatDetail.name || "Vessel Details"}</h3>

            {boatDetail.media?.[0]?.image && (
                <img
                    src={boatDetail.media[0].image}
                    alt={boatDetail.name}
                    style={{ width: "100%", borderRadius: 8, marginBottom: 12 }}
                />
            )}

            {boatDetail.boatDescription && (
                <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                    {boatDetail.boatDescription}
                </p>
            )}

            <ul style={{ marginTop: 12, lineHeight: 1.8 }}>
                <li>Cabins: {boatDetail.cabinsNumber ?? boatDetail.cabins ?? "N/A"}</li>
                <li>Max guests: {boatDetail.capacity ?? boatDetail.maxOccupancy ?? "N/A"}</li>
                <li>Crew: {boatDetail.crewSize ?? boatDetail.crew ?? "N/A"}</li>
                <li>Wi-Fi: {boatDetail.wifi ? "Yes" : "No"}</li>
                <li>Languages crew speaks: {langs}</li>
                <li>Built: {boatDetail.yearBuilt || "N/A"}</li>
                {!!boatDetail.model && <li>Model: {boatDetail.model}</li>}
                {!!boatDetail.material && <li>Material: {boatDetail.material}</li>}
                {!!boatDetail.length && <li>Length: {boatDetail.length} m</li>}
            </ul>
        </div>
    );
}

export default VesselDetails;
