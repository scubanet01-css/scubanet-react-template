import React from 'react';

function PaymentSelector({ selectedMethod, onChange }) {
  const paymentOptions = [
    { value: 'bank_transfer', label: '무통장입금' },
    { value: 'credit_card', label: '카드결제' },
    { value: 'kakaopay', label: '카카오페이' }
  ];

  return (
    <div style={{ marginBottom: '24px' }}>
      <h3>결제수단 선택</h3>
      {paymentOptions.map(option => (
        <label key={option.value} style={{ display: 'block', marginBottom: '8px' }}>
          <input
            type="radio"
            name="paymentMethod"
            value={option.value}
            checked={selectedMethod === option.value}
            onChange={(e) => onChange(e.target.value)}
          />
          {' '}{option.label}
        </label>
      ))}
    </div>
  );
}

export default PaymentSelector;
