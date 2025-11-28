// /server/utils/sendInvoiceEmail.js
const nodemailer = require('nodemailer');
const path = require('path');

async function sendInvoiceEmail({ to, filePath, trip, guest }) {
  try {
    console.log(`📨 이메일 전송 대상: ${to}`);
    console.log(`📨 이메일 전송 시도 중: ${filePath} → ${to}`);

    // Postfix (sendmail) 전용 트랜스포터
    const transporter = nodemailer.createTransport({
      sendmail: true,
      newline: 'unix',
      path: '/usr/sbin/sendmail',
    });

    const mailOptions = {
      from: `"ScubaNet Travel" <noreply@scubanet-travel.com>`,
      to,
      subject: `예약 인보이스 - ${trip?.product?.name || 'ScubaNet Travel'}`,
      html: `
  <div style="font-family:Arial,sans-serif; line-height:1.6;">
    <h2>예약이 확정되었습니다 🎉</h2>
    <p>안녕하세요, ${guest?.name || '고객님'}!</p>
    <p>아래 첨부된 인보이스 파일을 확인해주세요.</p>
    <hr/>
    <p><b>여행명:</b> ${trip?.product?.name}</p>
    <p><b>출발일:</b> ${trip?.startDate}</p>
    <p><b>도착일:</b> ${trip?.endDate}</p>
    <p>감사합니다.<br>ScubaNet Travel 드림</p>
  </div>
`,

      attachments: [
        {
          filename: path.basename(filePath),
          path: filePath,
        },
      ],
    };

    // 실제 메일 전송
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ 이메일 전송 성공:', {
      envelope: info.envelope,
      messageId: info.messageId,
      response: info.response,
    });
  } catch (err) {
    console.error('❌ 이메일 전송 실패:', err);
    throw err;
  }
}

module.exports = sendInvoiceEmail;
