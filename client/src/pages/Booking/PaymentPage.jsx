import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatCurrency';

function PaymentPage() {
  const { state } = useLocation();
  const navigate = useNavigate();

  // ⭐ currency도 가져오기
  const { trip, cabins, guest, totalPrice, currency } = state || {};

  const handlePaymentSubmit = () => {
    alert('결제가 완료되었습니다!');
    navigate('/'); // 결제 완료 후 홈으로 이동
  };

  if (!trip || !guest) {
    return <div style={{ padding: '20px' }}>잘못된 접근입니다.</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>💳 결제하기</h2>

      <p><strong>예약자:</strong> {guest?.name} / {guest?.email}</p>

      {/* ⭐ 총 결제 금액도 통화에 맞게 표시 */}
      <p>
        <strong>결제 금액:</strong> {formatCurrency(totalPrice, currency)}
      </p>

      <h3>카드 정보 입력</h3>
      <input type="text" placeholder="카드 번호" style={{ display: 'block', margin: '10px 0' }} />
      <input type="text" placeholder="만료일 (MM/YY)" style={{ display: 'block', margin: '10px 0' }} />
      <input type="text" placeholder="CVC" style={{ display: 'block', margin: '10px 0' }} />

      <button onClick={handlePaymentSubmit}>결제하기</button>
    </div>
  );
}

export default PaymentPage;
