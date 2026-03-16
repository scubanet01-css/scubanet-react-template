// /server/utils/sendInvoiceEmail.js
const nodemailer = require("nodemailer");
const path = require("path");

function getTripName(trip) {
  return (
    trip?.product?.name ||
    trip?.title ||
    trip?.tripName ||
    "ScubaNet Travel"
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
  return trip?.pricing?.currency || trip?.currency || fallback;
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

async function sendInvoiceEmail({
  to,
  filePath,
  trip,
  guest,
  bookingType = "general",
  totalPrice,
  focDiscount,
  commissionRate,
  commissionAmount,
  finalAmount,
}) {
  try {
    const tripName = getTripName(trip);
    const boatName = getBoatName(trip);
    const currency = getCurrency(trip, "USD");

    console.log(`📨 이메일 전송 대상: ${to}`);
    console.log(`📨 이메일 전송 시도 중: ${filePath} → ${to}`);

    const transporter = nodemailer.createTransport({
      sendmail: true,
      newline: "unix",
      path: "/usr/sbin/sendmail",
    });

    const hasFOC = Number.isFinite(Number(focDiscount)) && Number(focDiscount) !== 0;
    const hasCommissionRate = Number.isFinite(Number(commissionRate));
    const hasCommissionAmount =
      Number.isFinite(Number(commissionAmount)) && Number(commissionAmount) !== 0;
    const hasFinalAmount = Number.isFinite(Number(finalAmount));

    const settlementHtml =
      bookingType === "instructor" || hasFOC || hasCommissionRate || hasCommissionAmount || hasFinalAmount
        ? `
          <hr/>
          <h3>강사 예약 정산 정보</h3>
          <p><b>기본 총액:</b> ${formatMoney(totalPrice, currency)}</p>
          ${hasFOC ? `<p><b>FOC 할인:</b> - ${formatMoney(focDiscount, currency)}</p>` : ""}
          ${hasCommissionRate ? `<p><b>커미션율:</b> ${Number(commissionRate)}%</p>` : ""}
          ${hasCommissionAmount ? `<p><b>커미션 금액:</b> - ${formatMoney(commissionAmount, currency)}</p>` : ""}
          ${hasFinalAmount ? `<p><b>최종 정산 금액:</b> ${formatMoney(finalAmount, currency)}</p>` : ""}
        `
        : `
          <hr/>
          <p><b>총 예약 금액:</b> ${formatMoney(totalPrice, currency)}</p>
        `;

    const mailOptions = {
      from: `"ScubaNet Travel" <noreply@scubanet-travel.com>`,
      to,
      subject: `예약 인보이스 - ${tripName}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>예약이 접수되었습니다</h2>
          <p>안녕하세요, ${guest?.name || "고객님"}님.</p>
          <p>아래 예약 정보와 첨부된 인보이스 파일을 확인해주세요.</p>

          <hr/>
          <p><b>예약 유형:</b> ${bookingType === "instructor" ? "강사 예약" : "일반 예약"}</p>
          <p><b>여행명:</b> ${tripName}</p>
          <p><b>출발일:</b> ${trip?.startDate || "-"}</p>
          <p><b>도착일:</b> ${trip?.endDate || "-"}</p>
          <p><b>선박명:</b> ${boatName}</p>
          ${settlementHtml}

          <hr/>
          <p>감사합니다.<br/>ScubaNet Travel 드림</p>
        </div>
      `,
      attachments: [
        {
          filename: path.basename(filePath),
          path: filePath,
        },
      ],
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("✅ 이메일 전송 성공:", {
      envelope: info.envelope,
      messageId: info.messageId,
      response: info.response,
    });

    return info;
  } catch (err) {
    console.error("❌ 이메일 전송 실패:", err);
    throw err;
  }
}

module.exports = sendInvoiceEmail;