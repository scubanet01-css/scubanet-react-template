// server/server.js
console.log("🔥 RUNNING SERVER FILE:", __filename);

const express = require("express");
const { exec } = require("child_process");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const bodyParser = require("body-parser");
const authRouter = require("./routes/auth");

const generateInvoicePDF = require("./utils/generateInvoicePDF");
const sendInvoiceEmail = require("./utils/sendInvoiceEmail");
const invoiceRoutes = require("./routes/invoiceRoutes");
const adminBoatAssetsRoutes = require("./routes/adminBoatAssets");
const bookingRoutes = require("./routes/bookingRoutes");
const adminPromotionsRouter = require("./routes/adminPromotions");

// ✅ Special Trips 유틸 직접 사용
const {
  loadSpecialTrips,
  upsertSpecialTrip,
  deleteSpecialTrip,
} = require("./utils/specialTripsStore");

const app = express();
const port = 3002;

// Inseanq API 설정
const API_URL = "https://app.inseanq.com/api/v2/availability-detailed";
const BOATS_DETAILS_URL = "https://app.inseanq.com/api/v2/boats-details";
const API_KEY = "fa031783567788e568d8010a488a6c0f9cb860d0";

// --------------------------------------------------
// 공통 미들웨어
// --------------------------------------------------
app.use("/data", express.static("/var/scubanet-data"));

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://210.114.22.82",
  "https://210.114.22.82",
  "http://scubanet-travel.com",
  "https://scubanet-travel.com",
  "http://www.scubanet-travel.com",
  "https://www.scubanet-travel.com",
];

const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.error("❌ CORS blocked for origin:", origin);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

// 🔍 모든 요청 로깅
app.use((req, res, next) => {
  console.log("➡ REQ:", req.method, req.url, "| origin =", req.headers.origin || "-");
  next();
});

app.use("/uploads", express.static("/var/scubanet-data/uploads"));
app.use(authRouter);
app.use("/admin/api/promotions", adminPromotionsRouter);

// --------------------------------------------------
// ✅ Special Trips Admin API (여기가 핵심)
// --------------------------------------------------

// 전체 목록 조회
app.get("/api/admin/special-trips", (req, res) => {
  try {
    const trips = loadSpecialTrips();
    res.json(trips);
  } catch (err) {
    console.error("❌ [GET /api/admin/special-trips] 오류:", err);
    res.status(500).json({ error: "Failed to load special trips" });
  }
});

// 특정 ID 조회
app.get("/api/admin/special-trips/:id", (req, res) => {
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

// 추가/수정 (Upsert)
app.post("/api/admin/special-trips", (req, res) => {
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
    console.error("❌ [POST /api/admin/special-trips] 오류:", err);
    res.status(500).json({ error: "Failed to save special trip" });
  }
});

app.delete("/api/admin/special-trips/:id", (req, res) => {
  try {
    const { id } = req.params;

    const deleted = deleteSpecialTrip(id);

    if (!deleted) {
      return res.status(404).json({
        error: "Special trip not found",
      });
    }

    return res.json({
      success: true,
      message: "스페셜 트립이 삭제되었습니다.",
      deletedId: id,
    });
  } catch (err) {
    console.error("❌ [DELETE /api/admin/special-trips/:id] 오류:", err);
    return res.status(500).json({
      error: "Failed to delete special trip",
    });
  }
});

// --------------------------------------------------
// 기존 라우트들
// --------------------------------------------------
app.use("/api", invoiceRoutes);
app.use("/api", bookingRoutes);
app.use("/admin/api/boats-assets", adminBoatAssetsRoutes);


// 디버그용 POST 테스트
app.post("/__debug_post_test__", (req, res) => {
  res.json({ ok: true, body: req.body || null });
});

// 정적 파일 서빙
app.use("/data", express.static("/root/data"));
app.use("/images", express.static("/root/data/images"));
app.use("/invoices", express.static(path.join(__dirname, "invoices")));

// --------------------------------------------------
// Inseanq 중계 API
// --------------------------------------------------
app.get("/api/availability", (req, res) => {
  const cmd = `curl -s -H "api-key: ${API_KEY}" -H "Accept: application/json" "${API_URL}"`;

  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.error("❌ curl 실행 에러:", error);
      return res.status(500).json({ error: "서버 오류 (curl)" });
    }

    try {
      const jsonData = JSON.parse(stdout);
      res.json(jsonData);
    } catch (parseError) {
      console.error("❌ JSON 파싱 에러:", parseError);
      console.error("stdout 내용:", stdout);
      res.status(500).json({ error: "서버 오류 (json 파싱)" });
    }
  });
});

app.get("/api/boats-details", (req, res) => {
  const cmd = `curl -s -H "api-key: ${API_KEY}" -H "Accept: application/json" "${BOATS_DETAILS_URL}"`;

  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.error("❌ curl 실행 에러:", error);
      return res.status(500).json({ error: "서버 오류 (curl)" });
    }

    try {
      const jsonData = JSON.parse(stdout);
      res.json(jsonData);
    } catch (parseError) {
      console.error("❌ JSON 파싱 에러:", parseError);
      console.error("stdout 내용:", stdout);
      res.status(500).json({ error: "서버 오류 (json 파싱)" });
    }
  });
});

