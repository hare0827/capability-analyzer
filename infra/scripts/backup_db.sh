#!/usr/bin/env bash
# ============================================================
# PostgreSQL 백업 스크립트 (사양서 §12)
# 사용법:
#   ./backup_db.sh                  — 현재 시각 타임스탬프로 백업
#   ./backup_db.sh restore BACKUP   — 백업 파일로 복원
# 권장: cron 으로 매일 02:00 실행
#   0 2 * * * /opt/pca/infra/scripts/backup_db.sh >> /var/log/pca_backup.log 2>&1
# ============================================================
set -euo pipefail

ENV_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../" && pwd)/.env"
BACKUP_DIR="/var/backups/pca"
RETAIN_DAYS=30

# .env 에서 변수 로드
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source <(grep -E '^(POSTGRES_)' "$ENV_FILE" | sed 's/^/export /')
fi

PG_USER="${POSTGRES_USER:-pca_user}"
PG_DB="${POSTGRES_DB:-pca}"
PG_HOST="${POSTGRES_HOST:-localhost}"
PG_PORT="${POSTGRES_PORT:-5432}"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
BACKUP_FILE="$BACKUP_DIR/pca_${PG_DB}_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

case "${1:-backup}" in
  backup)
    echo "[$(date '+%H:%M:%S')] 백업 시작: $BACKUP_FILE"
    PGPASSWORD="${POSTGRES_PASSWORD:-}" \
      pg_dump -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" "$PG_DB" \
      | gzip > "$BACKUP_FILE"

    echo "[$(date '+%H:%M:%S')] ✓ 백업 완료: $(du -sh "$BACKUP_FILE" | cut -f1)"

    # 오래된 백업 삭제
    find "$BACKUP_DIR" -name "*.sql.gz" -mtime "+${RETAIN_DAYS}" -delete
    echo "[$(date '+%H:%M:%S')] ${RETAIN_DAYS}일 이상 된 백업 삭제 완료"
    ;;

  restore)
    RESTORE_FILE="${2:?복원 파일 경로를 지정하세요}"
    echo "[$(date '+%H:%M:%S')] 복원 시작: $RESTORE_FILE → $PG_DB"
    echo "WARNING: 이 작업은 현재 DB 를 덮어씁니다. 계속하시겠습니까? (yes/no)"
    read -r confirm
    [[ "$confirm" == "yes" ]] || { echo "취소"; exit 0; }

    gunzip -c "$RESTORE_FILE" | \
      PGPASSWORD="${POSTGRES_PASSWORD:-}" \
      psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" "$PG_DB"
    echo "[$(date '+%H:%M:%S')] ✓ 복원 완료"
    ;;

  *)
    echo "Usage: $0 [backup|restore BACKUP_FILE]"
    exit 1
    ;;
esac
