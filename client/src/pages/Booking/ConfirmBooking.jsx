import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatCurrency';
import { useAuth } from "../../hooks/useAuth";

function ConfirmBooking() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { user } = useAuth();

  // ✅ SelectCabin.jsx 또는 이전 단계에서 전달된 state
  const {
    trip,
    selectedCabins = [],
    selectedRatePlan,
    user: stateUser,
    currency,
  } = state || {};

  // ✅ 예약자 정보 상태값
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");

  const [showTermsModal, setShowTermsModal] = useState(false);

  const [agreeAll, setAgreeAll] = useState(false);
  const [agreeCancellation, setAgreeCancellation] = useState(false);
  const [agreeSafety, setAgreeSafety] = useState(false);
  const [agreeResponsibility, setAgreeResponsibility] = useState(false);
  const [agreeTermsReview, setAgreeTermsReview] = useState(false);
  const [specialTermsRead, setSpecialTermsRead] = useState(false);
  const [generalTermsRead, setGeneralTermsRead] = useState(false);
  const [termsModalType, setTermsModalType] = useState(null);
  // "special" | "general" | null

  const [termsScrollDone, setTermsScrollDone] = useState(false);

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

  const canConfirmTerms =
    agreeCancellation &&
    agreeSafety &&
    agreeResponsibility &&
    agreeTermsReview &&
    specialTermsRead &&
    generalTermsRead;

  useEffect(() => {
    const storedUser = localStorage.getItem("scubanetUser");

    if (storedUser) {
      const parsed = JSON.parse(storedUser);

      setGuestName(
        (prev) =>
          prev ||
          parsed.name ||
          parsed.username ||
          parsed.userName ||
          ""
      );

      setGuestEmail(
        (prev) =>
          prev ||
          parsed.email ||
          ""
      );

      setGuestPhone(
        (prev) =>
          prev ||
          parsed.phone ||
          parsed.phoneNumber ||
          parsed.mobile ||
          ""
      );
    }
  }, []);

  useEffect(() => {
    const resolvedName =
      stateUser?.name ||
      user?.name ||
      user?.username ||
      user?.userName ||
      "";

    const resolvedEmail =
      stateUser?.email ||
      user?.email ||
      "";

    const resolvedPhone =
      stateUser?.phone ||
      stateUser?.phoneNumber ||
      user?.phone ||
      user?.phoneNumber ||
      user?.mobile ||
      "";

    setGuestName((prev) => prev || resolvedName);
    setGuestEmail((prev) => prev || resolvedEmail);
    setGuestPhone((prev) => prev || resolvedPhone);
  }, [stateUser, user]);



  // ✅ 여행명 / 선박명 fallback
  const tripName =
    trip?.product?.name ||
    trip?.name ||
    trip?.title ||
    trip?.tripName ||
    '(이름 정보 없음)';

  const boatName =
    trip?.boat?.name ||
    trip?.boatName ||
    '(선박 정보 없음)';

  // ✅ 인원 해석 함수
  const getOccupancyCount = (item) => {
    const explicitPeople = Number(item?.peopleCount || 0);
    if (explicitPeople > 0) return explicitPeople;

    const occupancyValue = item?.occupancyValue;
    const occupancyType = item?.occupancyType;

    if (occupancyValue != null && occupancyValue !== '') {
      const parsed = parseInt(String(occupancyValue), 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }

    if (!occupancyType) return 1;
    if (occupancyType.includes('독실')) return 1;
    if (occupancyType.includes('1인')) return 1;
    if (occupancyType.includes('2인')) return 2;

    return 1;
  };

  // ✅ 총액 계산
  const totalPrice = useMemo(() => {
    if (!Array.isArray(selectedCabins)) return 0;

    return selectedCabins.reduce((sum, item) => {
      const lineTotal =
        Number(item?.totalPrice || 0) ||
        (Number(item?.price || 0) * getOccupancyCount(item));

      return sum + lineTotal;
    }, 0);
  }, [selectedCabins]);

  // ✅ state 데이터가 없을 경우 에러 방지
  if (!trip || !Array.isArray(selectedCabins) || selectedCabins.length === 0) {
    return (
      <div style={{ padding: '20px' }}>
        <h3>예약 정보가 누락되었습니다</h3>
        <button onClick={() => navigate(-1)}>← 돌아가기</button>
      </div>
    );
  }

  const handleConfirmBooking = async () => {

    if (!guestName || !guestEmail || !guestPhone) {
      alert('예약자 정보를 모두 입력해주세요.');
      return;
    }

    // ✅ 서버 invoiceRoutes.js 기준 payload
    const payload = {
      trip,
      selectedBookings: selectedCabins.map((item) => ({
        cabinId: item?.cabinId || item?.id || null,
        cabinName: item?.cabinName || "(객실명 없음)",
        occupancyType: item?.occupancyType || "-",
        occupancyValue: item?.occupancyValue || "",
        peopleCount: Number(item?.peopleCount || 0),
        roomCount: Number(item?.roomCount || 0),
        unitSuffix: item?.unitSuffix || "",
        price: Number(item?.price) || 0,
        totalPrice: Number(item?.totalPrice || 0),
      })),
      guest: {
        name: guestName,
        email: guestEmail,
        phone: guestPhone,
      },
      totalPrice,
      bookingType: 'general',
    };

    try {

      const response = await axios.post('/api/send-invoice', payload);

      if (response.data?.success) {
        alert('✅ 인보이스가 성공적으로 생성되고 이메일로 발송되었습니다!');

        // ✅ MyBooking.jsx로 이동
        const savedBookingId = response.data.bookingId || null;

        navigate(
          savedBookingId ? `/booking/summary/${savedBookingId}` : '/booking/summary',
          {
            state: {
              trip,
              cabins: selectedCabins,
              selectedCabins,
              selectedRatePlan,
              currency,
              guest: {
                name: guestName,
                email: guestEmail,
                phone: guestPhone,
              },
              totalPrice,
              invoiceFileUrl: response.data.fileUrl || null,
              bookingId: savedBookingId,
              bookingType: 'general',
            },
          }
        );
      } else {
        alert('❌ 인보이스 생성 실패!');
      }
    } catch (err) {
      console.error('❌ 서버 요청 오류:', err);
      alert('❌ 인보이스 생성 또는 이메일 발송 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="confirm-booking">
      <h2>예약 확인</h2>

      {/* 여행 정보 */}
      <section>
        <h3>여행 정보</h3>
        <p>상품명: {tripName}</p>
        <p>출발일: {trip?.startDate || '(출발일 정보 없음)'}</p>
        <p>선박명: {boatName}</p>
      </section>

      {/* 선택한 객실 */}
      <section style={{ marginTop: '24px' }}>
        <h3>선택한 객실</h3>
        <ul>
          {selectedCabins.map((item, idx) => {
            const occupancyCount = getOccupancyCount(item);
            const unitPrice = Number(item?.price) || 0;
            const lineTotal =
              Number(item?.totalPrice || 0) ||
              (unitPrice * occupancyCount);

            const unitSuffix =
              item?.unitSuffix ||
              (item?.occupancyType?.includes("독실") ? "/실" : "/인");

            return (
              <li key={idx}>
                🛏 {item?.cabinName || "(객실명 없음)"} / 인원: {item?.occupancyType || "-"} / 요금:{" "}
                {formatCurrency(unitPrice, currency)}
                {unitSuffix}
                {occupancyCount > 1 ? ` × ${occupancyCount}` : ""}
                {" → "}
                {formatCurrency(lineTotal, currency)}
              </li>
            );
          })}
        </ul>

        <p>
          <strong>총 합계:</strong> {formatCurrency(totalPrice, currency)}
        </p>
      </section>

      {/* 예약자 정보 */}
      <section style={{ marginTop: '24px' }}>
        <h3>예약자 정보</h3>

        <input
          type="text"
          placeholder="이름"
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          style={{ display: 'block', marginBottom: '8px' }}
        />

        <input
          type="email"
          placeholder="이메일"
          value={guestEmail}
          onChange={(e) => setGuestEmail(e.target.value)}
          style={{ display: 'block', marginBottom: '8px' }}
        />

        <input
          type="text"
          placeholder="전화번호"
          value={guestPhone}
          onChange={(e) => setGuestPhone(e.target.value)}
          style={{ display: 'block', marginBottom: '8px' }}
        />
      </section>

      <div style={{ marginTop: '24px' }}>
        <button
          onClick={() => navigate(-1)}
          style={{ marginRight: '12px' }}
        >
          ← 이전
        </button>

        <button onClick={() => setShowTermsModal(true)}>
          예약 확정
        </button>
      </div>

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

            <p style={{ lineHeight: "1.6", color: "#444", marginBottom: "20px" }}>
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
                    cursor: specialTermsRead && generalTermsRead ? "pointer" : "not-allowed",
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
                    특별약관 및 일반약관 전문을 모두 확인하였으며, 이에 따라 예약이
                    확정되고 인보이스가 발송되는 것에 동의합니다. (필수)
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

              <p style={{ marginTop: "12px", fontSize: "13px", color: "#666" }}>
                필수 항목에 모두 동의해야 예약이 확정되며, 인보이스가 전송됩니다.
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
                  alert("다음 단계에서 여기서 기존 handleConfirmBooking을 연결합니다.");
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
            <h3 style={{ marginBottom: "10px" }}>
              {termsModalType === "special"
                ? "특별약관"
                : "일반약관"}
            </h3>

            {/* 🔥 스크롤 영역 */}
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
                lineHeight: "1.6",
                background: "#fafafa",
              }}
            >
              {/* 🔥 여기 나중에 실제 약관 넣으면 된다 */}
              <p>약관 내용...</p>
              <p>약관 내용...</p>
              <p>약관 내용...</p>
              <p>약관 내용...</p>
              <p>약관 내용...</p>
              <p>약관 내용...</p>
              <p>약관 내용...</p>
              <p>약관 내용...</p>
              <p>약관 내용...</p>
              <p>약관 내용...</p>
            </div>

            {/* 버튼 영역 */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                marginTop: "16px",
              }}
            >
              <button onClick={() => setTermsModalType(null)}>
                닫기
              </button>

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
                style={{
                  background: termsScrollDone ? "#111" : "#ccc",
                  color: "#fff",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "none",
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

export default ConfirmBooking;