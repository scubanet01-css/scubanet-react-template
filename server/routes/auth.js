const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");

const router = express.Router();

const USERS_FILE = "/var/scubanet-data/users.json";
const UPLOAD_DIR = "/var/scubanet-data/uploads/instructor-cards";

// -----------------------------
// 기본 폴더/파일 보장
// -----------------------------
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, "[]", "utf-8");
}

// -----------------------------
// multer 설정
// -----------------------------
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOAD_DIR);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        const safeName = `instructor-card-${Date.now()}-${uuidv4()}${ext}`;
        cb(null, safeName);
    },
});

function fileFilter(req, file, cb) {
    const allowedMimeTypes = [
        "image/jpeg",
        "image/png",
        "application/pdf",
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("JPG, PNG, PDF 파일만 업로드할 수 있습니다."));
    }
}

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
    },
});

// -----------------------------
// 유틸
// -----------------------------
function readUsers() {
    try {
        const raw = fs.readFileSync(USERS_FILE, "utf-8");
        return JSON.parse(raw);
    } catch (err) {
        console.error("users.json 읽기 오류:", err);
        return [];
    }
}

function writeUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// -----------------------------
// 회원가입
// -----------------------------
router.post(
    "/api/auth/register",
    upload.single("instructorCardFile"),
    async (req, res) => {
        try {
            const {
                role,
                name,
                email,
                password,
                confirmPassword,
                phone,
                nationality,
                organization,
                certificationLevel,
                experienceYears,
                intro,
                agreeTerms,
                agreePrivacy,
                agreeMarketing,
            } = req.body;

            const users = readUsers();

            // 1. 기본 검증
            if (!name || !name.trim()) {
                return res.status(400).json({ message: "이름을 입력해주세요." });
            }

            if (!email || !email.trim()) {
                return res.status(400).json({ message: "이메일을 입력해주세요." });
            }

            if (!isValidEmail(email.trim())) {
                return res.status(400).json({ message: "올바른 이메일 형식이 아닙니다." });
            }

            if (!password || password.length < 8) {
                return res.status(400).json({ message: "비밀번호는 8자 이상이어야 합니다." });
            }

            if (password !== confirmPassword) {
                return res.status(400).json({ message: "비밀번호 확인이 일치하지 않습니다." });
            }

            if (!phone || !phone.trim()) {
                return res.status(400).json({ message: "연락처를 입력해주세요." });
            }

            if (!nationality || !nationality.trim()) {
                return res.status(400).json({ message: "국적을 입력해주세요." });
            }

            if (agreeTerms !== "true") {
                return res.status(400).json({ message: "이용약관 동의가 필요합니다." });
            }

            if (agreePrivacy !== "true") {
                return res.status(400).json({ message: "개인정보 수집 및 이용 동의가 필요합니다." });
            }

            // 2. 이메일 중복 체크
            const existingUser = users.find(
                (user) => String(user.email).toLowerCase() === String(email).toLowerCase()
            );

            if (existingUser) {
                return res.status(409).json({ message: "이미 가입된 이메일입니다." });
            }

            // 3. role 분기
            const normalizedRole = role === "instructor" ? "instructor" : "general";
            const status = normalizedRole === "instructor" ? "pending" : "active";

            let instructorProfile = null;

            if (normalizedRole === "instructor") {
                if (!organization || !organization.trim()) {
                    return res.status(400).json({ message: "소속을 입력해주세요." });
                }

                if (!certificationLevel || !certificationLevel.trim()) {
                    return res.status(400).json({ message: "자격 등급 / 강사 레벨을 입력해주세요." });
                }

                if (
                    experienceYears === undefined ||
                    experienceYears === null ||
                    experienceYears === ""
                ) {
                    return res.status(400).json({ message: "경력을 입력해주세요." });
                }

                if (!req.file) {
                    return res.status(400).json({ message: "강사 C카드 사본 업로드가 필요합니다." });
                }

                instructorProfile = {
                    organization: organization.trim(),
                    certificationLevel: certificationLevel.trim(),
                    experienceYears: Number(experienceYears),
                    intro: intro ? intro.trim() : "",
                    ccardFileName: req.file.originalname,
                    ccardStoredName: req.file.filename,
                    ccardFileUrl: `/uploads/instructor-cards/${req.file.filename}`,
                    approvalStatus: "pending",
                };
            }

            // 4. 비밀번호 hash
            const passwordHash = await bcrypt.hash(password, 10);

            // 5. 사용자 저장
            const newUser = {
                _id: uuidv4(),
                name: name.trim(),
                email: email.trim().toLowerCase(),
                passwordHash,
                phone: phone.trim(),
                nationality: nationality.trim(),

                role: normalizedRole,
                status,

                terms: {
                    agreeTerms: agreeTerms === "true",
                    agreePrivacy: agreePrivacy === "true",
                    agreeMarketing: agreeMarketing === "true",
                    agreedAt: new Date().toISOString(),
                },

                instructorProfile,

                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                lastLoginAt: null,
            };

            users.push(newUser);
            writeUsers(users);

            return res.status(201).json({
                message:
                    normalizedRole === "instructor"
                        ? "강사회원 가입 신청이 완료되었습니다. 관리자 승인 후 이용 가능합니다."
                        : "회원가입이 완료되었습니다.",
                user: {
                    _id: newUser._id,
                    name: newUser.name,
                    email: newUser.email,
                    role: newUser.role,
                    status: newUser.status,
                },
            });
        } catch (error) {
            console.error("회원가입 오류:", error);

            if (error.message?.includes("JPG, PNG, PDF")) {
                return res.status(400).json({ message: error.message });
            }

            if (error.code === "LIMIT_FILE_SIZE") {
                return res.status(400).json({ message: "파일 크기는 10MB 이하만 가능합니다." });
            }

            return res.status(500).json({ message: "회원가입 처리 중 서버 오류가 발생했습니다." });
        }
    }
);

module.exports = router;