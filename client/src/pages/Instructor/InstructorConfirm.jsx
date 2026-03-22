import React, { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./InstructorConfirm.css";
import { formatCurrency } from "../../utils/formatCurrency";
import { getCurrencyForTrip } from "../../utils/currencyUtils";

function InstructorConfirm() {
  const { state } = useLocation();
  const navigate = useNavigate();

  const {
    trip,
    selectedBookings = [],
    totalPrice = 0,      // ✅ FOC 적용 후 합계
    focDiscount = 0,     // ✅ FOC 할인액
    focDetails = [],     // ✅ FOC 상세 구조
    currency: incomingCurrency,
  } = state || {};

  if (!trip) return <p>잘못된 접근입니다.</p>;

  const currency = incomingCurrency || getCurrencyForTrip(trip);

  const tripName =
    trip?.product?.name ||
    trip?.title ||
    trip?.tripName ||
    "정보 없음";

  const boatName =
    trip?.boat?.name ||
    trip?.boatName ||
    "정보 없음";

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  // ✅ 총 인원 계산
  const totalGuests = useMemo(() => {
    return selectedBookings.reduce((sum, b) => {
      return sum + Number(b?.peopleCount || 1);
    }, 0);
  }, [selectedBookings]);

  // ✅ FOC 전 원래 합계
  const baseTotal = useMemo(() => {
    return Number(totalPrice || 0) + Number(focDiscount || 0);
  }, [totalPrice, focDiscount]);

  // ✅ 커미션율
  // 현재 기존 기준 유지:
  // - FOC 적용되었거나, 총 인원 3명 이상이면 15%
  // - 아니면 10%
  const commissionRate = useMemo(() => {
    const hasFOC = Number(focDiscount || 0) > 0;
    if (hasFOC || totalGuests >= 3) return 0.15;
    return 0.1;
  }, [focDiscount, totalGuests]);

  // ✅ 커미션 금액
  const commissionAmount = useMemo(() => {
    return Math.round(Number(totalPrice || 0) * commissionRate);
  }, [totalPrice, commissionRate]);

  // ✅ 최종 결제 금액
  const finalAmount = useMemo(() => {
    return Math.round(Number(totalPrice || 0) - commissionAmount);
  }, [totalPrice, commissionAmount]);

  const focLabel =
    Array.isArray(focDetails) && focDetails.length > 0
      ? focDetails.map((f) => f.offerName || f.name || "").join(", ")
      : "Group Offer";

  const handleConfirm = async () => {
    try {
      const invoiceData = {
        trip,
        selectedBookings,
        totalPrice,         // ✅ FOC 적용 후 판매 금액
        focDiscount,
        focDetails,
        commissionRate: Number((commissionRate * 100).toFixed(0)), // 서버는 % 숫자 형태로 받게 맞춤
        commissionAmount,
        finalAmount,
        bookingType: "instructor",
        currency,
        guest: {
          name: "Instructor",
          email: "scubanet01@gmail.com",
          phone: "01030192402",
        },
      };

      const res = await fetch("/api/send-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invoiceData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "서버 오류");
      }

      alert("✅ 인보이스가 성공적으로 생성되고 이메일로 발송되었습니다!");

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
          bookingType: "instructor",
          bookingId: data.bookingId || null,
          invoiceFileUrl: data.fileUrl || null,
        },
      });
    } catch (err) {
      console.error("❌ 강사 인보이스 생성 실패:", err);
      alert("인보이스 생성 또는 이메일 발송 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="instructor-confirm-container">
      <h2>📘 강사 예약 확인</h2>

      {/* 여행 정보 */}
      <div className="trip-info">
        <h3>{boatName}</h3>
        <p>
          {tripName}
          <br />
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
              <th>객실 타입</th>
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
                  {b.unitSuffix || "/인"}
                  {" → "}
                  {formatCurrency(b.totalPrice || b.price, currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 금액 요약 */}
        <div style={{ marginTop: "1rem", textAlign: "right" }}>
          <p style={{ marginBottom: 4 }}>
            총 판매 금액: {formatCurrency(baseTotal, currency)}
          </p>

          {Number(focDiscount || 0) > 0 && (
            <>
              <p
                style={{
                  color: "#007bff",
                  fontWeight: "bold",
                  marginBottom: 4,
                }}
              >
                FOC 적용 ({focLabel}): -{formatCurrency(focDiscount, currency)}
              </p>

              <p style={{ fontWeight: "bold", marginBottom: 8 }}>
                FOC 적용 후 판매 금액: {formatCurrency(totalPrice, currency)}
              </p>
            </>
          )}

          <p style={{ marginBottom: 4 }}>
            강사 커미션 ({(commissionRate * 100).toFixed(0)}%): -
            {formatCurrency(commissionAmount, currency)}
          </p>

          <h3 style={{ color: "#007bff", marginTop: 10 }}>
            💰 최종 결제 금액: {formatCurrency(finalAmount, currency)}
          </h3>
        </div>
      </div>

      {/* 버튼 */}
      <div className="button-group">
        <button onClick={() => navigate(-1)} className="back-btn">
          ← 이전으로
        </button>

        <button className="confirm-btn" onClick={handleConfirm}>
          예약 확정
        </button>
      </div>
    </div>
  );
}

export default InstructorConfirm;