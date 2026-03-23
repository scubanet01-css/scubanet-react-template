import React from 'react';
import { formatCurrency } from '../../utils/formatCurrency';

// ✅ 인원 수 해석
const getOccupancyCount = (item) => {
  if (!item) return 1;

  if (item.occupancyValue != null && item.occupancyValue !== '') {
    const parsed = parseInt(String(item.occupancyValue), 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      // occupancyValue가 3이면 독실 같은 내부 규칙일 수 있으므로
      // 현재는 1명으로 처리
      if (parsed === 3) return 1;
      return parsed;
    }
  }

  const type = item.occupancyType || '';

  if (type.includes('2인')) return 2;
  if (type.includes('1인')) return 1;
  if (type.includes('독실')) return 1;
  if (type.includes('독방')) return 1;

  return 1;
};

// ✅ /인, /실 표시
const getUnitSuffix = (item) => {
  if (item?.unitSuffix) return item.unitSuffix;

  const type = item?.occupancyType || '';
  if (type.includes('독실') || type.includes('독방')) return '/실';

  return '/인';
};

// ✅ 객실별 소계
const getLineTotal = (item) => {
  const explicitTotal = Number(item?.totalPrice || 0);
  if (explicitTotal > 0) return explicitTotal;

  const unitPrice = Number(item?.price || 0);
  const occupancyCount = getOccupancyCount(item);

  return unitPrice * occupancyCount;
};

function BookingSummary({ trip, selectedCabins = [], currency = 'USD' }) {
  if (!Array.isArray(selectedCabins) || selectedCabins.length === 0) return null;

  const totalPrice = selectedCabins.reduce((sum, item) => {
    return sum + getLineTotal(item);
  }, 0);

  return (
    <div
      style={{
        marginTop: '24px',
        padding: '16px',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        background: '#fff',
      }}
    >
      <h4 style={{ marginTop: 0, marginBottom: '12px' }}>예약 요약</h4>

      {trip?.product?.name || trip?.title ? (
        <p style={{ margin: '0 0 12px 0', color: '#555' }}>
          {trip?.product?.name || trip?.title}
        </p>
      ) : null}

      <ul style={{ margin: 0, paddingLeft: '20px' }}>
        {selectedCabins.map((item, idx) => {
          const occupancyCount = getOccupancyCount(item);
          const unitPrice = Number(item?.price || 0);
          const lineTotal = getLineTotal(item);
          const unitSuffix = getUnitSuffix(item);

          return (
            <li key={idx} style={{ marginBottom: '8px', lineHeight: 1.5 }}>
              🛏 {item?.cabinName || '(객실명 없음)'} / 인원: {item?.occupancyType || '-'} / 요금:{' '}
              {formatCurrency(unitPrice, currency)}
              {unitSuffix}
              {occupancyCount > 1 ? ` × ${occupancyCount}` : ''}
              {' → '}
              {formatCurrency(lineTotal, currency)}
            </li>
          );
        })}
      </ul>

      <div
        style={{
          marginTop: '16px',
          paddingTop: '12px',
          borderTop: '1px solid #ddd',
          fontWeight: '700',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>총 합계</span>
        <span>{formatCurrency(totalPrice, currency)}</span>
      </div>
    </div>
  );
}

export default BookingSummary;