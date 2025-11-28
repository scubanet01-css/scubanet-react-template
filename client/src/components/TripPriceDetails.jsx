// ✅ TripPriceDetails.jsx
import React from "react";
import "./TripPriceDetails.css";

function TripPriceDetails({ boatDetail }) {
    const price = boatDetail?.priceDetails;

    if (!price) {
        return <p>요금제 및 상세정보는 곧 추가됩니다.</p>;
    }

    return (
        <div className="trip-price-section">
            <h2>Price details</h2>
            <div className="price-grid">
                {/* ✅ 포함 항목 */}
                <div className="price-column">
                    <h3>Included</h3>
                    <ul>
                        {price.included?.length ? (
                            price.included.map((item, i) => <li key={i}>✔ {item}</li>)
                        ) : (
                            <li>포함 항목 정보 없음</li>
                        )}
                    </ul>
                </div>

                {/* ✅ 의무 추가요금 */}
                <div className="price-column">
                    <h3>Obligatory surcharges</h3>
                    <ul>
                        {price.mandatory?.length ? (
                            price.mandatory.map((item, i) => <li key={i}>💲 {item}</li>)
                        ) : (
                            <li>필수 추가요금 없음</li>
                        )}
                    </ul>
                </div>

                {/* ✅ 추가비용 */}
                <div className="price-column">
                    <h3>Extra cost</h3>
                    <ul>
                        {price.extra?.length ? (
                            price.extra.map((item, i) => <li key={i}>➕ {item}</li>)
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
