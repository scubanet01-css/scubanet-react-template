// src/components/TripPriceDetails.jsx
import React from "react";
import "./TripPriceDetails.css";

/**
 * ✅ item 안전 출력 헬퍼
 */
function renderItem(item) {
    if (typeof item === "string") return item;

    if (typeof item === "object" && item !== null) {
        return (
            item.name ||
            item.title ||
            item.description ||
            JSON.stringify(item)
        );
    }

    return "";
}

function TripPriceDetails({ trip }) {
    /**
     * UTS 기준:
     * - trip 내부에 포함/추가요금이 없을 수도 있음
     * - object / string 혼재 가능
     */

    const included = Array.isArray(trip?.included) ? trip.included : [];
    const mandatory = Array.isArray(trip?.mandatoryFees) ? trip.mandatoryFees : [];
    const extra = Array.isArray(trip?.extraFees) ? trip.extraFees : [];

    const hasAny =
        included.length > 0 ||
        mandatory.length > 0 ||
        extra.length > 0;

    if (!hasAny) {
        return (
            <p style={{ color: "#666", marginTop: "10px" }}>
                요금 포함/추가 비용 정보는 곧 업데이트될 예정입니다.
            </p>
        );
    }

    return (
        <div className="trip-price-section">
            <h2>Price details</h2>

            <div className="price-grid">
                {/* ✅ 포함 항목 */}
                <div className="price-column">
                    <h3>Included</h3>
                    <ul>
                        {included.length ? (
                            included.map((item, i) => (
                                <li key={i}>✔ {renderItem(item)}</li>
                            ))
                        ) : (
                            <li>포함 항목 정보 없음</li>
                        )}
                    </ul>
                </div>

                {/* ✅ 의무 추가요금 */}
                <div className="price-column">
                    <h3>Obligatory surcharges</h3>
                    <ul>
                        {mandatory.length ? (
                            mandatory.map((item, i) => (
                                <li key={i}>💲 {renderItem(item)}</li>
                            ))
                        ) : (
                            <li>필수 추가요금 없음</li>
                        )}
                    </ul>
                </div>

                {/* ✅ 선택 추가비용 */}
                <div className="price-column">
                    <h3>Extra cost</h3>
                    <ul>
                        {extra.length ? (
                            extra.map((item, i) => (
                                <li key={i}>➕ {renderItem(item)}</li>
                            ))
                        ) : (
                            <li>추가비용 없음</li>
                        )}
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default TripPriceDetails;
