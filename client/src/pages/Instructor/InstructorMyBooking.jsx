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
    totalPrice = 0,
    focDiscount = 0,
    focDetails = [],
    commissionRate = 0.1,
    commissionAmount: incomingCommissionAmount,
    finalAmount: incomingFinalAmount,
    currency: incomingCurrency = "USD",
    bookingId = null,
    invoiceFileUrl = null,
  } = state;

  const currency = incomingCurrency || getCurrencyForTrip(trip);

  const boatName =
    trip?.boat?.name ||
    trip?.boatName ||
    "정보 없음";

  const tripName =
    trip?.product?.name ||
    trip?.title ||
    trip?.tripName ||
    "정보 없음";

  const startDate = trip?.startDate || "";
  const endDate = trip?.endDate || "";

  const focAppliedTotal = Number(totalPrice || 0);
  const safeFoc = Number(focDiscount || 0);

  const rate =
    Number(commissionRate) > 1
      ? Number(commissionRate) / 100
      : Number(commissionRate || 0.1);

  const commissionAmount =
    incomingCommissionAmount != null
      ? Number(incomingCommissionAmount)
      : Math.round(focAppliedTotal * rate);

  const finalAmount =
    incomingFinalAmount != null
      ? Number(incomingFinalAmount)
      : Math.round(focAppliedTotal - commissionAmount);

  const focLabel =
    Array.isArray(focDetails) && focDetails.length > 0
      ? focDetails.map((f) => f.offerName || f.name || "").join(", ")
      : "Group Offer";

  return (
    <div className="instructor-mybooking-container">
      <h2>📘 내 예약 내역</h2>

      <div className="trip-info">
        {bookingId && (
          <p>
            <strong>예약번호:</strong> {bookingId}
          </p>
        )}

        <p>
          <strong>선박:</strong> {boatName}
        </p>

        <p>
          <strong>일정:</strong> {tripName}
        </p>

        {(startDate || endDate) && (
          <p>
            <strong>출발/도착:</strong> {startDate || "-"}
            {endDate ? ` ~ ${endDate}` : ""}
          </p>
        )}
      </div>

      <h3>예약 내역</h3>
      <ul className="booking-list">
        {selectedBookings.map((b, i) => (
          <li key={i}>
            {(b.cabinName || b.cabin || "객실")} / {(b.roomName || b.room || "세부객실")} /{" "}
            {(b.occupancyType || b.occLabel || "-")} —{" "}
            <strong>{formatCurrency(b.price, currency)}</strong>
          </li>
        ))}
      </ul>

      <div className="summary-box">
        {safeFoc > 0 && (
          <>
            <p style={{ color: "#007bff", fontWeight: "bold" }}>
              FOC 적용 ({focLabel}): -{formatCurrency(safeFoc, currency)}
            </p>

            <p>
              <strong>FOC 적용 후 판매 금액:</strong>{" "}
              {formatCurrency(focAppliedTotal, currency)}
            </p>
          </>
        )}

        <p>
          <strong>강사 커미션 ({(rate * 100).toFixed(0)}%):</strong>{" "}
          -{formatCurrency(commissionAmount, currency)}
        </p>

        <h3>
          💰 최종 결제 금액: {formatCurrency(finalAmount, currency)}
        </h3>

        {invoiceFileUrl && (
          <p style={{ marginTop: "12px" }}>
            <strong>인보이스:</strong>{" "}
            <a href={invoiceFileUrl} target="_blank" rel="noreferrer">
              인보이스 열기
            </a>
          </p>
        )}
      </div>

      <div className="button-area">
        <button
          disabled
          style={{
            backgroundColor: "#ccc",
            cursor: "not-allowed",
          }}
          title="결제 기능 준비 중입니다."
        >
          결제하기 →
        </button>

        <p style={{
          marginTop: "10px",
          fontSize: "13px",
          color: "#666"
        }}>
          현재 결제 기능은 준비 중입니다.
          예약 및 인보이스 확인까지 테스트 가능합니다.
        </p>
      </div>
    </div>
  );
}

export default InstructorMyBooking;