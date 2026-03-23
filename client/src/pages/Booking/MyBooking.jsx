import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatCurrency';

function MyBooking() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { bookingId: bookingIdFromParams } = useParams();

  const rawUser = localStorage.getItem('scubanetUser');
  const user = rawUser ? JSON.parse(rawUser) : null;

  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(null);
  const [myBookings, setMyBookings] = useState([]);
  const [error, setError] = useState('');

  // ✅ 예약 직후 state로 넘어온 값
  const stateTrip = state?.trip || null;
  const stateCabins = state?.cabins || state?.selectedCabins || [];
  const stateGuest = state?.guest || null;
  const stateCurrency = state?.currency || null;
  const stateTotalPrice = state?.totalPrice;
  const stateBasePrice = state?.basePrice;
  const stateDiscountAmount = state?.discountAmount;
  const stateFinalPrice = state?.finalPrice;
  const statePromotion = state?.promotion || null;
  const stateInvoiceFileUrl = state?.invoiceFileUrl || null;
  const stateBookingId = state?.bookingId || null;

  // ✅ URL 파라미터 우선
  const bookingId = bookingIdFromParams || stateBookingId || null;

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

  const getCabinLineTotal = (cabin) => {
    const explicitTotal = Number(cabin?.totalPrice || 0);
    if (explicitTotal > 0) return explicitTotal;

    const count = getOccupancyCount(cabin);
    const unitPrice = Number(cabin?.price || 0);
    return unitPrice * count;
  };

  const getUnitSuffix = (cabin) => {
    if (cabin?.unitSuffix) return cabin.unitSuffix;
    if (cabin?.occupancyType?.includes("독실")) return "/실";
    return "/인";
  };

  const stateComputedTotal = useMemo(() => {
    if (!Array.isArray(stateCabins)) return 0;

    return stateCabins.reduce((sum, cabin) => {
      const count = getOccupancyCount(cabin);
      return sum + (Number(cabin.price) || 0) * count;
    }, 0);
  }, [stateCabins]);

  const priceBoxStyles = {
    box: {
      marginTop: '16px',
      padding: '16px',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      background: '#fafafa',
    },
    row: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '12px',
      padding: '8px 0',
      fontSize: '15px',
    },
    discount: {
      color: '#c62828',
      fontWeight: '600',
    },
    note: {
      fontSize: '13px',
      color: '#666',
      marginTop: '4px',
    },
    total: {
      marginTop: '8px',
      paddingTop: '12px',
      borderTop: '1px solid #ddd',
      fontSize: '17px',
      fontWeight: '700',
    },
  };

  const renderPriceBox = ({
    basePrice,
    discountAmount,
    finalPrice,
    promotion,
    currency,
  }) => {
    const resolvedBasePrice = Number(basePrice ?? finalPrice ?? 0);
    const resolvedDiscountAmount = Number(discountAmount ?? 0);
    const resolvedFinalPrice = Number(finalPrice ?? 0);
    const hasPromotionDiscount = resolvedDiscountAmount > 0;

    return (
      <div style={priceBoxStyles.box}>
        <div style={priceBoxStyles.row}>
          <span>기본 금액</span>
          <span>{formatCurrency(resolvedBasePrice, currency)}</span>
        </div>

        {hasPromotionDiscount && (
          <>
            <div style={{ ...priceBoxStyles.row, ...priceBoxStyles.discount }}>
              <span>
                {promotion?.title || '프로모션 할인'}
                {promotion?.discountValue ? ` (${promotion.discountValue}%)` : ''}
              </span>
              <span>- {formatCurrency(resolvedDiscountAmount, currency)}</span>
            </div>

            <div style={priceBoxStyles.note}>
              일반예약 프로모션 적용
            </div>
          </>
        )}

        <div style={{ ...priceBoxStyles.row, ...priceBoxStyles.total }}>
          <span>총 합계</span>
          <span>{formatCurrency(resolvedFinalPrice, currency)}</span>
        </div>
      </div>
    );
  };

  // ✅ bookingId가 있으면 서버에서 단건 조회
  useEffect(() => {
    const fetchBooking = async () => {
      if (!bookingId) return;

      try {
        setLoading(true);
        setError('');

        const res = await axios.get(`/api/bookings/${bookingId}`);

        if (res.data?.success && res.data?.booking) {
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

  // ✅ 메뉴에서 직접 들어온 경우: 로그인 사용자 기준 전체 예약 목록 조회
  useEffect(() => {
    const fetchMyBookings = async () => {
      // 상세 모드(state 또는 bookingId)가 있으면 목록 조회 불필요
      if (stateTrip || bookingId) return;

      try {
        setLoading(true);
        setError('');

        const res = await axios.get('/api/bookings');
        const allBookings = res.data?.bookings || [];

        const mine = allBookings.filter(
          (item) =>
            item?.guest?.email &&
            user?.email &&
            item.guest.email === user.email &&
            item.bookingType !== 'instructor'
        );

        setMyBookings(mine);
      } catch (err) {
        console.error('❌ 내 예약 목록 조회 실패:', err);
        setError('예약 목록을 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchMyBookings();
  }, [stateTrip, bookingId, user?.email]);

  // ✅ 서버 조회 성공 시 서버 데이터 우선
  const trip = booking?.trip
    ? {
      product: { name: booking.trip.title },
      title: booking.trip.title,
      startDate: booking.trip.startDate,
      endDate: booking.trip.endDate,
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

  const basePrice =
    booking?.basePrice ??
    stateBasePrice ??
    total;

  const discountAmount =
    booking?.discountAmount ??
    stateDiscountAmount ??
    0;

  const finalPrice =
    booking?.finalPrice ??
    stateFinalPrice ??
    total;

  const promotion =
    booking?.promotion ||
    statePromotion ||
    null;

  const invoiceFileUrl =
    booking?.invoiceFileUrl ||
    stateInvoiceFileUrl ||
    null;

  const bookingStatus = booking?.bookingStatus || 'confirmed';
  const paymentStatus = booking?.paymentStatus || 'pending';
  const createdAt = booking?.createdAt || null;

  const tripName =
    trip?.product?.name ||
    trip?.title ||
    '정보 없음';

  const boatName =
    trip?.boat?.name ||
    trip?.boatName ||
    '정보 없음';

  const getStatusLabel = (status) => {
    if (status === 'confirmed') return '예약 확정';
    if (status === 'pending') return '확인 대기';
    if (status === 'cancelled') return '예약 취소';
    return status || '-';
  };

  const getPaymentLabel = (status) => {
    if (status === 'paid') return '입금완료';
    if (status === 'pending') return '입금대기';
    if (status === 'failed') return '결제 실패';
    return status || '-';
  };

  if (loading && !booking && !stateTrip && myBookings.length === 0) {
    return <div style={{ padding: 20 }}>예약 정보를 불러오는 중입니다...</div>;
  }

  // ✅ 메뉴에서 직접 들어온 경우: 내 예약 목록 표시
  if (!trip || !guest) {
    return (
      <div style={{ padding: 20 }}>
        <h2>예약 내역 확인</h2>

        {error && (
          <p style={{ color: 'red' }}>{error}</p>
        )}

        {!user ? (
          <p>로그인이 필요합니다.</p>
        ) : myBookings.length === 0 ? (
          <p>예약 내역이 없습니다.</p>
        ) : (
          <>
            {myBookings.map((item) => {
              const itemTrip = item?.trip || {};
              const itemTripName =
                itemTrip?.title ||
                itemTrip?.product?.name ||
                itemTrip?.tripName ||
                '정보 없음';

              const itemBoatName =
                itemTrip?.boatName ||
                itemTrip?.boat?.name ||
                '정보 없음';

              const itemCurrency = item?.currency || 'USD';
              const itemFinalPrice = Number(item?.finalPrice ?? item?.totalPrice ?? 0);

              return (
                <div
                  key={item.bookingId}
                  style={{
                    borderBottom: '1px solid #e5e7eb',
                    padding: '14px 0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '16px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ flex: '1 1 700px', minWidth: '280px' }}>
                    <div style={{ fontWeight: '700', marginBottom: '6px' }}>
                      {item.bookingId}
                    </div>

                    <div style={{ fontSize: '14px', color: '#374151', lineHeight: 1.6 }}>
                      {itemTripName} / {itemTrip?.startDate || '-'} 출발 / {itemBoatName}
                    </div>

                    <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                      결제상태: {getPaymentLabel(item.paymentStatus || 'pending')} / 최종금액:{' '}
                      {formatCurrency(itemFinalPrice, itemCurrency)}
                    </div>
                  </div>

                  <div style={{ flexShrink: 0 }}>
                    <button
                      onClick={() => navigate(`/booking/summary/${item.bookingId}`)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        background: '#fff',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                      }}
                    >
                      상세보기
                    </button>
                  </div>
                </div>
              );
            })}
          </>
        )}

        <div style={{ marginTop: 16, display: 'flex', gap: '10px' }}>
          <button
            onClick={() => navigate(`/booking/summary/${item.bookingId}`)}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              background: '#fff',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            상세보기
          </button>
        </div>

        <div style={{ marginTop: 24 }}>
          <p
            style={{
              marginTop: '10px',
              fontSize: '13px',
              color: '#666',
              lineHeight: '1.6',
            }}
          >
            현재 온라인 결제는 비활성화되어 있습니다.
            인보이스를 확인하신 후 안내된 계좌로 송금해 주세요.
            관리자가 입금을 확인하면 예약 상태가 입금완료로 변경됩니다.
          </p>

          <button onClick={() => navigate(-1)}>
            ← 이전으로
          </button>
        </div>
      </div>
    );
  }

  // ✅ 기존 상세 화면 유지 + 할인 구조 반영
  return (
    <div style={{ padding: 20 }}>
      <h2>예약 내역 확인</h2>

      {loading && (
        <p style={{ color: '#666' }}>최신 예약 정보를 불러오는 중입니다...</p>
      )}

      {error && (
        <p style={{ color: 'red' }}>{error}</p>
      )}

      <div style={{ marginBottom: 16 }}>
        {bookingId && (
          <p>
            <strong>예약번호:</strong> {bookingId}
          </p>
        )}

        <p>
          <strong>예약 상태:</strong> {getStatusLabel(bookingStatus)}
        </p>

        <p>
          <strong>결제 상태:</strong>{' '}
          <span
            style={{
              fontWeight: 'bold',
              color: paymentStatus === 'paid' ? '#16a34a' : '#f59e0b',
            }}
          >
            {getPaymentLabel(paymentStatus)}
          </span>
        </p>

        {createdAt && (
          <p>
            <strong>예약일시:</strong>{' '}
            {new Date(createdAt).toLocaleString('ko-KR')}
          </p>
        )}
      </div>

      <div style={{ marginBottom: 20 }}>
        <p>
          <strong>예약자:</strong> {guest.name} / {guest.email}
        </p>

        {guest.phone && (
          <p>
            <strong>전화번호:</strong> {guest.phone}
          </p>
        )}

        <p>
          <strong>여행:</strong> {tripName} / {trip.startDate} 출발 / {boatName}
        </p>

        {trip?.endDate && (
          <p>
            <strong>도착일:</strong> {trip.endDate}
          </p>
        )}
      </div>

      <h3>선택한 객실</h3>
      <ul>
        {cabins.map((cabin, i) => {
          const occupancyCount = getOccupancyCount(cabin);
          const unitPrice = Number(cabin?.price || 0);
          const lineTotal = getCabinLineTotal(cabin);
          const unitSuffix = getUnitSuffix(cabin);

          return (
            <li key={i}>
              🛏 {cabin?.cabinName || "(객실명 없음)"} / 인원: {cabin?.occupancyType || "-"} / 요금:{" "}
              {formatCurrency(unitPrice, currency)}
              {unitSuffix}
              {occupancyCount > 1 ? ` × ${occupancyCount}` : ""}
              {" → "}
              {formatCurrency(lineTotal, currency)}
            </li>
          );
        })}
      </ul>

      {renderPriceBox({
        basePrice,
        discountAmount,
        finalPrice,
        promotion,
        currency,
      })}

      {invoiceFileUrl && (
        <p style={{ marginTop: 12 }}>
          <strong>인보이스 파일:</strong>{' '}
          <a
            href={invoiceFileUrl}
            target="_blank"
            rel="noreferrer"
          >
            인보이스 열기
          </a>
        </p>
      )}

      <div style={{ marginTop: 24 }}>
        <p
          style={{
            marginTop: "10px",
            fontSize: "13px",
            color: "#666",
            lineHeight: "1.6",
          }}
        >
          현재 온라인 결제는 비활성화되어 있습니다.
          인보이스를 확인하신 후 안내된 계좌로 송금해 주세요.
          관리자가 입금을 확인하면 예약 상태가 입금완료로 변경됩니다.
        </p>

        <button onClick={() => navigate('/booking/summary')}>
          ← 목록으로
        </button>
      </div>
    </div>
  );
}

export default MyBooking;