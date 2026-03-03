#!/usr/bin/env bash
# ============================================================
# PCA 프로덕션 배포 스크립트 (사양서 §12)
# 사용법: ./infra/scripts/deploy.sh [--skip-build] [--dry-run]
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(dirname "$SCRIPT_DIR")"
ROOT_DIR="$(dirname "$INFRA_DIR")"
COMPOSE_CMD="docker compose -f $INFRA_DIR/docker-compose.yml -f $INFRA_DIR/docker-compose.prod.yml"

SKIP_BUILD=false
DRY_RUN=false

for arg in "$@"; do
  case $arg in
    --skip-build) SKIP_BUILD=true ;;
    --dry-run)    DRY_RUN=true ;;
  esac
done

log() { echo "[$(date '+%H:%M:%S')] $*"; }
run() {
  log "RUN: $*"
  if ! $DRY_RUN; then
    eval "$*"
  fi
}

# ── 전제조건 확인 ─────────────────────────────────────────────────────────────
log "=== 배포 시작 ==="
cd "$ROOT_DIR"

if [[ ! -f .env ]]; then
  log "ERROR: .env 파일이 없습니다. .env.example 을 복사하고 값을 채우세요."
  exit 1
fi

# 필수 환경변수 확인
required_vars=(POSTGRES_PASSWORD REDIS_PASSWORD JWT_SECRET_KEY)
for var in "${required_vars[@]}"; do
  val=$(grep "^${var}=" .env | cut -d= -f2)
  if [[ "$val" == CHANGE_ME* ]] || [[ -z "$val" ]]; then
    log "ERROR: ${var} 가 기본값이거나 비어있습니다."
    exit 1
  fi
done

# ── Docker 이미지 빌드 ─────────────────────────────────────────────────────
if ! $SKIP_BUILD; then
  log "이미지 빌드 중..."
  run "$COMPOSE_CMD build --no-cache backend frontend"
fi

# ── DB 마이그레이션 ────────────────────────────────────────────────────────
log "DB 마이그레이션 실행..."
run "$COMPOSE_CMD run --rm backend alembic upgrade head"

# ── Rolling restart ────────────────────────────────────────────────────────
log "서비스 재시작 (Rolling)..."
run "$COMPOSE_CMD up -d --remove-orphans"

# ── 헬스체크 대기 ─────────────────────────────────────────────────────────
log "서비스 기동 확인 중..."
if ! $DRY_RUN; then
  for i in $(seq 1 30); do
    if curl -sf http://localhost/api/v1/health > /dev/null 2>&1; then
      log "✓ 서비스 정상 기동 확인 (${i}회 시도)"
      break
    fi
    if [[ $i -eq 30 ]]; then
      log "ERROR: 30회 시도 후 헬스체크 실패"
      exit 1
    fi
    sleep 3
  done
fi

# ── 오래된 이미지 정리 ─────────────────────────────────────────────────────
log "미사용 Docker 이미지 정리..."
run "docker image prune -f"

log "=== 배포 완료 ==="
