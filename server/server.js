console.log("🔥 RUNNING SERVER FILE:", __filename);

const express = require('express');
const { exec } = require('child_process');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const generateInvoicePDF = require('./utils/generateInvoicePDF');
const sendInvoiceEmail = require('./utils/sendInvoiceEmail'); // ✅ 이메일 모듈 추가
const invoiceRoutes = require("./routes/invoiceRoutes");
const adminBoatAssetsRoutes = require("./routes/adminBoatAssets");
const adminSpecialTripsRouter = require("./routes/adminSpecialTrips");
const app = express();
const port = 3002;

const API_URL = 'https://app.inseanq.com/api/v2/availability-detailed';
const BOATS_DETAILS_URL = 'https://app.inseanq.com/api/v2/boats-details';
const API_KEY = 'fa031783567788e568d8010a488a6c0f9cb860d0';


app.use(cors({ origin: "*", methods: ["GET", "POST"] }));
app.use(express.json()); // ✅ POST 요청의 body를 읽을 수 있게 함
app.use(bodyParser.json());
app.use("/api", invoiceRoutes);
app.use("/admin/api/boats-assets", adminBoatAssetsRoutes);
app.use("/api/admin/special-trips", adminSpecialTripsRouter);
app.post("/__debug_post_test__", (req, res) => {
  res.json({ ok: true });
});


app.use("/data", express.static("/root/data"));
app.use('/images', express.static('root/data/images'));
app.use("/invoices", express.static(path.join(__dirname, "invoices")));

app.get('/api/availability', (req, res) => {
  const cmd = `curl -s -H "api-key: ${API_KEY}" -H "Accept: application/json" "${API_URL}"`;
  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ curl 실행 에러:', error);
      return res.status(500).json({ error: '서버 오류 (curl)' });
    }

    try {
      const jsonData = JSON.parse(stdout);
      res.json(jsonData);
    } catch (parseError) {
      console.error('❌ JSON 파싱 에러:', parseError);
      console.error('stdout 내용:', stdout);
      res.status(500).json({ error: '서버 오류 (json 파싱)' });
    }
  });
});

app.get('/api/boats-details', (req, res) => {
  const cmd = `curl -s -H "api-key: ${API_KEY}" -H "Accept: application/json" "${BOATS_DETAILS_URL}"`;

  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ curl 실행 에러:', error);
      return res.status(500).json({ error: '서버 오류 (curl)' });
    }

    try {
      const jsonData = JSON.parse(stdout);
      res.json(jsonData);
    } catch (parseError) {
      console.error('❌ JSON 파싱 에러:', parseError);
      console.error('stdout 내용:', stdout);
      res.status(500).json({ error: '서버 오류 (json 파싱)' });
    }
  });
});

app.post('/api/create-invoice', async (req, res) => {

  try {
    const bookingData = req.body;
    console.log('📩 POST 요청 수신: /api/create-invoice');
    console.log("📦 받은 payload:", bookingData);

    const filePath = `/root/data/invoice_${Date.now()}.pdf`;
    await generateInvoicePDF(bookingData, filePath);

    // 🔒 유효성 검사 추가 (이메일 없으면 실패 처리)
    if (!bookingData.guest?.email || bookingData.guest.email.trim() === '') {
      console.error('❌ 이메일 주소가 누락되었습니다.');
      return res.status(400).json({ message: '예약자 이메일이 없습니다.' });
    }

    await sendInvoiceEmail({
      to: bookingData.guest.email,
      subject: '예약 인보이스',
      text: '예약이 확정되었습니다. 첨부된 인보이스를 확인해주세요.',
      filePath,
      trip: bookingData.trip,
      guest: bookingData.guest,
    });

    console.log("✅ 인보이스 생성 및 이메일 발송 성공");
    res.status(200).json({ message: '✅ 인보이스 생성 성공', filePath });
  } catch (error) {
    console.error('❌ 인보이스 생성 실패:', error);
    res.status(500).json({ message: '인보이스 생성 중 오류 발생' });
  }
});

app.get("/health", (req, res) => res.send("ok"));

app.listen(port, '0.0.0.0', () => {
  console.log("✅ API on http://localhost:3002");
  console.log(`✅ 중계 서버가 http://localhost:${port} 에서 실행 중입니다.`);
});
