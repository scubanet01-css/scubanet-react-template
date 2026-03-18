// server/routes/adminSpecialTrips.js

const express = require("express");
const router = express.Router();

const {
    loadSpecialTrips,
    upsertSpecialTrip,
} = require("../utils/specialTripsStore");

const rebuildTripData = require("../utils/rebuildTripData");

/**
 * GET /api/admin/special-trips
 *  → app.use("/api/admin/special-trips", router) 기준으로
 *     여기서는 "/"만 써야 최종 경로가 /api/admin/special-trips 가 됩니다.
 */
router.get("/", (req, res) => {
    try {
        const trips = loadSpecialTrips();
        res.json(trips);
    } catch (err) {
        console.error("❌ [GET /api/admin/special-trips] 오류:", err);
        res.status(500).json({ error: "Failed to load special trips" });
    }
});

/**
 * GET /api/admin/special-trips/:id
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
        console.error("❌ [GET /api/admin/special-trips/:id] 오류:", err);
        res.status(500).json({ error: "Failed to load special trip" });
    }
});

/**
 * POST /api/admin/special-trips
 *  - specialTripId 기준 upsert
 */
router.post("/", async (req, res) => {
    try {
        const payload = req.body || {};

        if (!payload.specialTripId) {
            return res
                .status(400)
                .json({ error: "specialTripId is required" });
        }

        const saved = await upsertSpecialTrip(payload);

        res.json(saved);
    } catch (err) {
        console.error("❌ [POST /api/admin/special-trips] 오류:", err);
        res.status(500).json({ error: "Failed to save special trip" });
    }
});

module.exports = router;