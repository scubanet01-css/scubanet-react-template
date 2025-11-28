// /pages/Instructor/InstructorMyBooking.jsx
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./InstructorMyBooking.css";
import { formatCurrency } from "../../utils/formatCurrency";
import { getCurrencyForTrip } from "../../utils/currencyUtils";

function InstructorMyBooking() {
  const { state } = useLocation();
  const navigate = useNavigate();

  if (!state) return <p>잘못된 접근입니다.</p>;

  const {
    trip,
    selectedBookings = [],
    totalPrice = 0,     // ⭐ 이미 FOC 적용된 최종 금액
    focDiscount = 0,
    focInfo = null,
    commissionRate = 0.1,
    currency: incomingCurrency = "USD",
  } = state;

  // Almonda = SAR 강제 적용
  const currency = getCurrencyForTrip(trip);

  // ⭐ totalPrice는 이미 FOC 이후 금액
  const focAppliedTotal = Number(totalPrice);
  const safeFoc = Number(focDiscount || 0);

  // ⭐ 커미션은 FOC 적용 후 금액 기준
  const rate = Number(commissionRate || 0.1);
  const commissionAmount = Math.round(focAppliedTotal * rate);

  // ⭐ 최종 결제 금액
  const finalAmount = Math.round(focAppliedTotal - commissionAmount);

  return (
    <div className="instructor-mybooking-container">
      <h2>📘 내 예약 내역</h2>

      {/* 여행 정보 */}
      <div className="trip-info">
        <p><strong>선박:</strong> {trip.boat?.name}</p>
        <p><strong>일정:</strong> {trip.product?.name}</p>
      </div>

      <h3>예약 내역</h3>
      <ul className="booking-list">
        {selectedBookings.map((b, i) => (
          <li key={i}>
            {b.cabin} / {b.room} / {b.occLabel} —{" "}
            <strong>{formatCurrency(b.price, currency)}</strong>
          </li>
        ))}
      </ul>

      {/* 요약 */}
      <div className="summary-box">
        {/* FOC 표시 */}
        {safeFoc > 0 && (
          <>
            <p style={{ color: "#007bff", fontWeight: "bold" }}>
              FOC 적용 ({focInfo?.name || "Group Offer"}): -
              {formatCurrency(safeFoc, currency)}
            </p>

            <p>
              <strong>FOC 적용 후 합계:</strong>{" "}
              {formatCurrency(focAppliedTotal, currency)}
            </p>
          </>
        )}

        {/* 커미션 */}
        <p>
          <strong>강사 커미션 ({(rate * 100).toFixed(0)}%):</strong>{" "}
          -{formatCurrency(commissionAmount, currency)}
        </p>

        {/* 최종 금액 */}
        <h3>
          💰 최종 결제 금액:{" "}
          {formatCurrency(finalAmount, currency)}
        </h3>
      </div>

      {/* 버튼 */}
      <div className="button-area">
        <button
          onClick={() =>
            navigate("/booking/payment", {
              state: {
                trip,
                selectedBookings: [...selectedBookings],
                totalPrice: focAppliedTotal,
                focDiscount: safeFoc,
                focInfo,
                commissionRate: rate,
                commissionAmount,
                finalAmount,
                currency,
              },
            })
          }
        >
          결제하기 →
        </button>
      </div>
    </div>
  );
}

export default InstructorMyBooking;
