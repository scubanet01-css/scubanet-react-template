// /server/utils/generateInvoicePDF.js
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

const fontPath = "/usr/share/fonts/truetype/nanum/NanumGothic.ttf";

// -------------------------------
// 공통 헬퍼
// -------------------------------
function getTripName(trip) {
  return (
    trip?.product?.name ||
    trip?.title ||
    trip?.tripName ||
    "정보 없음"
  );
}

function getBoatName(trip) {
  return (
    trip?.boat?.name ||
    trip?.boatName ||
    "정보 없음"
  );
}

function getCurrency(trip, fallback = "USD") {
  return (
    trip?.pricing?.currency ||
    trip?.currency ||
    fallback
  );
}

function formatMoney(value, currency = "USD") {
  const num = Number(value);
  if (!Number.isFinite(num)) return `${currency} 0`;

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(num);
  } catch (err) {
    return `${currency} ${num.toLocaleString()}`;
  }
}

function getOccupancyCount(type, occupancyValue) {
  if (occupancyValue != null && occupancyValue !== "") {
    const parsed = parseInt(String(occupancyValue), 10);
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  }

  if (type === "독방사용" || type === "독실 예약" || type === "1인 예약" || type === "1") return 1;
  if (type === "2인 예약" || type === "2") return 2;

  return 1;
}

function safeText(value, fallback = "-") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

// -------------------------------
// 인보이스 PDF 생성
// -------------------------------
/**
 * @param {object} data
 * @param {object} data.trip
 * @param {Array}  data.cabins
 * @param {object} data.guest
 * @param {number} data.totalPrice
 * @param {number} data.focDiscount
 * @param {number} data.commissionRate
 * @param {number} data.commissionAmount
 * @param {number} data.finalAmount
 * @param {string} data.bookingType - "general" | "instructor"
 * @param {string} outputPath
 * @returns {Promise<string>}
 */
