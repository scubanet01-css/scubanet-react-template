import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatCurrency';
import { useAuth } from "../../hooks/useAuth";

function ConfirmBooking() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { user } = useAuth();

  console.log("🔍 useAuth user =", user);
  console.log("🔍 location state =", state);

  // ✅ SelectCabin.jsx 또는 이전 단계에서 전달된 state
  const {
    trip,
    selectedCabins = [],
    selectedRatePlan,
    user: stateUser,
    currency,
  } = state || {};

  console.log("🔍 stateUser =", stateUser);

  // ✅ 예약자 정보 상태값
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    console.log("🔍 localStorage raw user =", storedUser);
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      console.log("🔍 localStorage parsed user =", parsed);

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
  const getOccupancyCount = (occupancyType, occupancyValue) => {
    if (occupancyValue != null && occupancyValue !== '') {
      const parsed = parseInt(String(occupancyValue), 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        if (parsed === 3) return 1; // 독실은 1실 기준
        return parsed;
      }
    }

    if (!occupancyType) return 1;
    if (occupancyType === '독실 예약') return 1;
    if (occupancyType === '독방사용') return 1;
    if (occupancyType === '1인 예약') return 1;
    if (occupancyType === '2인 예약') return 2;

    return 1;
  };

  // ✅ 총액 계산
  const totalPrice = useMemo(() => {
    if (!Array.isArray(selectedCabins)) return 0;

    return selectedCabins.reduce((sum, item) => {
      const count = getOccupancyCount(item?.occupancyType, item?.occupancyValue);
      const price = Number(item?.price) || 0;
      return sum + price * count;
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
    console.log('🔥 일반예약 확정 버튼 클릭됨');

    if (!guestName || !guestEmail || !guestPhone) {
      alert('예약자 정보를 모두 입력해주세요.');
      return;
    }

    // ✅ 서버 invoiceRoutes.js 기준 payload
    const payload = {
      trip,
      selectedBookings: selectedCabins.map((item) => ({
        cabinId: item?.cabinId || item?.id || null,
        cabinName: item?.cabinName || '(객실명 없음)',
        occupancyType: item?.occupancyType || '-',
        occupancyValue: item?.occupancyValue || '',
        price: Number(item?.price) || 0,
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
      console.log('📦 send-invoice 요청 보냄', payload);

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
            const occupancyCount = getOccupancyCount(
              item?.occupancyType,
              item?.occupancyValue
            );
            const unitPrice = Number(item?.price) || 0;
            const lineTotal = unitPrice * occupancyCount;

            return (
              <li key={idx}>
                🛏 {item?.cabinName || '(객실명 없음)'} / 인원: {item?.occupancyType || '-'} / 요금:{' '}
                {formatCurrency(unitPrice, currency)}
                {occupancyCount > 1 ? ` × ${occupancyCount}` : ''}
                {' → '}
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

      console.log("🔍 guestName =", guestName);
      console.log("🔍 guestEmail =", guestEmail);
      console.log("🔍 guestPhone =", guestPhone);

      <div style={{ marginTop: '24px' }}>
        <button
          onClick={() => navigate(-1)}
          style={{ marginRight: '12px' }}
        >
          ← 이전
        </button>

        <button onClick={handleConfirmBooking}>
          예약 확정
        </button>
      </div>
    </div>
  );
}

export default ConfirmBooking;