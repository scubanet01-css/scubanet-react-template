/**
 * POST /api/admin/boats-assets
 * - AdminBoatAssets.jsx에서 전달된 JSON을
 * - vesselId 기준으로 서버에 저장
 */

console.log("✅ adminBoatAssets router loaded");


const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

// 저장 루트
const DATA_ROOT = "/var/www/scubanet/data";
const ASSETS_DIR = path.join(DATA_ROOT, "boats-assets");

// 디렉토리 보장
if (!fs.existsSync(ASSETS_DIR)) {
    fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

// --------------------------------------------------
// POST /api/admin/boats-assets
// --------------------------------------------------
router.post("/admin/boats-assets", (req, res) => {

    try {
        const body = req.body;

        if (!body || !body.vesselId) {
            return res.status(400).json({
                success: false,
                message: "vesselId가 없습니다."
            });
        }

        const vesselId = body.vesselId;

        // 파일 경로
        const filePath = path.join(ASSETS_DIR, `${vesselId}.json`);

        // 서버 저장
        fs.writeFileSync(
            filePath,
            JSON.stringify(body, null, 2),
            "utf8"
        );

        return res.json({
            success: true,
            vesselId,
            savedTo: filePath
        });

    } catch (err) {
        console.error("❌ boats-assets 저장 오류:", err);
        return res.status(500).json({
            success: false,
            message: "서버 저장 중 오류 발생"
        });
    }
});

module.exports = router;
