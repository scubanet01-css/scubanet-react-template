// /src/pages/InstructorConfirm.jsx
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./InstructorConfirm.css";
import { formatCurrency } from "../../utils/formatCurrency";
import { getCurrencyForTrip } from "../../utils/currencyUtils";

function InstructorConfirm() {
  const { state } = useLocation();
  const navigate = useNavigate();

  // TripDetail에서 넘겨주는 값들
  const {
    trip,
    selectedBookings = [],
    totalPrice = 0,     // ✅ FOC 적용 후 합계 (이미 할인된 금액)
    focDiscount = 0,    // ✅ FOC로 빠진 금액 전체
    focDetails = [],    // ✅ 어떤 규칙이 적용됐는지(8+1, 14+2 등)
  } = state || {};

  if (!trip) return <p>잘못된 접근입니다.</p>;

  // ⭐ Almonda → SAR, 그 외 USD
  const currency = getCurrencyForTrip(trip);

  // ✅ 날짜 포맷
  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

  // ✅ 인원 수 계산 (2인 예약이면 2명으로 세기)
  const totalGuests = selectedBookings.reduce((sum, b) => {
    if (b.occLabel?.includes("2인")) return sum + 2;
    if (b.occLabel?.includes("1인") || b.occLabel?.includes("독실"))
      return sum + 1;
    return sum;
  }, 0);

  // ✅ FOC가 적용되었는지 여부 (금액 기준)
  const hasFOC = focDiscount > 0;

  // ✅ FOC 전 원래 합계 = FOC 후 합계 + 할인액
  const baseTotal = totalPrice + focDiscount;

  // ✅ 커미션율 계산
  //  - FOC가 적용되었거나, 총 인원이 3명 이상이면 15%
  //  - 그 외에는 10%
  let commissionRate = 0.1;
  if (hasFOC || totalGuests >= 3) {
    commissionRate = 0.15;
  }

  // ✅ 커미션 및 최종 결제 금액
  const commissionAmount = totalPrice * commissionRate;
  const finalAmount = totalPrice - commissionAmount;

  console.log("🔎 Confirm 단계 state:", {
    totalGuests,
    baseTotal,
    focDiscount,
    totalPrice,
    commissionRate,
    commissionAmount,
    finalAmount,
    focDetails,
  });

  // ✅ FOC 표시용 텍스트 (8+1, 14+2 … 여러 개면 묶어서 표시)
  const focLabel =
    focDetails && focDetails.length > 0
      ? focDetails.map((f) => f.offerName || "").join(", ")
      : "Group Offer";

  return (
    <div className="instructor-confirm-container">
      <h2>📘 예약 확인</h2>

      {/* 여행 정보 */}
      <div className="trip-info">
        <h3>{trip.boat?.name}</h3>
        <p>
          {trip.product?.name} <br />
          <strong>
            {formatDate(trip.startDate)} ~ {formatDate(trip.endDate)}
          </strong>
        </p>
      </div>

      {/* 예약 내역 */}
      <div className="booking-summary">
        <h3>선택한 예약 내역</h3>
        <table className="booking-table">
          <thead>
            <tr>
              <th>객실</th>
              <th>세부 객실</th>
              <th>예약 유형</th>
              <th>금액 ({currency})</th>
            </tr>
          </thead>
          <tbody>
            {selectedBookings.map((b, i) => (
              <tr key={i}>
                <td>{b.cabin}</td>
                <td>{b.room}</td>
                <td>{b.occLabel}</td>
                <td style={{ textAlign: "right" }}>
                  {formatCurrency(b.price, currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ✅ 요약 금액 표시 영역 */}
        <div style={{ marginTop: "1rem", textAlign: "right" }}>
          {/* 1) FOC 전 원래 합계 */}
          <p style={{ marginBottom: 4 }}>
            합계: {formatCurrency(baseTotal, currency)}
          </p>

          {/* 2) FOC 할인 내역 (있을 때만) */}
          {hasFOC && (
            <>
              <p
                style={{
                  color: "#007bff",
                  fontWeight: "bold",
                  marginBottom: 4,
                }}
              >
                FOC 적용 ({focLabel}): -
                {formatCurrency(focDiscount, currency)}
              </p>
              <p style={{ fontWeight: "bold", marginBottom: 8 }}>
                FOC 적용 후 합계: {formatCurrency(totalPrice, currency)}
              </p>
            </>
          )}

          {/* 3) 강사 커미션 */}
          <p style={{ marginBottom: 4 }}>
            강사 커미션 ({(commissionRate * 100).toFixed(0)}%): -
            {formatCurrency(commissionAmount, currency)}
          </p>

          {/* 4) 최종 결제 금액 */}
          <h3 style={{ color: "#007bff", marginTop: 10 }}>
            💰 최종 결제 금액: {formatCurrency(finalAmount, currency)}
          </h3>
        </div>
      </div>

      {/* 버튼 영역 */}
      <div className="button-group">
        <button onClick={() => navigate(-1)} className="back-btn">
          ← 이전으로
        </button>

        <button
          className="confirm-btn"
          onClick={async () => {
            try {
              const invoiceData = {
                trip,
                selectedBookings,
                baseTotal,
                focDiscount,
                totalPrice, // FOC 후 합계
                focDetails,
                totalGuests,
                commissionRate,
                commissionAmount,
                finalAmount,
                currency,
                guest: { name: "Instructor", email: "scubanet@naver.com" },
              };

              console.log("📤 인보이스 전송 데이터:", invoiceData);

              const res = await fetch(
                "http://210.114.22.82:3002/api/send-invoice",
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(invoiceData),
                }
              );

              const data = await res.json();
              if (!res.ok) throw new Error(data.message || "서버 오류");

              alert("✅ 인보이스가 성공적으로 전송되었습니다!");

              navigate("/instructor/my-booking", {
                state: {
                  trip,
                  selectedBookings,
                  totalPrice,
                  focDiscount,
                  focDetails,
                  commissionRate,
                  commissionAmount,
                  finalAmount,
                  currency,
                },
              });
            } catch (err) {
              console.error("❌ 인보이스 생성 실패:", err);
              alert("인보이스 생성 또는 이메일 발송 중 오류가 발생했습니다.");
            }
          }}
        >
          예약 확정
        </button>
      </div>
    </div>
  );
}

export default InstructorConfirm;
