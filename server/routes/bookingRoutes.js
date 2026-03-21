// /server/routes/bookingRoutes.js
const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

const BOOKINGS_FILE = path.join(__dirname, "../../data/bookings.json");

function readBookings() {
    try {
        if (!fs.existsSync(BOOKINGS_FILE)) {
            return [];
        }

        const raw = fs.readFileSync(BOOKINGS_FILE, "utf8");
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
        console.error("❌ bookings.json 조회 실패:", err);
        return [];
    }
}

// ✅ 예약 목록 조회
router.get("/bookings", (req, res) => {
    const bookings = readBookings()
        .slice()
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
        success: true,
        bookings,
    });
});

// ✅ bookingId로 단건 조회
router.get("/bookings/:bookingId", (req, res) => {
    const { bookingId } = req.params;
    const bookings = readBookings();

    const booking = bookings.find((item) => item.bookingId === bookingId);

    if (!booking) {
        return res.status(404).json({
            success: false,
            message: "예약 정보를 찾을 수 없습니다.",
        });
    }

    res.json({
        success: true,
        booking,
    });
});

router.patch("/bookings/:bookingId/payment", (req, res) => {
    const { bookingId } = req.params;
    const { paymentStatus } = req.body;

    try {
        if (!paymentStatus) {
            return res.status(400).json({
                success: false,
                message: "paymentStatus 값이 필요합니다.",
            });
        }

        const bookings = readBookings();
        const index = bookings.findIndex((item) => item.bookingId === bookingId);

        if (index === -1) {
            return res.status(404).json({
                success: false,
                message: "예약을 찾을 수 없습니다.",
            });
        }

        bookings[index] = {
            ...bookings[index],
            paymentStatus,
            paidAt: paymentStatus === "paid" ? new Date().toISOString() : null,
        };

        fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(bookings, null, 2), "utf8");

        return res.json({
            success: true,
            message: "결제 상태가 업데이트되었습니다.",
            booking: bookings[index],
        });
    } catch (err) {
        console.error("❌ 결제 상태 업데이트 실패:", err);
        return res.status(500).json({
            success: false,
            message: "결제 상태 업데이트 중 오류가 발생했습니다.",
        });
    }
});

module.exports = router;