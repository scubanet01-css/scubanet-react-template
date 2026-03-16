import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatCurrency';

function MyBooking() {
  const { state } = useLocation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');

  // ✅ 예약 직후 state로 넘어온 값
  const stateTrip = state?.trip || null;
  const stateCabins = state?.cabins || state?.selectedCabins || [];
  const stateGuest = state?.guest || null;
  const stateCurrency = state?.currency || null;
  const stateTotalPrice = state?.totalPrice;
  const bookingId = state?.bookingId || null;
  const invoiceFileUrl = state?.invoiceFileUrl || null;

  // ✅ state 기반 총액 계산용
  const getOccupancyCount = (cabin) => {
    if (!cabin) return 1;

    if (cabin.occupancyValue) {
      const value = parseInt(cabin.occupancyValue, 10);

      if (value === 3) return 1; // 독실
      if (value === 2) return 2;
      return 1;
    }

    if (cabin.occupancyType?.includes('2인')) return 2;
    return 1;
  };

  const stateComputedTotal = useMemo(() => {
    if (!Array.isArray(stateCabins)) return 0;

    return stateCabins.reduce((sum, cabin) => {
      const count = getOccupancyCount(cabin);
      return sum + (Number(cabin.price) || 0) * count;
    }, 0);
  }, [stateCabins]);

  // ✅ bookingId가 있으면 서버 조회
  useEffect(() => {
    const fetchBooking = async () => {
      if (!bookingId) return;

      try {
        setLoading(true);
        setError('');

        const res = await axios.get(`/api/bookings/${bookingId}`);

        if (res.data?.success) {
          setBooking(res.data.booking);
        } else {
          setError('예약 정보를 불러오지 못했습니다.');
        }
      } catch (err) {
        console.error('❌ 예약 조회 실패:', err);
        setError('예약 정보를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId]);

  // ✅ 서버 조회 성공 시 서버 데이터 우선
  const trip = booking?.trip
    ? {
      product: { name: booking.trip.title },
      title: booking.trip.title,
      startDate: booking.trip.startDate,
      boat: { name: booking.trip.boatName },
      boatName: booking.trip.boatName,
    }
    : stateTrip;

  const cabins = booking?.selectedBookings || stateCabins || [];
  const guest = booking?.guest || stateGuest || null;
  const currency = booking?.currency || stateCurrency || 'USD';
  const total =
    booking?.totalPrice ??
    stateTotalPrice ??
    stateComputedTotal;

  if (!trip || !guest) {
    return <div>잘못된 접근입니다.</div>;
  }

  const tripName =
    trip?.product?.name ||
    trip?.title ||
    '정보 없음';

  const boatName =
    trip?.boat?.name ||
    trip?.boatName ||
    '정보 없음';

  return (
    <div style={{ padding: 20 }}>
      <h2>예약 내역 확인</h2>

      {loading && <p>예약 정보를 불러오는 중입니다...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {bookingId && (
        <p>
          <strong>예약번호:</strong> {bookingId}
        </p>
      )}

      <p>
        <strong>예약자:</strong> {guest.name} / {guest.email}
      </p>

      <p>
        <strong>여행:</strong> {tripName} / {trip.startDate} 출발 / {boatName}
      </p>

      <h3>객실</h3>
      <ul>
        {cabins.map((cabin, i) => (
          <li key={i}>
            {cabin.cabinName} / 인원: {cabin.occupancyType} / 요금:{' '}
            {formatCurrency(cabin.price, currency)}
          </li>
        ))}
      </ul>

      <p>
        <strong>총 금액:</strong> {formatCurrency(total, currency)}
      </p>

      {invoiceFileUrl && (
        <p>
          <strong>인보이스 파일:</strong> {invoiceFileUrl}
        </p>
      )}

      <button
        onClick={() =>
          navigate('/booking/payment', {
            state: {
              bookingId,
              trip,
              cabins,
              guest,
              currency,
              totalPrice: total,
            },
          })
        }
      >
        결제하기
      </button>
    </div>
  );
}

export default MyBooking;