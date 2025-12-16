// src/components/TripPriceDetails.jsx
import React from "react";
import "./TripPriceDetails.css";

function TripPriceDetails({ trip }) {
    /**
     * UTS 기준:
     * - 현재 trip 안에 포함/불포함/추가요금이 구조화되어 있지 않을 수 있음
     * - 향후 확장 대비해 방어적으로 처리
     */

    const included = trip?.included || [];
    const mandatory = trip?.mandatoryFees || [];
    const extra = trip?.extraFees || [];

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
                                <li key={i}>✔ {item}</li>
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
                                <li key={i}>💲 {item}</li>
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
                                <li key={i}>➕ {item}</li>
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
