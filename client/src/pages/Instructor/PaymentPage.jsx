import React from "react";
import { useLocation } from "react-router-dom";

function PaymentPage() {
  const { state } = useLocation();
  if (!state) return <p>결제 정보가 없습니다.</p>;

  const { trip, finalAmount } = state;

  const handlePayment = () => {
    alert(`✅ ${trip.boat?.name} 예약 결제가 완료되었습니다!`);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>결제 단계</h2>
      <p>
        <strong>여행명:</strong> {trip.product?.name} <br />
        <strong>총 결제 금액:</strong> USD {finalAmount.toLocaleString()}
      </p>
      <button
        onClick={handlePayment}
        style={{
          backgroundColor: "#28a745",
          color: "#fff",
          padding: "10px 20px",
          borderRadius: "8px",
          border: "none",
          cursor: "pointer",
          marginTop: "20px",
        }}
      >
        결제 완료
      </button>
    </div>
  );
}

export default PaymentPage;
