import React, { useState, useEffect } from 'react';
import CabinSelector from '../../components/Booking/CabinSelector';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatCurrency';
import { getCurrencyForTrip } from "../../utils/currencyUtils";

// 🧠 인원 수 해석 함수
const getOccupancyCount = (occupancyType) => {
  if (!occupancyType) return 1;
  if (occupancyType === '독실 예약') return 1;
  if (occupancyType === '2인 예약') return 2;
  if (occupancyType === '1인 예약') return 1;
  return 1; // 기본값 fallback
};

function SelectCabin({ bookingData }) {
  const navigate = useNavigate();
  const { trip, ratePlans, cabins } = bookingData;

  const [selectedRatePlan, setSelectedRatePlan] = useState(null);
  const [selectedCabins, setSelectedCabins] = useState([]);

  // ⭐⭐ Almonda 통화 결정 (SAR / USD)
  const currency = getCurrencyForTrip(trip);


  useEffect(() => {
    if (!selectedRatePlan && ratePlans?.length > 0) {
      setSelectedRatePlan(ratePlans[0]);
    }
  }, [ratePlans, selectedRatePlan]);

  const handleProceed = () => {
    if (!selectedCabins.length) return;
    navigate('/booking/confirm', {
      state: {
        trip,
        selectedRatePlan,
        selectedCabins,
        currency, // ⭐ 예약 확인 화면까지 currency 전달
      }
    });
  };

  // ⭐ 총액 계산
  const totalAmount = selectedCabins.reduce((sum, item) => {
    return sum + item.price * getOccupancyCount(item.occupancyType);
  }, 0);

  return (
    <div className="select-cabin">
      <CabinSelector
        trip={trip}
        selectedRatePlan={selectedRatePlan}
        selectedCabins={selectedCabins}
        onChange={setSelectedCabins}
        currency={currency}  // ⭐ CabinSelector로 currency 전달
      />

      {selectedCabins.length > 0 && (
        <div className="booking-summary-panel" style={{ marginTop: '24px' }}>
          <h4>선택된 객실 요약</h4>
          <ul>
            {selectedCabins.map((item, idx) => (
              <li key={idx}>
                🛏 객실: {item.cabinName} / 인원: {item.occupancyType} / 요금:
                {formatCurrency(item.price, currency)}
              </li>
            ))}
          </ul>

          <p>
            <strong>총 합계:</strong> {formatCurrency(totalAmount, currency)}
          </p>

          <button onClick={handleProceed}>예약 확인</button>
        </div>
      )}

      {selectedCabins.length === 0 && (
        <p style={{ color: 'gray', fontStyle: 'italic', marginTop: '16px' }}>
          객실을 선택해주세요.
        </p>
      )}
    </div>
  );
}

export default SelectCabin;
