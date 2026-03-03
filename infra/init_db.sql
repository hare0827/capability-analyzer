-- PCA 초기 DB 스키마 v1.0
-- PostgreSQL 15

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 사용자 테이블
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       VARCHAR(255) UNIQUE NOT NULL,
    -- bcrypt 해시 저장 (cost >= 12)
    password_hash VARCHAR(255) NOT NULL,
    role        VARCHAR(20) NOT NULL DEFAULT 'engineer'
                    CHECK (role IN ('admin', 'engineer', 'viewer')),
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 업로드 파일 테이블
CREATE TABLE files (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uploader_id UUID REFERENCES users(id) ON DELETE SET NULL,
    original_name VARCHAR(500) NOT NULL,
    sha256_hash   CHAR(64) NOT NULL,
    s3_key        VARCHAR(1000),
    size_bytes    BIGINT NOT NULL,
    mime_type     VARCHAR(200),
    is_safe       BOOLEAN,            -- ClamAV 스캔 결과
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 분석 이력 테이블
CREATE TABLE analyses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    file_id         UUID REFERENCES files(id) ON DELETE SET NULL,
    -- 메타데이터
    project_name    VARCHAR(500),
    part_number     VARCHAR(200),
    dimension_name  VARCHAR(200),
    -- 모드
    mode            VARCHAR(10) NOT NULL CHECK (mode IN ('cpk', 'ppk', 'dual')),
    -- 규격
    usl             DOUBLE PRECISION NOT NULL,
    lsl             DOUBLE PRECISION NOT NULL,
    nominal         DOUBLE PRECISION,
    -- Cpk 전용 파라미터
    subgroup_size   SMALLINT DEFAULT 5,
    sigma_method    VARCHAR(10) DEFAULT 'rbar' CHECK (sigma_method IN ('rbar', 'sbar')),
    -- 이상치 처리
    outlier_removal BOOLEAN NOT NULL DEFAULT FALSE,
    -- 입력 데이터 (원시값 JSON 배열)
    raw_data        JSONB NOT NULL,
    -- 분석 결과 (엔진 출력 전체)
    result_json     JSONB NOT NULL,
    -- 감사
    client_ip       INET,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 감사 로그 테이블
CREATE TABLE audit_logs (
    id          BIGSERIAL PRIMARY KEY,
    user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    action      VARCHAR(100) NOT NULL,
    resource    VARCHAR(200),
    client_ip   INET,
    status_code SMALLINT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_analyses_user_id    ON analyses(user_id);
CREATE INDEX idx_analyses_created_at ON analyses(created_at DESC);
CREATE INDEX idx_analyses_mode       ON analyses(mode);
CREATE INDEX idx_audit_logs_user_id  ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created  ON audit_logs(created_at DESC);
CREATE INDEX idx_files_sha256        ON files(sha256_hash);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