function generateInvoicePDF(data, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      const {
        trip = {},
        cabins = [],
        guest = {},
        totalPrice,
        focDiscount,
        commissionRate,
        commissionAmount,
        finalAmount,
        bookingType = "general",
      } = data || {};

      const tripName = getTripName(trip);
      const boatName = getBoatName(trip);
      const currency = getCurrency(trip, "USD");

      const computedCabinTotal = Array.isArray(cabins)
        ? cabins.reduce((sum, cabin) => {
          const count = getOccupancyCount(cabin?.occupancyType, cabin?.occupancyValue);
          const price = Number(cabin?.price) || 0;
          return sum + price * count;
        }, 0)
        : 0;

      const resolvedTotalPrice =
        Number.isFinite(Number(totalPrice)) ? Number(totalPrice) : computedCabinTotal;

      const doc = new PDFDocument({ margin: 50 });

      fs.mkdirSync(path.dirname(outputPath), { recursive: true });

      const fileStream = fs.createWriteStream(outputPath);
      doc.pipe(fileStream);

      if (fontPath && fs.existsSync(fontPath)) {
        doc.font(fontPath);
      }

      // -------------------------------
      // 헤더
      // -------------------------------
      doc.fontSize(20).text("ScubaNet Travel Invoice", { align: "center" });
      doc.moveDown(0.5);
      doc.fontSize(10).text(`Generated: ${new Date().toLocaleString("ko-KR")}`, {
        align: "right",
      });
      doc.moveDown();

      // -------------------------------
      // 예약 기본 정보
      // -------------------------------
      doc.fontSize(14).text("예약 정보", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12).text(`예약 유형: ${bookingType === "instructor" ? "강사 예약" : "일반 예약"}`);
      doc.text(`여행 상품: ${tripName}`);
      doc.text(`출발일: ${safeText(trip?.startDate, "미정")}`);
      doc.text(`도착일: ${safeText(trip?.endDate, "미정")}`);
      doc.text(`선박명: ${boatName}`);
      doc.text(`통화: ${currency}`);
      doc.moveDown();

      // -------------------------------
      // 객실 정보
      // -------------------------------
      doc.fontSize(14).text("선택된 객실 정보", { underline: true });
      doc.moveDown(0.5);

      if (Array.isArray(cabins) && cabins.length > 0) {
        cabins.forEach((cabin, index) => {
          const count = getOccupancyCount(cabin?.occupancyType, cabin?.occupancyValue);
          const unitPrice = Number(cabin?.price) || 0;
          const lineTotal = unitPrice * count;

          doc
            .fontSize(12)
            .text(
              `${index + 1}. ${safeText(cabin?.cabinName, "객실명 없음")}`
            );
          doc
            .fontSize(11)
            .text(`   - Cabin ID: ${safeText(cabin?.cabinId, "-")}`);
          doc
            .text(`   - 예약 형태: ${safeText(cabin?.occupancyType, "-")}`);
          doc
            .text(`   - 인원 수: ${count}`);
          doc
            .text(`   - 1인 기준 금액: ${formatMoney(unitPrice, currency)}`);
          doc
            .text(`   - 소계: ${formatMoney(lineTotal, currency)}`);
          doc.moveDown(0.4);
        });
      } else {
        doc.fontSize(12).text("예약된 객실 정보가 없습니다.");
        doc.moveDown(0.4);
      }

      // -------------------------------
      // 금액 정보
      // -------------------------------
      doc.moveDown(0.4);
      doc.fontSize(14).text("금액 정보", { underline: true });
      doc.moveDown(0.5);

      doc.fontSize(12).text(`기본 총액: ${formatMoney(resolvedTotalPrice, currency)}`);

      const hasFOC = Number.isFinite(Number(focDiscount)) && Number(focDiscount) !== 0;
      const hasCommissionRate = Number.isFinite(Number(commissionRate));
      const hasCommissionAmount =
        Number.isFinite(Number(commissionAmount)) && Number(commissionAmount) !== 0;
      const hasFinalAmount = Number.isFinite(Number(finalAmount));

      if (bookingType === "instructor" || hasFOC || hasCommissionRate || hasCommissionAmount || hasFinalAmount) {
        if (hasFOC) {
          doc.text(`FOC 할인: - ${formatMoney(Number(focDiscount), currency)}`);
        }

        if (hasCommissionRate) {
          doc.text(`커미션율: ${Number(commissionRate)}%`);
        }

        if (hasCommissionAmount) {
          doc.text(`커미션 금액: - ${formatMoney(Number(commissionAmount), currency)}`);
        }

        if (hasFinalAmount) {
          doc.text(`최종 정산 금액: ${formatMoney(Number(finalAmount), currency)}`);
        }
      }

      doc.moveDown();

      // -------------------------------
      // 예약자 정보
      // -------------------------------
      doc.fontSize(14).text("예약자 정보", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12).text(`이름: ${safeText(guest?.name, "")}`);
      doc.text(`이메일: ${safeText(guest?.email, "")}`);
      doc.text(`전화번호: ${safeText(guest?.phone, "")}`);
      doc.moveDown();

      // -------------------------------
      // 안내 문구
      // -------------------------------
      doc.fontSize(11).text(
        "본 인보이스는 예약 확인 및 결제 안내를 위한 문서입니다. 상세 조건 및 최종 예약 확정 내용은 ScubaNet Travel 안내에 따릅니다.",
        { align: "left" }
      );

      // -------------------------------
      // 약관 동의 확인 문구
      // -------------------------------
      if (data?.agreements) {
        const agreedDate = data.agreements.agreedAt
          ? new Date(data.agreements.agreedAt).toISOString().split("T")[0]
          : "-";

        doc.moveDown(1.2);
        doc.fontSize(11).fillColor("black").text(
          "본 예약은 고객의 약관 동의를 기반으로 확정되었습니다.",
          { align: "left" }
        );
        doc.moveDown(0.4);
        doc.text(`동의 일시: ${agreedDate}`);
        doc.text("특별약관 / 일반약관 확인 완료");
      }

      doc.end();

      fileStream.on("finish", () => {
        console.log(`✅ PDF 생성 완료 → ${outputPath}`);
        resolve(outputPath);
      });

      fileStream.on("error", (err) => {
        console.error("❌ PDF 생성 오류:", err);
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = generateInvoicePDF;