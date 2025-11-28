import React from 'react';

// 🧠 인원 수 해석 함수
const getOccupancyCount = (occupancyType) => {
  if (!occupancyType) return 1;
  if (occupancyType === '독실 예약') return 1;
  if (occupancyType === '2인 예약') return 2;
  if (occupancyType === '1인 예약') return 1;
  return 1; // 기본값 fallback
};


function BookingSummary({ trip, selectedCabins }) {
  if (!selectedCabins.length) return null;

  const totalPrice = selectedCabins.reduce(
    (sum, item) => sum + item.price * getOccupancyCount(item.occupancyType),
    0
  );

  return (
    <div>
      <h4>예약 요약</h4>
      <ul>
        {selectedCabins.map((item, idx) => (
          <li key={idx}>
            🛏 {item.cabinName} — {item.occupancyType}명 — ${item.price.toLocaleString()} /인
          </li>
        ))}
      </ul>
      <p><strong>총 합계:</strong> ${totalPrice.toLocaleString()}</p>
    </div>
  );
}

export default BookingSummary;
