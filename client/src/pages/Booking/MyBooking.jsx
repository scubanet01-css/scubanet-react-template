// /pages/Booking/MyBooking.jsx
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatCurrency';

function MyBooking() {
  const { state } = useLocation();
  const navigate = useNavigate();

  // ⭐ currency 포함해서 받기
  const { trip, cabins, guest, currency } = state || {};

  if (!trip || !guest) return <div>잘못된 접근입니다.</div>;

  // ⭐ 총 금액 계산 (중복 없음)
  const total = cabins?.reduce((sum, cabin) => {
    const count = cabin.occupancyValue ? parseInt(cabin.occupancyValue) : 1;
    return sum + cabin.price * count;
  }, 0);

  return (
    <div style={{ padding: 20 }}>
      <h2>예약 내역 확인</h2>

      <p><strong>예약자:</strong> {guest.name} / {guest.email}</p>
      <p>
        <strong>여행:</strong> {trip.product.name} / {trip.startDate} 출발 / {trip.boat.name}
      </p>

      <h3>객실</h3>
      <ul>
        {cabins.map((cabin, i) => (
          <li key={i}>
            {cabin.cabinName} / 인원: {cabin.occupancyType} / 요금:{" "}
            {formatCurrency(cabin.price, currency)}
          </li>
        ))}
      </ul>

      <p>
        <strong>총 금액:</strong> {formatCurrency(total, currency)}
      </p>

      <button
        onClick={() =>
          navigate('/booking/payment', {
            state: {
              trip,
              cabins,
              guest,
              currency,      // ⭐ 결제 페이지로도 통화 전달
              totalPrice: total
            }
          })
        }
      >
        결제하기
      </button>
    </div>
  );
}

export default MyBooking;
