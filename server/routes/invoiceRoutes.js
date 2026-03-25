// /server/routes/invoiceRoutes.js
const express = require("express");
const router = express.Router();
const path = require("path");
const generateInvoicePDF = require("../utils/generateInvoicePDF");
const sendInvoiceEmail = require("../utils/sendInvoiceEmail");
const saveBooking = require("../utils/saveBooking");

function getTripName(trip) {
  return (
    trip?.product?.name ||
    trip?.title ||
    trip?.tripName ||
    "ScubaNet Travel"
  );
}

function inferBookingType(body) {
  if (body?.bookingType) return body.bookingType;

  const hasInstructorFields =
    body?.focDiscount != null ||
    body?.commissionRate != null ||
    body?.commissionAmount != null ||
    body?.finalAmount != null;

  return hasInstructorFields ? "instructor" : "general";
}

router.post("/send-invoice", async (req, res) => {
  console.log("📩 [1] /api/send-invoice 라우트 호출됨");

  try {
    const {
      trip,
      selectedBookings,
      totalPrice,

      // ✅ 일반예약 프로모션 관련 필드 추가
      basePrice,
      discountAmount,
      finalPrice,
      promotion,

      // ✅ 강사예약 정산 필드 유지
      focDiscount,
      commissionRate,
      commissionAmount,
      finalAmount,

      guest,
      bookingType,
      agreements,
    } = req.body || {};

    console.log("📦 [2] 받은 데이터:", req.body);

    // ✅ 약관 동의 서버 검증
    if (
      !agreements ||
      !agreements.agreeCancellation ||
      !agreements.agreeSafety ||
      !agreements.agreeResponsibility ||
      !agreements.agreeTermsReview ||
      !agreements.specialTermsRead ||
      !agreements.generalTermsRead
    ) {
      return res.status(400).json({
        success: false,
        message: "약관 동의가 완료되지 않았습니다.",
      });
    }

    console.log("📌 [약관동의 확인 완료]:", agreements);

    const resolvedBookingType = inferBookingType(req.body);
    const tripName = getTripName(trip);
    const cabins = Array.isArray(selectedBookings) ? selectedBookings : [];

    console.log("📨 [서버] 인보이스 생성 요청 수신");
    console.log("➡️ 예약 상품:", tripName);
    console.log("➡️ 예약 유형:", resolvedBookingType);
    console.log("➡️ 이메일 수신자:", guest?.email);

    if (!trip) {
      return res.status(400).json({
        success: false,
        message: "trip 정보가 없습니다.",
      });
    }

    if (!guest?.email) {
      return res.status(400).json({
        success: false,
        message: "예약자 이메일이 없습니다.",
      });
    }

    const filename = `invoice_${Date.now()}.pdf`;
    const filePath = `/var/scubanet-data/${filename}`;

    console.log("🧾 [3] PDF 생성 시작:", filePath);

    await generateInvoicePDF(
      {
        trip,
        cabins,
        guest,

        // ✅ 금액 정보
        totalPrice,
        basePrice,
        discountAmount,
        finalPrice,
        promotion,

        // ✅ 강사예약 정산 정보
        focDiscount,
        commissionRate,
        commissionAmount,
        finalAmount,

        bookingType: resolvedBookingType,
        agreements,
      },
      filePath
    );

    console.log(`🧾 인보이스 PDF 생성 완료: ${filename}`);

    console.log("📨 [6] 이메일 전송 시작");

    await sendInvoiceEmail({
      to: guest.email,
      filePath,
      trip,
      guest,

      // ✅ 예약/금액 정보
      bookingType: resolvedBookingType,
      totalPrice,
      basePrice,
      discountAmount,
      finalPrice,
      promotion,

      // ✅ 강사예약 정산 정보
      focDiscount,
      commissionRate,
      commissionAmount,
      finalAmount,

      agreements,
    });

    console.log(`📬 이메일 발송 성공: ${guest.email}`);

    const publicFileUrl = `https://www.scubanet-travel.com/data/${filename}`;

    const savedBooking = saveBooking({
      trip,
      selectedBookings: cabins,
      guest,

      // ✅ 금액 정보 저장
      totalPrice,
      basePrice,
      discountAmount,
      finalPrice,
      promotion,

      bookingType: resolvedBookingType,
      invoiceFileUrl: publicFileUrl,
      invoiceFilePath: filePath,
      emailSent: true,
      paymentStatus: "pending",
      bookingStatus: "confirmed",

      // ✅ 강사예약 정산 정보도 저장
      focDiscount,
      commissionRate,
      commissionAmount,
      finalAmount,

      // ✅ 약관 동의 정보 저장
      agreements,

      // ✅ 법적 증빙용 메타데이터 저장
      agreementMeta: {
        ip: req.ip,
        userAgent: req.headers["user-agent"] || "",
      },
    });

    res.json({
      success: true,
      email: guest.email,
      fileUrl: publicFileUrl,
      bookingType: resolvedBookingType,
      bookingId: savedBooking.bookingId,
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