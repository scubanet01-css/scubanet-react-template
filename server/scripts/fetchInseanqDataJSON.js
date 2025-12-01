const axios = require('axios');
const https = require('https');
const fs = require('fs');
const path = require('path');

// 🔑 API 키 (원래 사용중이던 키 그대로)
const API_KEY = 'fa031783567788e568d8010a488a6c0f9cb860d0';

// 🔄 저장 위치를 /var/www/scubanet/data 로 변경!!
const DATA_DIR = "/var/www/scubanet/data";

const endpoints = [
  {
    name: 'availability-basic',
    paginated: true,
    url: 'https://app.inseanq.com/api/v2/availability-basic',
    serverPath: `${DATA_DIR}/availability-basic.json`
  },
  {
    name: 'availability-detailed',
    paginated: true,
    url: 'https://app.inseanq.com/api/v2/availability-detailed',
    serverPath: `${DATA_DIR}/availability-detailed.json`
  },
  {
    name: 'boats',
    paginated: true,
    url: 'https://app.inseanq.com/api/v2/boats',
    serverPath: `${DATA_DIR}/boats.json`
  },
  {
    name: 'boats-details',
    paginated: true,
    url: 'https://app.inseanq.com/api/v2/boats-details',
    serverPath: `${DATA_DIR}/boats-details.json`
  }
];

// TLS 설정
const agent = new https.Agent({
  secureProtocol: 'TLSv1_2_method'
});

// 파일 저장 함수
async function saveToFile(data, filepath) {
  const dirPath = path.dirname(filepath);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  fs.writeFileSync(filepath, JSON.stringify({ data }, null, 2));
  console.log(`✅ 저장 완료: ${filepath}`);
}

// 페이지 처리
async function fetchAllPages(url) {
  let allData = [];
  let page = 1;

  while (true) {
    try {
      console.log(`📥 페이지 ${page} 요청 중...`);

      const response = await axios.get(`${url}?page=${page}`, {
        httpsAgent: agent,
        headers: {
          'api-key': API_KEY,
          'Accept': 'application/json'
        }
      });

      const pageData = response.data.data;
      console.log(`🔢 수신된 trip 수: ${pageData?.length}`);

      if (!pageData || pageData.length === 0) break;

      allData = allData.concat(pageData);

      if (page > 50) break;
      page++;

    } catch (err) {
      console.error(`❌ 페이지 ${page} 오류:`, err.message);
      break;
    }
  }

  return allData;
}

// 메인 실행
async function fetchAllEndpoints() {
  for (const ep of endpoints) {
    try {
      console.log(`🚀 [${ep.name}] API 요청 시작: ${ep.url}`);

      let data;

      if (ep.paginated) {
        data = await fetchAllPages(ep.url);
      } else {
        const res = await axios.get(ep.url, {
          httpsAgent: agent,
          headers: { 'api-key': API_KEY, 'Accept': 'application/json' }
        });
        data = res.data.data || res.data;
      }

      await saveToFile(data, ep.serverPath);

    } catch (err) {
      console.error(`❌ [${ep.name}] 요청 실패:`, err.message);
    }
  }
}

fetchAllEndpoints();
