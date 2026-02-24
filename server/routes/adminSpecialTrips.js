// server/routes/adminSpecialTrips.js

const express = require("express");
const router = express.Router();

const {
    loadSpecialTrips,
    upsertSpecialTrip,
} = require("../utils/specialTripsStore");

/**
 * GET /api/admin/special-trips
 *  - 모든 스페셜 트립 목록 조회
 */
router.get("/", (req, res) => {
    try {
        const trips = loadSpecialTrips();
        res.json(trips);
    } catch (err) {
        console.error("❌ [GET /special-trips] 오류:", err);
        res.status(500).json({ error: "Failed to load special trips" });
    }
});

/**
 * GET /api/admin/special-trips/:id
 *  - 특정 specialTripId로 조회
 */
router.get("/:id", (req, res) => {
    try {
        const id = req.params.id;
        const trips = loadSpecialTrips();
        const found = trips.find((t) => t.specialTripId === id);

        if (!found) {
            return res.status(404).json({ error: "Special trip not found" });
        }
        res.json(found);
    } catch (err) {
        console.error("❌ [GET /special-trips/:id] 오류:", err);
        res.status(500).json({ error: "Failed to load special trip" });
    }
});

/**
 * POST /api/admin/special-trips
 *  - specialTripId 기준으로 upsert (추가/수정)
 *  - body 예시:
 *    {
 *      "specialTripId": "special_mola01_2026_komodo_0910",
 *      "vesselId": "vessel_scuba_molamola01",
 *      "title": "...",
 *      ...
 *    }
 */
router.post("/", (req, res) => {
    try {
        const payload = req.body || {};

        if (!payload.specialTripId) {
            return res
                .status(400)
                .json({ error: "specialTripId is required" });
        }

        const saved = upsertSpecialTrip(payload);
        res.json(saved);
    } catch (err) {
        console.error("❌ [POST /special-trips] 오류:", err);
        res.status(500).json({ error: "Failed to save special trip" });
    }
});

module.exports = router;