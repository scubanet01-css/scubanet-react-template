#!/bin/bash
set -e

echo "🚀 ScubaNet React 자동 배포 시작"

CLIENT_DIR="/root/scubanet-react-template/client"
DEPLOY_DIR="/var/www/scubanet"

cd $CLIENT_DIR

echo "📦 1) 현재 코드 기반으로 React 빌드 중..."
npm run build

echo "🧹 2) 기존 배포 폴더 정리..."
rm -rf $DEPLOY_DIR/*
mkdir -p $DEPLOY_DIR

echo "📁 3) 새 빌드 파일 복사..."
cp -r dist/* $DEPLOY_DIR/

echo "🔄 4) nginx 재시작..."
systemctl restart nginx

echo "✅ 배포 완료!"
echo "🌐 접속 URL: https://210.114.22.82"
echo "🕒 $(date)"
