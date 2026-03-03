"""
인증·보안 API 테스트 (사양서 §10)

커버리지:
- POST /auth/login  : 성공, 실패, Rate Limit
- POST /auth/refresh: 성공, 유효하지 않은 토큰
- GET  /auth/me     : 성공, 비인증
- POST /auth/register: admin 성공, 권한 없음
- POST /analyze    : 비인증 401, viewer 200 (역할 제한 없음)
- POST /upload/excel: viewer 403 (engineer/admin 전용)
"""

import time
import pytest
from fastapi.testclient import TestClient

from app.core.security import create_access_token, create_refresh_token
from app.core.rate_limit import login_limiter, analyze_limiter


# ─────────────────────────── 헬퍼 ────────────────────────────────────────────

def auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


_ANALYZE_PAYLOAD = {
    "mode": "cpk",
    "data": [10.0 + i * 0.01 for i in range(30)],
    "usl": 10.5,
    "lsl": 9.5,
}


# ──────────────────────── 로그인 테스트 ──────────────────────────────────────

class TestLogin:
    def test_success_returns_tokens(self, client: TestClient):
        res = client.post("/api/v1/auth/login", json={
            "email": "engineer@pca.local",
            "password": "Engineer123!",
        })
        assert res.status_code == 200
        body = res.json()
        assert "access_token" in body
        assert "refresh_token" in body
        assert body["token_type"] == "bearer"
        assert body["expires_in"] > 0

    def test_wrong_password_returns_401(self, client: TestClient):
        res = client.post("/api/v1/auth/login", json={
            "email": "engineer@pca.local",
            "password": "WrongPassword!",
        })
        assert res.status_code == 401

    def test_unknown_email_returns_401(self, client: TestClient):
        res = client.post("/api/v1/auth/login", json={
            "email": "nobody@pca.local",
            "password": "SomePass1!",
        })
        assert res.status_code == 401

    def test_short_password_returns_422(self, client: TestClient):
        """min_length=8 Pydantic 검증"""
        res = client.post("/api/v1/auth/login", json={
            "email": "engineer@pca.local",
            "password": "short",
        })
        assert res.status_code == 422

    def test_rate_limit_triggers_429(self, client: TestClient):
        """11번째 요청에서 429 발생."""
        # login_limiter는 10/60초 — 고유 IP로 임계값 초과
        test_ip = "10.99.99.1"
        # 기존 슬롯 초기화 (직접 deque 비우기)
        login_limiter._store[test_ip].clear()

        headers = {"X-Forwarded-For": test_ip}
        for _ in range(10):
            client.post("/api/v1/auth/login",
                        json={"email": "x@x.com", "password": "xxxxxxxx"},
                        headers=headers)

        res = client.post("/api/v1/auth/login",
                          json={"email": "x@x.com", "password": "xxxxxxxx"},
                          headers=headers)
        assert res.status_code == 429
        assert "Retry-After" in res.headers

        # 정리
        login_limiter._store[test_ip].clear()


# ─────────────────────── Token Refresh 테스트 ────────────────────────────────

class TestRefresh:
    def test_valid_refresh_returns_new_tokens(self, client: TestClient):
        login = client.post("/api/v1/auth/login", json={
            "email": "admin@pca.local",
            "password": "Admin1234!",
        })
        refresh_token = login.json()["refresh_token"]

        res = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
        assert res.status_code == 200
        body = res.json()
        assert "access_token" in body
        assert "refresh_token" in body

    def test_invalid_refresh_token_returns_401(self, client: TestClient):
        res = client.post("/api/v1/auth/refresh", json={"refresh_token": "not.a.token"})
        assert res.status_code == 401

    def test_access_token_used_as_refresh_returns_401(self, client: TestClient):
        """Access Token을 Refresh 엔드포인트에 보내면 401."""
        login = client.post("/api/v1/auth/login", json={
            "email": "viewer@pca.local",
            "password": "Viewer1234!",
        })
        access_token = login.json()["access_token"]
        res = client.post("/api/v1/auth/refresh", json={"refresh_token": access_token})
        assert res.status_code == 401


# ────────────────────────── /auth/me 테스트 ───────────────────────────────────

class TestMe:
    def test_authenticated_returns_user_info(self, client: TestClient, engineer_token: str):
        res = client.get("/api/v1/auth/me", headers=auth_header(engineer_token))
        assert res.status_code == 200
        body = res.json()
        assert body["email"] == "engineer@pca.local"
        assert body["role"] == "engineer"
        assert "user_id" in body

    def test_no_token_returns_401(self, client: TestClient):
        res = client.get("/api/v1/auth/me")
        assert res.status_code == 401

    def test_invalid_token_returns_401(self, client: TestClient):
        res = client.get("/api/v1/auth/me", headers=auth_header("invalid.token.here"))
        assert res.status_code == 401


