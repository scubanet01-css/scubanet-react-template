const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

const PROMOTIONS_FILE = path.join(__dirname, "../data/promotions.json");

function ensurePromotionsFile() {
    if (!fs.existsSync(PROMOTIONS_FILE)) {
        const initialData = {
            version: 1,
            updatedAt: new Date().toISOString(),
            promotions: [],
        };
        fs.writeFileSync(
            PROMOTIONS_FILE,
            JSON.stringify(initialData, null, 2),
            "utf-8"
        );
    }
}

function readPromotionsFile() {
    ensurePromotionsFile();

    const raw = fs.readFileSync(PROMOTIONS_FILE, "utf-8");
    const parsed = JSON.parse(raw);

    if (!parsed.promotions || !Array.isArray(parsed.promotions)) {
        return {
            version: 1,
            updatedAt: new Date().toISOString(),
            promotions: [],
        };
    }

    return parsed;
}

function writePromotionsFile(data) {
    const nextData = {
        ...data,
        updatedAt: new Date().toISOString(),
    };

    fs.writeFileSync(
        PROMOTIONS_FILE,
        JSON.stringify(nextData, null, 2),
        "utf-8"
    );

    return nextData;
}

function makePromotionId(targetBookingType, bookingStartDate, bookingEndDate) {
    const safeTarget = targetBookingType || "general";
    const safeStart = (bookingStartDate || "").replace(/-/g, "");
    const safeEnd = (bookingEndDate || "").replace(/-/g, "");
    const ts = Date.now();

    return `promo_${safeTarget}_${safeStart}_${safeEnd}_${ts}`;
}

/**
 * GET /admin/api/promotions
 * 전체 프로모션 목록 조회
 */
router.get("/", (req, res) => {
    try {
        const data = readPromotionsFile();
        res.json(data);
    } catch (error) {
        console.error("❌ promotions 조회 실패:", error);
        res.status(500).json({ message: "promotions 조회 실패" });
    }
});

/**
 * POST /admin/api/promotions
 * 새 프로모션 추가
 */
router.post("/", (req, res) => {
    try {
        const {
            title,
            description = "",
            targetBookingType = "general",
            discountType = "percent",
            discountValue = 5,
            bookingStartDate,
            bookingEndDate,
            applyScope = "global",
            scopeConfig = {},
            status = "draft",
            isActive = false,
            stackable = false,
            priority = 100,
            createdBy = "admin",
            updatedBy = "admin",
        } = req.body;

        if (!title || !bookingStartDate || !bookingEndDate) {
            return res.status(400).json({
                message: "title, bookingStartDate, bookingEndDate는 필수입니다.",
            });
        }

        const data = readPromotionsFile();

        const now = new Date().toISOString();

        const newPromotion = {
            id: makePromotionId(
                targetBookingType,
                bookingStartDate,
                bookingEndDate
            ),
            title,
            description,
            targetBookingType,
            discountType,
            discountValue: Number(discountValue),
            bookingStartDate,
            bookingEndDate,
            applyScope,
            scopeConfig,
            status,
            isActive: Boolean(isActive),
            stackable: Boolean(stackable),
            priority: Number(priority),
            createdAt: now,
            updatedAt: now,
            createdBy,
            updatedBy,
        };

        data.promotions.unshift(newPromotion);

        const saved = writePromotionsFile(data);
        res.json(saved);
    } catch (error) {
        console.error("❌ promotion 생성 실패:", error);
        res.status(500).json({ message: "promotion 생성 실패" });
    }
});

/**
 * PUT /admin/api/promotions/:id
 * 기존 프로모션 수정
 */
router.put("/:id", (req, res) => {
    try {
        const { id } = req.params;
        const data = readPromotionsFile();

        const index = data.promotions.findIndex((item) => item.id === id);

        if (index === -1) {
            return res.status(404).json({ message: "프로모션을 찾을 수 없습니다." });
        }

        const prev = data.promotions[index];

        const updated = {
            ...prev,
            ...req.body,
            discountValue:
                req.body.discountValue !== undefined
                    ? Number(req.body.discountValue)
                    : prev.discountValue,
            priority:
                req.body.priority !== undefined
                    ? Number(req.body.priority)
                    : prev.priority,
            isActive:
                req.body.isActive !== undefined
                    ? Boolean(req.body.isActive)
                    : prev.isActive,
            stackable:
                req.body.stackable !== undefined
                    ? Boolean(req.body.stackable)
                    : prev.stackable,
            updatedAt: new Date().toISOString(),
            updatedBy: req.body.updatedBy || "admin",
        };

        data.promotions[index] = updated;

        const saved = writePromotionsFile(data);
        res.json(saved);
    } catch (error) {
        console.error("❌ promotion 수정 실패:", error);
        res.status(500).json({ message: "promotion 수정 실패" });
    }
});

/**
 * PATCH /admin/api/promotions/:id/toggle-active
 * 활성 / 비활성 토글
 */
router.patch("/:id/toggle-active", (req, res) => {
    try {
        const { id } = req.params;
        const data = readPromotionsFile();

        const index = data.promotions.findIndex((item) => item.id === id);

        if (index === -1) {
            return res.status(404).json({ message: "프로모션을 찾을 수 없습니다." });
        }

        data.promotions[index].isActive = !data.promotions[index].isActive;
        data.promotions[index].updatedAt = new Date().toISOString();
        data.promotions[index].updatedBy = "admin";

        const saved = writePromotionsFile(data);
        res.json(saved);
    } catch (error) {
        console.error("❌ promotion 활성화 토글 실패:", error);
        res.status(500).json({ message: "promotion 활성화 토글 실패" });
    }
});

module.exports = router;