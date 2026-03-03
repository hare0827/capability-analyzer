# ── Stage 1: 빌드/의존성 설치 ────────────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /build

# 시스템 의존성 (WeasyPrint: pango, cairo, harfbuzz)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ libffi-dev \
    libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz0b libcairo2 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt


# ── Stage 2: 런타임 이미지 ───────────────────────────────────────────────────
FROM python:3.11-slim

WORKDIR /app

# WeasyPrint 런타임 라이브러리
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz0b libcairo2 \
    libglib2.0-0 libpangocairo-1.0-0 \
    && rm -rf /var/lib/apt/lists/*

# 패키지 복사
COPY --from=builder /install /usr/local

# 비루트 사용자 생성 (보안 §10)
RUN groupadd --gid 1001 appgroup && \
    useradd --uid 1001 --gid appgroup --no-create-home appuser

# 애플리케이션 소스
COPY --chown=appuser:appgroup . .

# 업로드 임시 디렉터리
RUN mkdir -p /app/uploads/tmp && chown -R appuser:appgroup /app/uploads

USER appuser

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/usr/local/bin:$PATH"

EXPOSE 8000

# 프로덕션: 2 workers, graceful shutdown timeout 30s
# 개발: CMD 오버라이드로 --reload 사용
CMD ["uvicorn", "app.main:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--workers", "2", \
     "--timeout-graceful-shutdown", "30", \
     "--access-log"]
