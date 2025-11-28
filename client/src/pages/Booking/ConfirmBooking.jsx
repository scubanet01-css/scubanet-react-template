import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatCurrency';

function ConfirmBooking() {
  const navigate = useNavigate(); // ✅ 뒤로가기 처리용
  const { state } = useLocation(); // ✅ SelectCabin.jsx에서 전달된 state


  // ✅ state에서 필요한 데이터 구조 분해
  const { trip, selectedCabins, selectedRatePlan, user, currency } = state || {};

  // ✅ 예약자 정보 상태값 추가
  const [guestName, setGuestName] = useState(user?.name || '');
  const [guestEmail, setGuestEmail] = useState(user?.email || '');
  const [guestPhone, setGuestPhone] = useState(user?.phone || '');

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      setGuestName(parsed.name || '');
      setGuestEmail(parsed.email || '');
      setGuestPhone(parsed.phone || '');
    }
  }, []);

  // ✅ 인원 해석 함수
  const getOccupancyCount = (occupancyType) => {
    if (!occupancyType) return 1;
    if (occupancyType === '독실 예약') return 1;
    if (occupancyType === '2인 예약') return 2;
    if (occupancyType === '1인 예약') return 1;
    return 1; // 기본값 fallback
  };

  const totalPrice = selectedCabins?.reduce(
    (sum, item) => sum + item.price * getOccupancyCount(item.occupancyType),
    0
  );

  // ✅ state 데이터가 없을 경우 에러 방지
  if (!trip || !selectedCabins) {
    return (
      <div style={{ padding: '20px' }}>
        <h3>예약 정보가 누락되었습니다</h3>
        <button onClick={() => navigate(-1)}>← 돌아가기</button>
      </div>
    );
  }
  const handleConfirmBooking = async () => {
    if (!guestName || !guestEmail || !guestPhone) {
      alert("예약자 정보를 모두 입력해주세요.");
      return;
    }

    const payload = {
      trip: trip,
      cabins: selectedCabins,
      selectedCabins: selectedCabins,
      guest: {
        name: guestName,
        email: guestEmail,
        phone: guestPhone,
      },
    };

    try {
      const apiURL = import.meta.env.VITE_API_BASE_URL;
      const response = await axios.post(`${apiURL}/api/create-invoice`, payload);
      if (response.status === 200) {
        alert('✅ 인보이스 생성 성공!');
        navigate('/booking/summary', {
          state: {
            trip,
            cabins: selectedCabins,
            currency,
            guest: {
              name: guestName,
              email: guestEmail,
              phone: guestPhone
            }
          }
        });

      } else {
        alert('❌ 인보이스 생성 실패!');
      }

    } catch (err) {
      console.error('서버 요청 오류:', err);
      alert('❌ 인보이스 생성 중 오류 발생');
    }
  };


  return (
    <div className="confirm-booking">
      <h2>예약 확인</h2>

      {/* 여행 정보 */}
      <section>
        <h3>여행 정보</h3>
        <p>상품명: {trip?.name || trip?.title || trip?.tripName || '(이름 정보 없음)'}</p>
        <p>출발일: {trip?.startDate}</p>
        <p>선박명: {trip?.boat?.name}</p>
      </section>

      {/* 선택한 객실 */}
      <section style={{ marginTop: '24px' }}>
        <h3>선택한 객실</h3>
        <ul>
          {selectedCabins.map((item, idx) => (
            <li key={idx}>
              🛏 {item.cabinName} / 인원: {item.occupancyType} / 요금:
              {formatCurrency(item.price, currency)}
            </li>
          ))}
        </ul>
        <p>
          <strong>총 합계:</strong> {formatCurrency(totalPrice, currency)}
        </p>

      </section>

      {/* 예약자 정보 (임시 입력 필드) */}
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
        <button onClick={() => navigate(-1)} style={{ marginRight: '12px' }}>← 이전</button>
        <button onClick={handleConfirmBooking}>예약 확정</button>  {/* ✅ 변경됨 */}
      </div>

    </div>
  );
}

export default ConfirmBooking;
