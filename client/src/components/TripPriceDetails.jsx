// src/components/TripPriceDetails.jsx
import React from "react";
import "./TripPriceDetails.css";

function toStringList(val) {
    // 배열/문자열/객체 혼합 입력이 와도 "문자열 배열"로 정규화
    if (!val) return [];
    if (Array.isArray(val)) {
        return val
            .map((x) => {
                if (typeof x === "string") return x;
                if (typeof x === "number") return String(x);
                if (x && typeof x === "object") return x.name || x.title || JSON.stringify(x);
                return "";
            })
            .filter(Boolean);
    }
    if (typeof val === "string") return [val];
    if (typeof val === "number") return [String(val)];
    if (typeof val === "object") return [val.name || val.title || JSON.stringify(val)];
    return [];
}

function TripPriceDetails({ trip }) {
    /**
     * ✅ UTS 기준(현재):
     * - 포함/불포함/추가요금이 trip에 구조화되어 없을 수 있음
     * - 그래서 “있으면 보여주고, 없으면 안내”만 확실히 동작하게 방어
     */

    const included = toStringList(trip?.included);
    const mandatory = toStringList(trip?.mandatoryFees || trip?.mandatoryExtraCosts || trip?.mandatory);
    const extra = toStringList(trip?.extraFees || trip?.extras || trip?.extra);

    const hasAny = included.length > 0 || mandatory.length > 0 || extra.length > 0;

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
                            included.map((item, i) => <li key={i}>✔ {item}</li>)
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
                            mandatory.map((item, i) => <li key={i}>💲 {item}</li>)
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
                            extra.map((item, i) => <li key={i}>➕ {item}</li>)
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