// --------------------------------------------------
// 인보이스 생성 + 이메일 전송
// --------------------------------------------------
app.post("/api/create-invoice", async (req, res) => {
  try {
    const bookingData = req.body;
    console.log("📩 POST 요청 수신: /api/create-invoice");
    console.log("📦 받은 payload:", bookingData);

    const filePath = `/var/scubanet-data/invoice_${Date.now()}.pdf`;
    await generateInvoicePDF(bookingData, filePath);

    // 이메일 검증
    if (!bookingData.guest?.email || bookingData.guest.email.trim() === "") {
      console.error("❌ 이메일 주소가 누락되었습니다.");
      return res.status(400).json({ message: "예약자 이메일이 없습니다." });
    }

    await sendInvoiceEmail({
      to: bookingData.guest.email,
      subject: "예약 인보이스",
      text: "예약이 확정되었습니다. 첨부된 인보이스를 확인해주세요.",
      filePath,
      trip: bookingData.trip,
      guest: bookingData.guest,
    });

    console.log("✅ 인보이스 생성 및 이메일 발송 성공");
    res.status(200).json({ message: "✅ 인보이스 생성 성공", filePath });
  } catch (error) {
    console.error("❌ 인보이스 생성 실패:", error);
    res.status(500).json({ message: "인보이스 생성 중 오류 발생" });
  }
});

// 🔍 디버그용: server.js가 실제로 라우팅하는지 확인
app.get("/test-special", (req, res) => {
  console.log("🔥 /test-special hit");
  res.json({ ok: true, from: "server.js", path: "/test-special" });
});

// --------------------------------------------------
// 헬스 체크
// --------------------------------------------------
app.get("/health", (req, res) => res.send("ok"));

// --------------------------------------------------
// 서버 시작
// --------------------------------------------------
app.listen(port, "0.0.0.0", () => {
  console.log(`✅ API on http://localhost:${port}`);
  console.log(`✅ 중계 서버가 http://localhost:${port} 에서 실행 중입니다.`);
});

// ✅ instructor policy 파일 경로
const POLICY_FILE = "/var/scubanet-data/instructor-policies.json";

// ✅ 정책 전체 조회
app.get("/api/instructor-policy", (req, res) => {
  try {
    const fs = require("fs");

    if (!fs.existsSync(POLICY_FILE)) {
      return res.json({});
    }

    const data = JSON.parse(fs.readFileSync(POLICY_FILE, "utf-8"));
    res.json(data);
  } catch (err) {
    console.error("❌ 정책 조회 실패:", err);
    res.status(500).json({ error: "Failed to load policies" });
  }
});

// ✅ 특정 vessel 조회
app.get("/api/instructor-policy/:vesselId", (req, res) => {
  try {
    const fs = require("fs");
    const { vesselId } = req.params;

    if (!fs.existsSync(POLICY_FILE)) {
      return res.json(null);
    }

    const data = JSON.parse(fs.readFileSync(POLICY_FILE, "utf-8"));
    res.json(data[vesselId] || null);
  } catch (err) {
    console.error("❌ 정책 조회 실패:", err);
    res.status(500).json({ error: "Failed to load policy" });
  }
});

// ✅ 정책 저장
app.post("/api/instructor-policy", (req, res) => {
  try {
    const {
      vesselId,
      contractStatus = "none",
      bookingMode = "inquiry",
      commissionPercent = 0,
      focPolicy = "",
      memo = "",
    } = req.body || {};

    if (!vesselId) {
      return res.status(400).json({ error: "vesselId is required" });
    }

    let data = {};

    if (fs.existsSync(POLICY_FILE)) {
      data = JSON.parse(fs.readFileSync(POLICY_FILE, "utf-8"));
    }

    data[vesselId] = {
      contractStatus,
      bookingMode,
      commissionPercent: Number(commissionPercent) || 0,
      focPolicy: focPolicy || "",
      memo: memo || "",
    };

    fs.writeFileSync(POLICY_FILE, JSON.stringify(data, null, 2), "utf-8");

    res.json({
      success: true,
      vesselId,
      policy: data[vesselId],
    });
  } catch (err) {
    console.error("❌ 정책 저장 실패:", err);
    res.status(500).json({ error: "Failed to save policy" });
  }
});

// 관리자용: 회원 role 변경
app.put("/admin/api/users/:userId/role", async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!["general", "instructor", "admin"].includes(role)) {
      return res.status(400).json({ message: "유효하지 않은 role입니다." });
    }

    const users = readUsers(); // 현재 프로젝트의 사용자 읽기 함수
    const idx = users.findIndex((u) => String(u.id) === String(userId));

    if (idx === -1) {
      return res.status(404).json({ message: "회원을 찾을 수 없습니다." });
    }

    users[idx].role = role;

    // 강사회원으로 바꾸는 경우 승인 상태도 같이 반영
    if (role === "instructor") {
      users[idx].instructorStatus = "approved";
      users[idx].isInstructorApproved = true;
    }

    // 일반회원으로 되돌릴 경우 필요하면 정리
    if (role === "general") {
      users[idx].instructorStatus = "none";
      users[idx].isInstructorApproved = false;
    }

    writeUsers(users); // 현재 프로젝트의 사용자 저장 함수

    res.json({
      success: true,
      message: "회원 권한이 변경되었습니다.",
      user: users[idx],
    });
  } catch (error) {
    console.error("❌ 회원 role 변경 실패:", error);
    res.status(500).json({ message: "서버 오류" });
  }
});