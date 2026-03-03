"""
테스트 공용 픽스처 (pytest conftest)

환경변수를 먼저 설정한 뒤 app 모듈을 임포트해야 한다.
"""

import os

# ── 테스트용 환경변수 (app 임포트 전) ───────────────────────────────────────
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_pca.db")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/1")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-ci-only-32ch!!")

import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture(scope="session")
def client() -> TestClient:
    """FastAPI TestClient (세션 범위)."""
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c


@pytest.fixture
def admin_token(client: TestClient) -> str:
    """admin 계정 Access Token."""
    res = client.post("/api/v1/auth/login", json={
        "email": "admin@pca.local",
        "password": "Admin1234!",
    })
    assert res.status_code == 200, res.text
    return res.json()["access_token"]


@pytest.fixture
def engineer_token(client: TestClient) -> str:
    """engineer 계정 Access Token."""
    res = client.post("/api/v1/auth/login", json={
        "email": "engineer@pca.local",
        "password": "Engineer123!",
    })
    assert res.status_code == 200, res.text
    return res.json()["access_token"]


@pytest.fixture
def viewer_token(client: TestClient) -> str:
    """viewer 계정 Access Token."""
    res = client.post("/api/v1/auth/login", json={
        "email": "viewer@pca.local",
        "password": "Viewer1234!",
    })
    assert res.status_code == 200, res.text
    return res.json()["access_token"]
