// /server/routes/invoiceRoutes.js
const express = require("express");
const router = express.Router();
const path = require("path");
const generateInvoicePDF = require("../utils/generateInvoicePDF");
const sendInvoiceEmail = require("../utils/sendInvoiceEmail");

router.post("/send-invoice", async (req, res) => {
  console.log("📩 [1] /api/send-invoice 라우트 호출됨");
  try {
    const {
      trip,
      selectedBookings,
      totalPrice,
      focDiscount,
      commissionRate,
      commissionAmount,
      finalAmount,
      guest,
    } = req.body;

    console.log("📦 [2] 받은 데이터:", req.body);
    console.log("📨 [서버] 인보이스 생성 요청 수신");
    console.log("➡️ 예약 상품:", trip?.product?.name);
    console.log("➡️ 이메일 수신자:", guest?.email);

    // ✅ PDF 파일 이름 및 경로 설정
    const filename = `invoice_${Date.now()}.pdf`;
    const filePath = path.join(__dirname, `../../data/${filename}`);
    console.log("🧾 [3] PDF 생성 시작:", filePath);
    // ✅ 인보이스 PDF 생성
    await generateInvoicePDF(
      {
        trip,
        selectedBookings,
        totalPrice,
        focDiscount,
        commissionRate,
        commissionAmount,
        finalAmount,
        guest,
      },
      filePath
    );

    console.log(`🧾 인보이스 PDF 생성 완료: ${filename}`);

    // ✅ 이메일 발송
    if (!guest?.email) {
      console.log("⚠️ [5] 이메일 주소 누락");
      return res.status(400).json({ message: "예약자 이메일이 없습니다." });
    }

    console.log("📨 [6] 이메일 전송 시작");
    await sendInvoiceEmail({
      to: guest?.email || "admin@scubanet-travel.com",
      filePath,
      trip,
      guest,
    });

    console.log(`📬 이메일 발송 성공: ${guest?.email}`);

    // ✅ 응답 반환
    res.json({
      success: true,
      email: guest?.email || "admin@scubanet-travel.com",
      fileUrl: `/data/${filename}`,
    });
  } catch (error) {
    console.error("❌ 인보이스 생성 또는 이메일 발송 실패:", error);
    res.status(500).json({
      success: false,
      message: "인보이스 생성 또는 이메일 발송 실패",
      error: error.message,
    });
  }
});

module.exports = router;
