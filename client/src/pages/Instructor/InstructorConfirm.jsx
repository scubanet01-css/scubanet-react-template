import React, { useMemo } from "react";
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./InstructorConfirm.css";
import { formatCurrency } from "../../utils/formatCurrency";
import { getCurrencyForTrip } from "../../utils/currencyUtils";

import {
  SPECIAL_TERMS_VERSION,
  specialTermsTitle,
  specialTermsText,
} from "../../data/terms/specialTerms";

import {
  GENERAL_TERMS_VERSION,
  generalTermsTitle,
  generalTermsText,
} from "../../data/terms/generalTerms";

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

  const [showTermsModal, setShowTermsModal] = useState(false);

  const [agreeAll, setAgreeAll] = useState(false);
  const [agreeCancellation, setAgreeCancellation] = useState(false);
  const [agreeSafety, setAgreeSafety] = useState(false);
  const [agreeResponsibility, setAgreeResponsibility] = useState(false);
  const [agreeTermsReview, setAgreeTermsReview] = useState(false);

  const [specialTermsRead, setSpecialTermsRead] = useState(false);
  const [generalTermsRead, setGeneralTermsRead] = useState(false);

  const [termsModalType, setTermsModalType] = useState(null);
  const [termsScrollDone, setTermsScrollDone] = useState(false);

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

  const handleConfirm = async (agreements) => {
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
        agreements,
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

  const currentTermsTitle =
    termsModalType === "special"
      ? specialTermsTitle
      : termsModalType === "general"
        ? generalTermsTitle
        : "";

  const currentTermsText =
    termsModalType === "special"
      ? specialTermsText
      : termsModalType === "general"
        ? generalTermsText
        : "";

  const canConfirmTerms =
    agreeCancellation &&
    agreeSafety &&
    agreeResponsibility &&
    agreeTermsReview &&
    specialTermsRead &&
    generalTermsRead;

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

        <button className="confirm-btn" onClick={() => setShowTermsModal(true)}>
          예약 확정
        </button>
      </div>
      {showTermsModal && (
        <div className="terms-modal-overlay">
          <div className="terms-modal">

            <h3>약관 동의</h3>

            {/* 체크박스 */}
            <label>
              <input
                type="checkbox"
                checked={agreeAll}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setAgreeAll(checked);
                  setAgreeCancellation(checked);
                  setAgreeSafety(checked);
                  setAgreeResponsibility(checked);
                  setAgreeTermsReview(checked);
                }}
              />
              전체 동의
            </label>

            <label>
              <input
                type="checkbox"
                checked={agreeCancellation}
                onChange={(e) => setAgreeCancellation(e.target.checked)}
              />
              취소 및 환불 규정 동의
            </label>

            <label>
              <input
                type="checkbox"
                checked={agreeSafety}
                onChange={(e) => setAgreeSafety(e.target.checked)}
              />
              다이빙 위험 동의
            </label>

            <label>
              <input
                type="checkbox"
                checked={agreeResponsibility}
                onChange={(e) => setAgreeResponsibility(e.target.checked)}
              />
              여행사 책임 범위 동의
            </label>

            <label>
              <input
                type="checkbox"
                checked={agreeTermsReview}
                disabled={!specialTermsRead || !generalTermsRead}
                onChange={(e) => setAgreeTermsReview(e.target.checked)}
              />
              약관 전문 확인 동의
            </label>

            {/* 약관 보기 버튼 */}
            <div style={{ marginTop: "10px" }}>
              <button
                onClick={() => {
                  setTermsModalType("special");
                  setTermsScrollDone(false);
                }}
              >
                특별약관 보기
              </button>

              <button
                onClick={() => {
                  setTermsModalType("general");
                  setTermsScrollDone(false);
                }}
              >
                일반약관 보기
              </button>
            </div>

            {/* 약관 내용 */}
            {termsModalType && (
              <div style={{ marginTop: "10px" }}>
                <h4>{currentTermsTitle}</h4>

                <div
                  onScroll={(e) => {
                    const el = e.target;
                    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 5) {
                      setTermsScrollDone(true);
                    }
                  }}
                  style={{
                    height: "200px",
                    overflowY: "auto",
                    border: "1px solid #ddd",
                    padding: "10px",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {currentTermsText}
                </div>

                <button
                  disabled={!termsScrollDone}
                  onClick={() => {
                    if (termsModalType === "special") {
                      setSpecialTermsRead(true);
                    } else {
                      setGeneralTermsRead(true);
                    }
                    setTermsModalType(null);
                  }}
                >
                  모두 읽고 확인
                </button>
              </div>
            )}

            {/* 최종 버튼 */}
            <div style={{ marginTop: "20px" }}>
              <button onClick={() => setShowTermsModal(false)}>취소</button>

              <button
                disabled={!canConfirmTerms}
                onClick={() => {
                  const agreements = {
                    agreeAll,
                    agreeCancellation,
                    agreeSafety,
                    agreeResponsibility,
                    agreeTermsReview,
                    specialTermsRead,
                    generalTermsRead,
                    agreedAt: new Date().toISOString(),
                    specialTermsVersion: SPECIAL_TERMS_VERSION,
                    generalTermsVersion: GENERAL_TERMS_VERSION,
                  };

                  handleConfirm(agreements);
                }}
              >
                동의하고 예약 확정
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InstructorConfirm;