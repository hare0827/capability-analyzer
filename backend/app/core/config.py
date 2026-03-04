from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import AnyHttpUrl
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # 앱
    ENVIRONMENT: str = "development"
    PROJECT_NAME: str = "PCA"
    API_V1_PREFIX: str = "/api/v1"

    # DB (현재 인메모리 스토어 사용 중 — PostgreSQL 전환 전까지 선택적)
    DATABASE_URL: str = ""

    # Redis (현재 인메모리 rate limiter 사용 중 — 선택적)
    REDIS_URL: str = ""

    # JWT
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    BACKEND_CORS_ORIGINS: List[AnyHttpUrl] = []

    # 파일 업로드
    MAX_UPLOAD_SIZE_MB: int = 10

    # Rate Limiting
    RATE_LIMIT_ANALYZE: str = "60/minute"   # 분석 API
    RATE_LIMIT_LOGIN: str = "10/minute"     # 로그인 API

    # S3
    S3_ENDPOINT_URL: str = ""
    S3_BUCKET_NAME: str = "pca-uploads"
    S3_ACCESS_KEY: str = ""
    S3_SECRET_KEY: str = ""
    S3_REGION: str = "ap-northeast-2"

    @property
    def max_upload_bytes(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024


settings = Settings()
