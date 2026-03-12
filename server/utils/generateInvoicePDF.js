// /server/utils/generateInvoicePDF.js
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const fontPath = null;

// ✅ 안전한 forEach 헬퍼
function safeForEach(array, callback) {
  if (Array.isArray(array)) {
    array.forEach(callback);
  }
}


// 인원 수 계산
function getOccupancyCount(type) {
  if (type === '독방사용' || type === '1') return 1;
  if (type === '2') return 2;
  return 1;
}

/**
 * 예약 인보이스 PDF 생성 함수
 * @param {object} data - { trip, cabins, guest }
 * @param {string} outputPath - 저장할 PDF 경로
 * @returns {Promise<string>} PDF 파일 경로
 */
function generateInvoicePDF({ trip, cabins, guest }, outputPath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });

    // 출력 폴더 없으면 생성
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    const fileStream = fs.createWriteStream(outputPath);
    doc.pipe(fileStream);

    // 폰트가 있으면 등록, 없으면 기본 폰트 사용
    if (fontPath && fs.existsSync(fontPath)) {
      doc.font(fontPath);
    }

    // 제목
    doc.fontSize(20).text('예약 인보이스', { align: 'center' });
    doc.moveDown();

    // 여행 정보
    doc.fontSize(12).text(`여행 상품: ${trip?.product?.name || trip?.title || '정보 없음'}`);
    doc.text(`출발일: ${trip?.startDate || '미정'}`);
    doc.text(`선박명: ${trip?.boat?.name || trip?.boatName || '정보 없음'}`);
    doc.moveDown();

    // 객실 정보
    doc.fontSize(14).text('선택된 객실 정보', { underline: true });
    let total = 0;
    if (Array.isArray(cabins) && cabins.length > 0) {
      cabins.forEach((cabin) => {
        const count = getOccupancyCount(cabin.occupancyType);
        const price = cabin.price * count;
        total += price;
        doc.fontSize(12).text(
          `- ${cabin.cabinName} / 인원: ${cabin.occupancyType} / 요금: $${price.toLocaleString()}`
        );
      });
    } else {
      doc.fontSize(12).text('예약된 객실 정보가 없습니다.');
    }

    doc.moveDown();
    doc.fontSize(14).text(`총 합계: $${total.toLocaleString()}`);
    doc.moveDown();

    // 예약자 정보
    doc.fontSize(14).text('예약자 정보', { underline: true });
    doc.fontSize(12).text(`이름: ${guest?.name || ''}`);
    doc.text(`이메일: ${guest?.email || ''}`);
    doc.text(`전화번호: ${guest?.phone || ''}`);

    doc.end();

    // 파일 저장 완료 시 resolve
    fileStream.on('finish', () => {
      console.log(`✅ PDF 생성 완료 → ${outputPath}`);
      resolve(outputPath);
    });

    fileStream.on('error', (err) => {
      console.error('❌ PDF 생성 오류:', err);
      reject(err);
    });
  });
}

module.exports = generateInvoicePDF;

