#!/usr/bin/env bash
set -euo pipefail

# ===== 설정 =====
# JSON이 현재 존재하는 "가상서버"
SOURCE_HOST="210.114.22.82"
SOURCE_USER="root"
SOURCE_DIR="/root/data/"

# JSON을 저장할 "개발서버" 로컬 경로
DEST_DIR="/root/data/"

# ssh 키 경로(필요시 수정)
SSH_KEY="/root/.ssh/id_rsa"

# 로그 경로
LOG_DIR="/var/log/inseanq-sync"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/$(date +'%Y%m%d').log"

# ===== 실행 =====
{
  echo "[$(date +'%F %T')] Start sync: ${SOURCE_USER}@${SOURCE_HOST}:${SOURCE_DIR} -> ${DEST_DIR}"

  mkdir -p "$DEST_DIR"

  rsync -avz \
    -e "ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no" \
    --delete \
    "${SOURCE_USER}@${SOURCE_HOST}:${SOURCE_DIR}" \
    "${DEST_DIR}"

  # 퍼미션 정리(정적 서빙용)
  chmod -R 644 "${DEST_DIR}"/*.json 2>/dev/null || true
  find "${DEST_DIR}" -type d -exec chmod 755 {} \;

  echo "[$(date +'%F %T')] Done."
} | tee -a "$LOG_FILE"
