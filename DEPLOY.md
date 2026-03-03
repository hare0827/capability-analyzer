# PCA 배포 가이드 (사양서 §12)

## 목차
1. [시스템 요구사항](#1-시스템-요구사항)
2. [최초 배포 (First Deploy)](#2-최초-배포)
3. [TLS 인증서 설정](#3-tls-인증서-설정)
4. [환경변수 구성](#4-환경변수-구성)
5. [DB 마이그레이션](#5-db-마이그레이션)
6. [업데이트 배포](#6-업데이트-배포)
7. [백업 & 복원](#7-백업--복원)
8. [운영 체크리스트](#8-운영-체크리스트)
9. [트러블슈팅](#9-트러블슈팅)

---

## 1. 시스템 요구사항

| 항목 | 최소 | 권장 |
|------|------|------|
| CPU | 2 Core | 4 Core |
| RAM | 4 GB | 8 GB |
| Disk | 30 GB | 100 GB |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |
| Docker | 24.x | latest |
| Docker Compose | v2.x | latest |

```bash
# Docker + Compose 설치
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

---

## 2. 최초 배포

```bash
# 1. 저장소 클론
git clone https://github.com/your-org/pca.git /opt/pca
cd /opt/pca

# 2. 환경변수 파일 생성
cp .env.example .env
nano .env   # 아래 §4 참조

# 3. TLS 인증서 생성 (§3 참조)
bash infra/scripts/gen_certs.sh yourdomain.com   # 개발/스테이징
# 또는 Let's Encrypt (프로덕션)

# 4. 최초 실행
docker compose -f infra/docker-compose.yml -f infra/docker-compose.prod.yml up -d --build

# 5. DB 마이그레이션
docker compose -f infra/docker-compose.yml -f infra/docker-compose.prod.yml \
  run --rm backend alembic upgrade head

# 6. 헬스체크
curl https://yourdomain.com/api/v1/health
```

---

## 3. TLS 인증서 설정

### 개발 / 스테이징: 자체서명 인증서

```bash
bash infra/scripts/gen_certs.sh yourdomain.com
```

생성 위치: `infra/nginx/certs/server.crt`, `server.key`

### 프로덕션: Let's Encrypt (Certbot)

1. DNS A레코드가 서버 IP를 가리키는지 확인
2. Nginx 80번 포트가 열려있는지 확인
3. 첫 인증서 발급:

```bash
docker run --rm \
  -v /opt/pca/infra/certbot/certs:/etc/letsencrypt \
  -v /opt/pca/infra/certbot/webroot:/var/www/certbot \
  certbot/certbot certonly \
  --webroot -w /var/www/certbot \
  -d yourdomain.com \
  --email admin@yourdomain.com \
  --agree-tos --no-eff-email
```

4. 자동 갱신 확인 (docker-compose.prod.yml 의 certbot 서비스가 12시간마다 실행):

```bash
docker logs pca_certbot
```

### nginx.prod.conf 도메인 치환

```bash
export DOMAIN_NAME=yourdomain.com
envsubst '${DOMAIN_NAME}' < infra/nginx/nginx.prod.conf \
  > infra/nginx/nginx.prod.conf.rendered
```

---

## 4. 환경변수 구성

`.env` 파일의 필수 값:

| 변수 | 설명 | 생성 방법 |
|------|------|----------|
| `POSTGRES_PASSWORD` | DB 비밀번호 | `openssl rand -base64 32` |
| `REDIS_PASSWORD` | Redis 비밀번호 | `openssl rand -base64 24` |
| `JWT_SECRET_KEY` | JWT 서명 키 (≥32자) | `openssl rand -hex 32` |
| `BACKEND_CORS_ORIGINS` | 허용 CORS 도메인 | `["https://yourdomain.com"]` |
| `ENVIRONMENT` | 환경 구분 | `production` |

```bash
# 비밀번호 자동 생성 예시
POSTGRES_PASSWORD=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 24)
JWT_SECRET_KEY=$(openssl rand -hex 32)
```

---

## 5. DB 마이그레이션

```bash
# 현재 마이그레이션 상태 확인
docker compose exec backend alembic current

# 최신 버전으로 업그레이드
docker compose exec backend alembic upgrade head

# 한 버전 롤백
docker compose exec backend alembic downgrade -1

# 마이그레이션 히스토리
docker compose exec backend alembic history --verbose
```

---

## 6. 업데이트 배포

```bash
# 자동 배포 스크립트
bash infra/scripts/deploy.sh

# 빌드 스킵 (이미지 변경 없을 때)
bash infra/scripts/deploy.sh --skip-build

# 드라이런 (실제 실행 없이 명령만 출력)
bash infra/scripts/deploy.sh --dry-run
```

### 수동 Rolling 업데이트

```bash
cd /opt/pca

# 1. 최신 코드 pull
git pull origin main

# 2. 이미지 재빌드
docker compose -f infra/docker-compose.yml -f infra/docker-compose.prod.yml build backend

# 3. 마이그레이션 (변경 사항 있을 때만)
docker compose -f infra/docker-compose.yml -f infra/docker-compose.prod.yml \
  run --rm backend alembic upgrade head

# 4. 재시작
docker compose -f infra/docker-compose.yml -f infra/docker-compose.prod.yml \
  up -d backend --no-deps

# 5. 헬스체크
curl https://yourdomain.com/api/v1/health
```

---

## 7. 백업 & 복원

```bash
# 즉시 백업
bash infra/scripts/backup_db.sh

# cron 등록 (매일 02:00)
echo "0 2 * * * /opt/pca/infra/scripts/backup_db.sh >> /var/log/pca_backup.log 2>&1" \
  | crontab -

# 복원
bash infra/scripts/backup_db.sh restore /var/backups/pca/pca_pca_20250101_020000.sql.gz
```

백업 보존 기간: 30일 (스크립트 내 `RETAIN_DAYS` 변수로 조정)

---

## 8. 운영 체크리스트

### 배포 전 (Pre-deploy)
- [ ] `.env` 에 `CHANGE_ME` 값이 없는지 확인
- [ ] DB 백업 완료
- [ ] 스테이징 환경에서 동일 버전 테스트 완료
- [ ] `git log` 로 변경사항 파악

### 배포 후 (Post-deploy)
- [ ] `GET /api/v1/health` → `{"status":"ok"}` 확인
- [ ] 로그인 가능 여부 확인 (admin@pca.local)
- [ ] 분석 API 응답 확인
- [ ] `docker stats` 로 메모리 사용량 확인
- [ ] `docker logs pca_backend --tail 100` 에러 없는지 확인

### 정기 점검 (Monthly)
- [ ] `docker images` 미사용 이미지 정리: `docker image prune -af`
- [ ] TLS 인증서 만료일 확인: `openssl x509 -enddate -noout -in infra/nginx/certs/server.crt`
- [ ] DB 사이즈 확인: `docker exec pca_db psql -U pca_user -c '\l+'`
- [ ] 백업 파일 정상 여부 확인
- [ ] pip-audit / npm-audit 보안 취약점 점검

---

## 9. 트러블슈팅

### Backend가 기동되지 않음
```bash
docker logs pca_backend --tail 50
# 주로 DB 연결 실패 또는 환경변수 누락
docker exec pca_backend env | grep DATABASE_URL
```

### 502 Bad Gateway
```bash
# backend 컨테이너 상태 확인
docker ps -a | grep backend
# nginx → backend 연결 확인
docker exec pca_nginx curl -s http://backend:8000/api/v1/health
```

### DB 접속 불가
```bash
docker exec pca_db pg_isready -U pca_user -d pca
docker logs pca_db --tail 30
```

### ClamAV 초기화 느림
ClamAV는 바이러스 DB 업데이트로 초기 기동에 1~3분 소요됩니다.
`start_period: 120s` 헬스체크로 대기합니다.

```bash
docker logs pca_clamav -f   # 업데이트 진행상황 확인
```

### Let's Encrypt 인증서 갱신 실패
```bash
docker logs pca_certbot
# 80 포트 ACME challenge 경로 확인
curl http://yourdomain.com/.well-known/acme-challenge/test
```