# ─────────────────────── /auth/register 테스트 ───────────────────────────────

class TestRegister:
    def test_admin_can_register_user(self, client: TestClient, admin_token: str):
        res = client.post("/api/v1/auth/register",
                          json={"email": "newuser@pca.local",
                                "password": "NewUser1234!",
                                "role": "engineer"},
                          headers=auth_header(admin_token))
        assert res.status_code == 200
        assert res.json()["email"] == "newuser@pca.local"

    def test_duplicate_email_returns_409(self, client: TestClient, admin_token: str):
        client.post("/api/v1/auth/register",
                    json={"email": "dup@pca.local", "password": "Dup12345!", "role": "viewer"},
                    headers=auth_header(admin_token))
        res = client.post("/api/v1/auth/register",
                          json={"email": "dup@pca.local", "password": "Dup12345!", "role": "viewer"},
                          headers=auth_header(admin_token))
        assert res.status_code == 409

    def test_engineer_cannot_register(self, client: TestClient, engineer_token: str):
        res = client.post("/api/v1/auth/register",
                          json={"email": "x@pca.local", "password": "Xuser123!", "role": "viewer"},
                          headers=auth_header(engineer_token))
        assert res.status_code == 403

    def test_no_token_returns_401(self, client: TestClient):
        res = client.post("/api/v1/auth/register",
                          json={"email": "y@pca.local", "password": "Yuser123!", "role": "viewer"})
        assert res.status_code == 401

    def test_invalid_role_returns_422(self, client: TestClient, admin_token: str):
        res = client.post("/api/v1/auth/register",
                          json={"email": "z@pca.local", "password": "Zuser123!", "role": "superuser"},
                          headers=auth_header(admin_token))
        assert res.status_code == 422


# ──────────────────────── /analyze RBAC 테스트 ───────────────────────────────

class TestAnalyzeAuth:
    def test_no_token_returns_401(self, client: TestClient):
        res = client.post("/api/v1/analyze", json=_ANALYZE_PAYLOAD)
        assert res.status_code == 401

    def test_invalid_token_returns_401(self, client: TestClient):
        res = client.post("/api/v1/analyze", json=_ANALYZE_PAYLOAD,
                          headers=auth_header("bad.jwt.token"))
        assert res.status_code == 401

    def test_engineer_can_analyze(self, client: TestClient, engineer_token: str):
        res = client.post("/api/v1/analyze", json=_ANALYZE_PAYLOAD,
                          headers=auth_header(engineer_token))
        assert res.status_code == 200

    def test_viewer_can_analyze(self, client: TestClient, viewer_token: str):
        """viewer는 읽기 전용이지만 분석 실행은 허용."""
        res = client.post("/api/v1/analyze", json=_ANALYZE_PAYLOAD,
                          headers=auth_header(viewer_token))
        assert res.status_code == 200

    def test_analyze_rate_limit(self, client: TestClient, engineer_token: str):
        """61번째 요청에서 429 발생."""
        test_ip = "10.88.88.1"
        analyze_limiter._store[test_ip].clear()

        headers = {**auth_header(engineer_token), "X-Forwarded-For": test_ip}
        for _ in range(60):
            client.post("/api/v1/analyze", json=_ANALYZE_PAYLOAD, headers=headers)

        res = client.post("/api/v1/analyze", json=_ANALYZE_PAYLOAD, headers=headers)
        assert res.status_code == 429

        analyze_limiter._store[test_ip].clear()


# ────────────────────── /upload RBAC 테스트 ──────────────────────────────────

class TestUploadAuth:
    def test_no_token_returns_401(self, client: TestClient):
        res = client.post("/api/v1/upload/excel",
                          files={"file": ("test.csv", b"a,b\n1,2\n", "text/csv")})
        assert res.status_code == 401

    def test_viewer_upload_returns_403(self, client: TestClient, viewer_token: str):
        """viewer 역할은 업로드 불가 (engineer/admin 전용)."""
        res = client.post("/api/v1/upload/excel",
                          files={"file": ("test.csv", b"a,b\n1,2\n", "text/csv")},
                          headers=auth_header(viewer_token))
        assert res.status_code == 403

    def test_engineer_upload_accepted(self, client: TestClient, engineer_token: str):
        """engineer는 업로드 가능 (보안 검증은 통과, 파싱 결과 확인)."""
        csv_data = b"value\n" + b"\n".join(str(i).encode() for i in range(10))
        res = client.post(
            "/api/v1/upload/excel",
            files={"file": ("data.csv", csv_data, "text/csv")},
            data={"has_header": "true"},
            headers=auth_header(engineer_token),
        )
        # 400(보안실패) 또는 200 (파싱성공) 중 하나 — 401/403은 아님
        assert res.status_code in (200, 400, 422)
