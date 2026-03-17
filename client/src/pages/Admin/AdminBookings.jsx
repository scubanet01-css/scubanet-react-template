import React, { useEffect, useState } from "react";
import axios from "axios";

function AdminBookings() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
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

        fetchBookings();
    }, []);

    const formatDateTime = (value) => {
        if (!value) return "-";
        return new Date(value).toLocaleString("ko-KR");
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
                                <th style={thStyle}>유형</th>
                                <th style={thStyle}>예약자</th>
                                <th style={thStyle}>선박</th>
                                <th style={thStyle}>여행명</th>
                                <th style={thStyle}>출발일</th>
                                <th style={thStyle}>총액</th>
                                <th style={thStyle}>결제상태</th>
                                <th style={thStyle}>생성일시</th>
                                <th style={thStyle}>인보이스</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bookings.map((booking) => (
                                <tr key={booking.bookingId}>
                                    <td style={tdStyle}>{booking.bookingId}</td>
                                    <td style={tdStyle}>{booking.bookingType}</td>
                                    <td style={tdStyle}>
                                        {booking.guest?.name}
                                        <br />
                                        <span style={{ color: "#666", fontSize: "13px" }}>
                                            {booking.guest?.email}
                                        </span>
                                    </td>
                                    <td style={tdStyle}>{booking.trip?.boatName || "-"}</td>
                                    <td style={tdStyle}>{booking.trip?.title || "-"}</td>
                                    <td style={tdStyle}>{booking.trip?.startDate || "-"}</td>
                                    <td style={tdStyle}>
                                        {booking.currency} {Number(booking.totalPrice || 0).toLocaleString()}
                                    </td>
                                    <td style={tdStyle}>{booking.paymentStatus || "-"}</td>
                                    <td style={tdStyle}>{formatDateTime(booking.createdAt)}</td>
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