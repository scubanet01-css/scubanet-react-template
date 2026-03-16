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

module.exports = router;