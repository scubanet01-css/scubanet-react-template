import React, { useEffect, useState } from "react";
import axios from "axios";

function AdminBookings() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState(null);

    const fetchBookings = async () => {
        try {
            const res = await axios.get("/api/bookings");
            setBookings(res.data?.bookings || []);
        } catch (err) {
            console.error("❌ 관리자 예약 목록 조회 실패:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBookings();
    }, []);

    const handleMarkAsPaid = async (bookingId) => {
        try {
            setUpdatingId(bookingId);

            await axios.patch(`/api/bookings/${bookingId}/payment`, {
                paymentStatus: "paid",
            });

            alert("입금확인 처리 완료");
            await fetchBookings();
        } catch (err) {
            console.error("❌ 입금확인 처리 실패:", err);
            alert("입금확인 처리에 실패했습니다.");
        } finally {
            setUpdatingId(null);
        }
    };

    const formatDateTime = (value) => {
        if (!value) return "-";
        return new Date(value).toLocaleString("ko-KR");
    };

    const getPaymentStatusLabel = (status) => {
        if (status === "paid") return "입금완료";
        if (status === "pending") return "입금대기";
        return status || "-";
    };

    if (loading) {
        return <div style={{ padding: "24px" }}>예약 목록을 불러오는 중...</div>;
    }

    return (
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px" }}>
            <h2 style={{ marginBottom: "16px" }}>예약 관리</h2>

            {bookings.length === 0 ? (
                <p>저장된 예약이 없습니다.</p>
            ) : (
                <div style={{ overflowX: "auto" }}>
                    <table
                        style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            background: "#fff",
                        }}
                    >
                        <thead>
                            <tr style={{ background: "#f5f5f5" }}>
                                <th style={thStyle}>예약번호</th>
                                <th style={thStyle}>예약일</th>
                                <th style={thStyle}>유형</th>
                                <th style={thStyle}>예약자</th>
                                <th style={thStyle}>선박</th>
                                <th style={thStyle}>여행명</th>
                                <th style={thStyle}>출발일</th>
                                <th style={thStyle}>총액</th>
                                <th style={thStyle}>결제상태</th>
                                <th style={thStyle}>인보이스</th>
                                <th style={thStyle}>관리</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...bookings]
                                .sort(
                                    (a, b) =>
                                        new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
                                )
                                .map((booking) => (
                                    <tr key={booking.bookingId}>
                                        <td style={tdStyle}>{booking.bookingId}</td>

                                        <td style={tdStyle}>
                                            {booking.createdAt ? formatDateTime(booking.createdAt) : "-"}
                                        </td>

                                        <td style={tdStyle}>{booking.bookingType || "-"}</td>

                                        <td style={tdStyle}>
                                            {booking.guest?.name || "-"}
                                            <br />
                                            <span style={{ color: "#666", fontSize: "13px" }}>
                                                {booking.guest?.email || "-"}
                                            </span>
                                        </td>

                                        <td style={tdStyle}>{booking.trip?.boatName || "-"}</td>

                                        <td style={tdStyle}>{booking.trip?.title || "-"}</td>

                                        <td style={tdStyle}>{booking.trip?.startDate || "-"}</td>

                                        <td style={tdStyle}>
                                            {booking.currency || "-"}{" "}
                                            {Number(booking.totalPrice || 0).toLocaleString()}
                                        </td>

                                        <td style={tdStyle}>
                                            <span
                                                style={{
                                                    fontWeight: 700,
                                                    color:
                                                        booking.paymentStatus === "paid"
                                                            ? "#16a34a"
                                                            : "#f59e0b",
                                                }}
                                            >
                                                {getPaymentStatusLabel(booking.paymentStatus)}
                                            </span>
                                        </td>

                                        <td style={tdStyle}>
                                            {booking.invoiceFileUrl ? (
                                                <a
                                                    href={booking.invoiceFileUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    열기
                                                </a>
                                            ) : (
                                                "-"
                                            )}
                                        </td>

                                        <td style={tdStyle}>
                                            {booking.paymentStatus === "paid" ? (
                                                <span style={{ color: "#16a34a", fontWeight: 700 }}>
                                                    확인완료
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => handleMarkAsPaid(booking.bookingId)}
                                                    disabled={updatingId === booking.bookingId}
                                                    style={{
                                                        padding: "8px 12px",
                                                        backgroundColor: "#16a34a",
                                                        color: "#fff",
                                                        border: "none",
                                                        borderRadius: "6px",
                                                        cursor:
                                                            updatingId === booking.bookingId
                                                                ? "not-allowed"
                                                                : "pointer",
                                                        opacity:
                                                            updatingId === booking.bookingId ? 0.6 : 1,
                                                    }}
                                                >
                                                    {updatingId === booking.bookingId
                                                        ? "처리중..."
                                                        : "입금확인"}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

const thStyle = {
    padding: "12px",
    border: "1px solid #ddd",
    textAlign: "left",
    fontSize: "14px",
};

const tdStyle = {
    padding: "12px",
    border: "1px solid #ddd",
    verticalAlign: "top",
    fontSize: "14px",
};

export default AdminBookings;