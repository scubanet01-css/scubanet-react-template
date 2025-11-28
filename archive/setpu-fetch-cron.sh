#!/bin/bash

# 설정
SCRIPT_DIR="/root/scripts"
DATA_DIR="/root/data"
LOG_DIR="/root/logs"
SCRIPT_FILE="$SCRIPT_DIR/fetchInseanqData.js"
CSV_FILE="$DATA_DIR/availability-detailed.csv"
CRON_LOG="$LOG_DIR/cron.log"
NODE_PATH=$(which node)

# 1. 디렉토리 생성
mkdir -p "$SCRIPT_DIR"
mkdir -p "$DATA_DIR"
mkdir -p "$LOG_DIR"

# 2. Node.js 스크립트 파일 생성
cat > "$SCRIPT_FILE" <<EOF
const fs = require('fs');
const axios = require('axios');
const https = require('https');
const path = require('path');

const API_KEY = 'fa031783567788e568d8010a488a6c0f9cb860d0';
const API_URL = 'https://app.inseanq.com/api/v2/availability-detailed';
const CSV_PATH = path.resolve('${CSV_FILE}');

const agent = new https.Agent({
  secureProtocol: 'TLSv1_2_method',
});

async function fetchAndSave() {
  try {
    const response = await axios.get(API_URL, {
      headers: {
        'api-key': API_KEY,
        'Accept': 'application/json',
      },
      httpsAgent: agent,
    });

    const trips = response.data.data || [];
    if (!Array.isArray(trips)) throw new Error('Unexpected response format');

    const headers = [
      'id', 'startDate', 'endDate', 'boatName', 'productName',
      'departurePort', 'arrivalPort', 'tripStatus', 'price', 'originalPrice'
    ];

    const rows = [headers.join(',')];

    trips.forEach(trip => {
      const boat = trip.boat?.name || '';
      const product = trip.product?.name || '';
      const priceInfo = trip.ratePlansRetail?.[0]?.cabinTypes?.[0]?.occupancy?.[0] || {};
      const price = priceInfo.price || '';
      const parentPrice = priceInfo.parentPrice || '';

      const row = [
        trip.id,
        trip.startDate,
        trip.endDate,
        boat,
        product,
        trip.departurePort?.name || '',
        trip.arrivalPort?.name || '',
        trip.tripStatus,
        price,
        parentPrice
      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');

      rows.push(row);
    });

    fs.writeFileSync(CSV_PATH, rows.join('\n'));
    console.log('✅ CSV 저장 완료:', CSV_PATH);
  } catch (error) {
    console.error('❌ API 요청 또는 저장 실패:', error.message);
    process.exit(1);
  }
}

fetchAndSave();
EOF

chmod +x "$SCRIPT_FILE"

# 3. 크론탭 등록 (중복 방지)
(crontab -l 2>/dev/null | grep -v "$SCRIPT_FILE" ; echo "0 * * * * $NODE_PATH $SCRIPT_FILE >> $CRON_LOG 2>&1") | crontab -

echo "✅ 크론 등록 완료: 매시간 실행"
echo "📁 Node.js 파일 경로: $SCRIPT_FILE"
echo "📄 저장 위치: $CSV_FILE"
echo "📝 로그 경로: $CRON_LOG"
