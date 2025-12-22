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

const BASE_DIR = "/var/www/scubanet/assets/vessels";

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const { vesselId, bucket, sub } = req.body;

        if (!vesselId || !bucket) {
            return cb(new Error("vesselId 또는 bucket 누락"));
        }

        const targetDir = sub
            ? path.join(BASE_DIR, vesselId, bucket, sub)
            : path.join(BASE_DIR, vesselId, bucket);

        ensureDir(targetDir);
        cb(null, targetDir);
    },

    filename: (req, file, cb) => {
        // React에서 이미 파일명 결정
        cb(null, file.originalname);
    },
});

const upload = multer({
    storage,
    limits: {
        fileSize: 20 * 1024 * 1024, // 20MB
    },
});

/**
 * POST /admin/api/boats-assets/upload
 */
router.post(
    "/upload",
    upload.single("file"),
    (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: "파일이 업로드되지 않았습니다.",
                });
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

/**
 * POST /admin/api/boats-assets
 * JSON 메타데이터 저장
 */
router.post("/", (req, res) => {
    try {
        const payload = req.body;

        if (!payload?.vesselId) {
            return res.status(400).json({
                success: false,
                message: "vesselId 누락",
            });
        }

        const saveDir = `/var/www/scubanet/data/boats-assets`;
        if (!fs.existsSync(saveDir)) {
            fs.mkdirSync(saveDir, { recursive: true });
        }

        const filePath = path.join(saveDir, `${payload.vesselId}.json`);

        fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");

        res.json({
            success: true,
            vesselId: payload.vesselId,
            savedPath: filePath.replace("/var/www/scubanet", ""),
        });
    } catch (err) {
        console.error("❌ boats-assets JSON 저장 실패:", err);
        res.status(500).json({
            success: false,
            message: "boats-assets JSON 저장 중 서버 오류",
        });
    }
});


module.exports = router;
