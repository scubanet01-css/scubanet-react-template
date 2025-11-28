// inseanq-fetch.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { Parser } = require('json2csv');
const dayjs = require('dayjs');

// 설정값
const API_URL = 'https://app.inseanq.com/api/v2/availability-detailed';
const API_KEY = 'fa031783567788e568d8010a488a6c0f9cb860d0'; // ← 유효한 키로 교체 필요
const OUTPUT_PATH = path.join(__dirname, 'data', 'availability-detailed.csv');
const LOG_PATH = path.join(__dirname, 'logs', 'fetch.log');

// 로그 기록 함수
function log(message) {
  const timestamp = dayjs().format('YYYY-MM-DD HH:mm:ss');
  fs.appendFileSync(LOG_PATH, `[${timestamp}] ${message}\n`, 'utf8');
}

async function fetchData() {
  try {
    const response = await axios.get(API_URL, {
      headers: {
        'api-key': API_KEY,
        'Accept': 'application/json'
      },
      timeout: 15000
    });

    const data = response.data.data;
    if (!Array.isArray(data)) throw new Error('응답 데이터 형식 오류');

    // CSV 변환
    const parser = new Parser();
    const csv = parser.parse(data);

    // 저장
    fs.writeFileSync(OUTPUT_PATH, csv, 'utf8');
    log(`✅ ${data.length}개의 데이터를 성공적으로 저장했습니다.`);

  } catch (error) {
    log(`❌ 데이터 수집 실패: ${error.message}`);
  }
}

// 실행
fetchData();
