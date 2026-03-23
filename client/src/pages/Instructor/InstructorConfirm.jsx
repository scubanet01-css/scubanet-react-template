import React, { useEffect, useMemo, useState } from "react";
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
    totalPrice = 0, // FOC 적용 후 합계
    focDiscount = 0,
    focDetails = [],
    commissionRate: incomingCommissionRate,
    commissionAmount: incomingCommissionAmount,
    finalPrice: incomingFinalPrice,
    appliedCommissionPercent: incomingAppliedCommissionPercent,
    baseCommissionPercent: incomingBaseCommissionPercent,
    currency: incomingCurrency,
  } = state || {};

  if (!trip) return <p>잘못된 접근입니다.</p>;

  const currency = incomingCurrency || getCurrencyForTrip(trip);

  const tripName =
    trip?.product?.name || trip?.title || trip?.tripName || "정보 없음";

  const boatName = trip?.boat?.name || trip?.boatName || "정보 없음";

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  // -----------------------------------
  // 약관 동의 상태
  // -----------------------------------
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
  // 기존 기준 유지:
  // - FOC 적용되었거나, 총 인원 3명 이상이면 15%
  // - 아니면 10%
  const commissionRate = useMemo(() => {
    if (typeof incomingCommissionRate === "number") {
      return incomingCommissionRate;
    }

    const basePercent =
      Number(trip?.pricing?.instructorCommissionPercent || 0) || 0;

    const guestCount = Number(totalGuests || 0);
    const appliedPercent =
      guestCount >= 3 ? basePercent : Math.max(0, basePercent - 5);

    return appliedPercent / 100;
  }, [incomingCommissionRate, trip, totalGuests]);

  // ✅ 커미션 금액
  const commissionAmount = useMemo(() => {
    if (typeof incomingCommissionAmount === "number") {
      return incomingCommissionAmount;
    }

    return Math.round(Number(totalPrice || 0) * commissionRate);
  }, [incomingCommissionAmount, totalPrice, commissionRate]);

  // ✅ 최종 결제 금액
  const finalAmount = useMemo(() => {
    if (typeof incomingFinalPrice === "number") {
      return incomingFinalPrice;
    }

    return Math.round(Number(totalPrice || 0) - commissionAmount);
  }, [incomingFinalPrice, totalPrice, commissionAmount]);

  const appliedCommissionPercent = useMemo(() => {
    if (typeof incomingAppliedCommissionPercent === "number") {
      return incomingAppliedCommissionPercent;
    }

    return Math.round(commissionRate * 100);
  }, [incomingAppliedCommissionPercent, commissionRate]);

  const baseCommissionPercent = useMemo(() => {
    if (typeof incomingBaseCommissionPercent === "number") {
      return incomingBaseCommissionPercent;
    }

    return Number(trip?.pricing?.instructorCommissionPercent || 0) || 0;
  }, [incomingBaseCommissionPercent, trip]);

  const commissionNote = useMemo(() => {
    return totalGuests >= 3
      ? "3명 이상 소그룹 기준"
      : "1~2명 예약 기준 (-5% 적용)";
  }, [totalGuests]);

  const focLabel =
    Array.isArray(focDetails) && focDetails.length > 0
      ? focDetails.map((f) => f.offerName || f.name || "").join(", ")
      : "Group Offer";

  // -----------------------------------
  // 약관 모달용 계산값 / 로직
  // -----------------------------------
  const handleAgreeAllChange = (checked) => {
    setAgreeAll(checked);
    setAgreeCancellation(checked);
    setAgreeSafety(checked);
    setAgreeResponsibility(checked);

    if (specialTermsRead && generalTermsRead) {
      setAgreeTermsReview(checked);
    } else {
      setAgreeTermsReview(false);
    }
  };

  useEffect(() => {
    const allChecked =
      agreeCancellation &&
      agreeSafety &&
      agreeResponsibility &&
      agreeTermsReview;

    setAgreeAll(allChecked);
  }, [
    agreeCancellation,
    agreeSafety,
    agreeResponsibility,
    agreeTermsReview,
  ]);

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

  // -----------------------------------
  // 강사 예약 확정
  // -----------------------------------
  const handleConfirm = async (agreements) => {
    try {
      const invoiceData = {
        trip,
        selectedBookings,
        totalPrice, // ✅ FOC 적용 후 판매 금액
        focDiscount,
        focDetails,
        commissionRate: Number((commissionRate * 100).toFixed(0)),
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

      setShowTermsModal(false);

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

          <p>
            정책 커미션: {baseCommissionPercent}%
          </p>

          <p>
            적용 커미션: {appliedCommissionPercent}% ({commissionNote}) -{" "}
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

        <button
          className="confirm-btn"
          onClick={() => setShowTermsModal(true)}
        >
          예약 확정
        </button>
      </div>

      {/* 메인 약관 동의 모달 */}
      {showTermsModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "720px",
              background: "#fff",
              borderRadius: "12px",
              padding: "24px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: "12px" }}>
              예약 약관 동의
            </h3>

            <p
              style={{
                lineHeight: "1.6",
                color: "#444",
                marginBottom: "20px",
              }}
            >
              다음 약관 및 중요사항에 모두 동의해야 예약이 확정되며,
              인보이스가 이메일로 발송됩니다.
            </p>

            <div
              style={{
                marginTop: "24px",
                padding: "16px",
                border: "1px solid #ddd",
                borderRadius: "10px",
                background: "#fafafa",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "8px",
                  marginBottom: "12px",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={agreeAll}
                  onChange={(e) => handleAgreeAllChange(e.target.checked)}
                  style={{ marginTop: "4px" }}
                />
                <span>아래 모든 필수 약관 및 중요사항에 동의합니다.</span>
              </label>

              <div style={{ display: "grid", gap: "10px" }}>
                <label
                  style={{
                    display: "flex",
                    gap: "8px",
                    alignItems: "flex-start",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={agreeCancellation}
                    onChange={(e) => setAgreeCancellation(e.target.checked)}
                    style={{ marginTop: "4px" }}
                  />
                  <span>
                    취소 및 환불 규정을 확인하였으며 이에 동의합니다. (필수)
                  </span>
                </label>

                <label
                  style={{
                    display: "flex",
                    gap: "8px",
                    alignItems: "flex-start",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={agreeSafety}
                    onChange={(e) => setAgreeSafety(e.target.checked)}
                    style={{ marginTop: "4px" }}
                  />
                  <span>
                    다이빙, 프리다이빙, 스노클링 및 여행 중 발생할 수 있는 위험과
                    사고에 대한 책임이 본인에게 있음을 이해하고 동의합니다. (필수)
                  </span>
                </label>

                <label
                  style={{
                    display: "flex",
                    gap: "8px",
                    alignItems: "flex-start",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={agreeResponsibility}
                    onChange={(e) => setAgreeResponsibility(e.target.checked)}
                    style={{ marginTop: "4px" }}
                  />
                  <span>
                    스쿠버넷트레블은 현지 리조트/리브어보드/투어 운영사의 예약을
                    대행하는 여행사이며, 현지 서비스의 실제 제공과 운영에 대한 1차
                    책임은 해당 운영사에 있음을 이해합니다. (필수)
                  </span>
                </label>

                <label
                  style={{
                    display: "flex",
                    gap: "8px",
                    alignItems: "flex-start",
                    cursor:
                      specialTermsRead && generalTermsRead
                        ? "pointer"
                        : "not-allowed",
                    opacity: specialTermsRead && generalTermsRead ? 1 : 0.6,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={agreeTermsReview}
                    onChange={(e) => setAgreeTermsReview(e.target.checked)}
                    style={{ marginTop: "4px" }}
                    disabled={!specialTermsRead || !generalTermsRead}
                  />
                  <span>
                    특별약관 및 일반약관 전문을 모두 확인하였으며, 이에 따라
                    예약이 확정되고 인보이스가 발송되는 것에 동의합니다. (필수)
                  </span>
                </label>
              </div>

              <div
                style={{
                  marginTop: "14px",
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setTermsModalType("special");
                    setTermsScrollDone(false);
                  }}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid #ccc",
                    background: "#fff",
                    cursor: "pointer",
                  }}
                >
                  특별약관 보기
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTermsModalType("general");
                    setTermsScrollDone(false);
                  }}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid #ccc",
                    background: "#fff",
                    cursor: "pointer",
                  }}
                >
                  일반약관 보기
                </button>
              </div>

              <p
                style={{ marginTop: "12px", fontSize: "13px", color: "#666" }}
              >
                필수 항목에 모두 동의해야 예약이 확정되며, 인보이스가
                전송됩니다.
              </p>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                marginTop: "20px",
              }}
            >
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                style={{
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "1px solid #ccc",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                닫기
              </button>

              <button
                type="button"
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
                style={{
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "none",
                  background: canConfirmTerms ? "#111" : "#d9d9d9",
                  color: "#fff",
                  cursor: canConfirmTerms ? "pointer" : "not-allowed",
                }}
              >
                동의하고 예약 확정
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 약관 전문 읽기 모달 */}
      {termsModalType && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 10000,
            padding: "20px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "700px",
              background: "#fff",
              borderRadius: "12px",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              maxHeight: "90vh",
            }}
          >
            <h3 style={{ marginBottom: "10px" }}>{currentTermsTitle}</h3>

            <div
              onScroll={(e) => {
                const el = e.target;
                if (el.scrollTop + el.clientHeight >= el.scrollHeight - 5) {
                  setTermsScrollDone(true);
                }
              }}
              style={{
                border: "1px solid #ddd",
                padding: "14px",
                borderRadius: "8px",
                overflowY: "auto",
                height: "300px",
                fontSize: "14px",
                lineHeight: "1.8",
                background: "#fafafa",
                whiteSpace: "pre-wrap",
              }}
            >
              {currentTermsText}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                marginTop: "16px",
              }}
            >
              <button
                type="button"
                onClick={() => setTermsModalType(null)}
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid #ccc",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                닫기
              </button>

              <button
                type="button"
                disabled={!termsScrollDone}
                onClick={() => {
                  if (termsModalType === "special") {
                    setSpecialTermsRead(true);
                  } else {
                    setGeneralTermsRead(true);
                  }
                  setTermsModalType(null);
                }}
                style={{
                  background: termsScrollDone ? "#111" : "#ccc",
                  color: "#fff",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "none",
                  cursor: termsScrollDone ? "pointer" : "not-allowed",
                }}
              >
                읽음 확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InstructorConfirm;