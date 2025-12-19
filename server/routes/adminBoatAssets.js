const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const router = express.Router();

/**
 * 업로드 규칙
 * - vesselId (required)
 * - bucket: hero | deck-plans | cabins | facilities | tenders | food
 * - sub: 선택 (cabins=DELUXE, deck-plans=MAIN_DECK 등)
 */

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const { vesselId, bucket, sub } = req.body;

        if (!vesselId || !bucket) {
            return cb(new Error("vesselId 또는 bucket 누락"), null);
        }

        const baseDir = "/var/www/scubanet/assets/vessels";
        const targetDir = sub
            ? path.join(baseDir, vesselId, bucket, sub)
            : path.join(baseDir, vesselId, bucket);

        ensureDir(targetDir);
        cb(null, targetDir);
    },

    filename: (req, file, cb) => {
        // 파일명은 React에서 이미 정해진 이름을 그대로 사용
        cb(null, file.originalname);
    },
});

const upload = multer({
    storage,
    limits: {
        fileSize: 20 * 1024 * 1024, // 20MB (리사이즈 후라 충분)
    },
});

/**
 * POST /admin/api/boats-assets/upload
 * form-data:
 * - vesselId
 * - bucket
 * - sub (optional)
 * - file
 */
router.post(
    "/admin/api/boats-assets/upload",
    upload.single("file"),
    (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, message: "파일 없음" });
            }

            const { vesselId, bucket, sub } = req.body;

            const savedPath = req.file.path.replace("/var/www/scubanet", "");

            res.json({
                success: true,
                vesselId,
                bucket,
                sub: sub || null,
                filename: req.file.originalname,
                savedPath,
            });
        } catch (err) {
            console.error("❌ 업로드 실패:", err);
            res.status(500).json({
                success: false,
                message: "이미지 업로드 중 오류 발생",
            });
        }
    }
);

module.exports = router;
