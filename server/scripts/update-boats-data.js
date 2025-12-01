const { exec } = require('child_process');
const path = require('path');

const API_KEY = process.env.INSEANQ_API_KEY || 'fa031783567788e568d8010a488a6c0f9cb860d0';

const endpoints = [
  { url: 'https://app.inseanq.com/api/v2/boats', file: '/root/data/boats.json' },
  { url: 'https://app.inseanq.com/api/v2/boats-details', file: '/root/data/boats-details.json' }
];

endpoints.forEach(({ url, file }) => {
  const cmd = `curl -s -H "api-key: ${API_KEY}" -H "Accept: application/json" "${url}" -o "${file}"`;
  console.log(`📦 다운로드: ${url} → ${file}`);
  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ 다운로드 실패: ${url}`);
      console.error(error);
      return;
    }
    console.log(`✅ 저장 완료: ${file}`);
  });
});
