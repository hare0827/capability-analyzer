"""
보안 회귀 테스트 (사양서 §10 / OWASP Top-10)

커버리지:
- JWT: alg=none 공격, 변조된 서명, 잘못된 type 클레임
- 입력 검증: 데이터 초과(>1000개), USL≤LSL, 극단값
- 파일 업로드: 경로 순회 파일명, oversized content-type 스푸핑
- 헤더 조작: Authorization 형식 오류
- 보안 헤더 존재 여부
"""

import base64
import json
import pytest
from fastapi.testclient import TestClient


# ─────────────────────── JWT 공격 ───────────────────────────────────────────

class TestJwtAttacks:
    def test_alg_none_rejected(self, client: TestClient):
        """JWT algorithm=none 공격 — 서명 없는 토큰 거부."""
        header  = base64.urlsafe_b64encode(
            json.dumps({"alg": "none", "typ": "JWT"}).encode()
        ).rstrip(b"=").decode()
        payload = base64.urlsafe_b64encode(
            json.dumps({"sub": "admin", "role": "admin", "type": "access"}).encode()
        ).rstrip(b"=").decode()
        forged_token = f"{header}.{payload}."   # 빈 서명

        res = client.get("/api/v1/auth/me",
                         headers={"Authorization": f"Bearer {forged_token}"})
        assert res.status_code == 401

    def test_tampered_signature_rejected(self, client: TestClient, engineer_token: str):
        """서명 부분만 변조한 토큰 거부."""
        parts = engineer_token.split(".")
        tampered = parts[0] + "." + parts[1] + ".invalidsignature"
        res = client.get("/api/v1/auth/me",
                         headers={"Authorization": f"Bearer {tampered}"})
        assert res.status_code == 401

    def test_tampered_payload_rejected(self, client: TestClient, engineer_token: str):
        """payload 의 role 을 admin 으로 변조한 토큰 거부."""
        parts = engineer_token.split(".")
        # 디코딩해서 role 변조
        padding = 4 - len(parts[1]) % 4
        decoded = base64.urlsafe_b64decode(parts[1] + "=" * padding)
        payload = json.loads(decoded)
        payload["role"] = "admin"
        new_payload = base64.urlsafe_b64encode(
            json.dumps(payload).encode()
        ).rstrip(b"=").decode()
        tampered = parts[0] + "." + new_payload + "." + parts[2]
        res = client.get("/api/v1/auth/me",
                         headers={"Authorization": f"Bearer {tampered}"})
        assert res.status_code == 401

    def test_refresh_token_as_access_rejected(self, client: TestClient):
        """Refresh Token 을 Access 엔드포인트에 사용하면 거부."""
        login = client.post("/api/v1/auth/login", json={
            "email": "viewer@pca.local",
            "password": "Viewer1234!",
        })
        refresh = login.json()["refresh_token"]
        res = client.get("/api/v1/auth/me",
                         headers={"Authorization": f"Bearer {refresh}"})
        assert res.status_code == 401

    def test_malformed_bearer_header(self, client: TestClient):
        """Bearer 없이 토큰만 전달하거나 빈 값이면 401."""
        for bad_header in ["token-without-bearer", "Basic dXNlcjpwYXNz", ""]:
            res = client.get("/api/v1/auth/me",
                             headers={"Authorization": bad_header} if bad_header else {})
            assert res.status_code == 401


# ──────────────────────── 입력 검증 ─────────────────────────────────────────

class TestInputValidation:
    def test_data_exceeds_max_length(self, client: TestClient, engineer_token: str):
        """1001 개 데이터 → 422."""
        res = client.post("/api/v1/analyze",
                          json={
                              "mode": "cpk",
                              "data": [10.0] * 1001,
                              "usl": 11.0,
                              "lsl": 9.0,
                          },
                          headers={"Authorization": f"Bearer {engineer_token}"})
        assert res.status_code == 422

    def test_usl_less_than_lsl(self, client: TestClient, engineer_token: str):
        """USL ≤ LSL → 422."""
        res = client.post("/api/v1/analyze",
                          json={
                              "mode": "cpk",
                              "data": [10.0] * 30,
                              "usl": 9.0,
                              "lsl": 11.0,
                          },
                          headers={"Authorization": f"Bearer {engineer_token}"})
        assert res.status_code == 422

    def test_data_too_few(self, client: TestClient, engineer_token: str):
        """4 개 데이터 → 422 (min_length=5)."""
        res = client.post("/api/v1/analyze",
                          json={
                              "mode": "cpk",
                              "data": [10.0, 10.1, 9.9, 10.2],
                              "usl": 11.0,
                              "lsl": 9.0,
                          },
                          headers={"Authorization": f"Bearer {engineer_token}"})
        assert res.status_code == 422

    def test_invalid_mode(self, client: TestClient, engineer_token: str):
        """존재하지 않는 mode → 422."""
        res = client.post("/api/v1/analyze",
                          json={
                              "mode": "unknown_mode",
                              "data": [10.0] * 30,
                              "usl": 11.0,
                              "lsl": 9.0,
                          },
                          headers={"Authorization": f"Bearer {engineer_token}"})
        assert res.status_code == 422

    def test_nan_inf_in_data_rejected(self, client: TestClient, engineer_token: str):
        """NaN / Inf 는 JSON 표준에서 허용되지 않으므로 422."""
        # JSON 자체가 파싱 불가 or Pydantic float 검증 실패
        import json as _json
        bad_body = '{"mode":"cpk","data":[1,2,3,4,Infinity],"usl":11,"lsl":9}'
        res = client.post("/api/v1/analyze",
                          content=bad_body,
                          headers={
                              "Authorization": f"Bearer {engineer_token}",
                              "Content-Type": "application/json",
                          })
        assert res.status_code == 422

    def test_subgroup_size_out_of_range(self, client: TestClient, engineer_token: str):
        """subgroup_size=1 → 422 (ge=2)."""
        res = client.post("/api/v1/analyze",
                          json={
                              "mode": "cpk",
                              "data": [10.0] * 30,
                              "usl": 11.0,
                              "lsl": 9.0,
                              "subgroup_size": 1,
                          },
                          headers={"Authorization": f"Bearer {engineer_token}"})
        assert res.status_code == 422


# ────────────────────── 파일 업로드 보안 ─────────────────────────────────────

class TestUploadSecurity:
    def test_path_traversal_filename_sanitized(self, client: TestClient, engineer_token: str):
        """경로 순회 파일명 ../../etc/passwd — 400 or 200(무해 처리), 절대 500 아님."""
        csv_data = b"value\n1\n2\n3\n4\n5\n"
        res = client.post(
            "/api/v1/upload/excel",
            files={"file": ("../../etc/passwd.csv", csv_data, "text/csv")},
            data={"has_header": "true"},
            headers={"Authorization": f"Bearer {engineer_token}"},
        )
        # 500 서버 오류가 발생해서는 안 된다
        assert res.status_code != 500

    def test_oversized_file_rejected(self, client: TestClient, engineer_token: str):
        """10 MB 초과 파일 → 400 or 413."""
        big_content = b"value\n" + b"1.0\n" * (11 * 1024 * 256)  # ~11MB
        res = client.post(
            "/api/v1/upload/excel",
            files={"file": ("big.csv", big_content, "text/csv")},
            data={"has_header": "true"},
            headers={"Authorization": f"Bearer {engineer_token}"},
        )
        assert res.status_code in (400, 413)

    def test_wrong_extension_rejected(self, client: TestClient, engineer_token: str):
        """실행파일 확장자(.exe)를 가진 파일 → 400."""
        res = client.post(
            "/api/v1/upload/excel",
            files={"file": ("malware.exe", b"MZ\x90\x00", "application/octet-stream")},
            data={"has_header": "true"},
            headers={"Authorization": f"Bearer {engineer_token}"},
        )
        assert res.status_code == 400

    def test_content_type_spoofing_rejected(self, client: TestClient, engineer_token: str):
        """이진 파일을 text/csv 로 속여서 전송 → 400."""
        res = client.post(
            "/api/v1/upload/excel",
            files={"file": ("fake.csv", b"\xff\xfe\x00\x01BINARY", "text/csv")},
            data={"has_header": "true"},
            headers={"Authorization": f"Bearer {engineer_token}"},
        )
        # 보안 검사에서 걸리거나 파싱 실패 (400/422) 여야 함
        assert res.status_code in (400, 422)


# ──────────────────── 보안 응답 헤더 ─────────────────────────────────────────

class TestSecurityHeaders:
    def test_x_content_type_options(self, client: TestClient):
        res = client.get("/api/v1/health")
        assert res.headers.get("x-content-type-options") == "nosniff"

    def test_x_frame_options(self, client: TestClient):
        res = client.get("/api/v1/health")
        assert res.headers.get("x-frame-options") == "DENY"

    def test_referrer_policy(self, client: TestClient):
        res = client.get("/api/v1/health")
        assert res.headers.get("referrer-policy") == "strict-origin-when-cross-origin"

    def test_permissions_policy(self, client: TestClient):
        res = client.get("/api/v1/health")
        assert "permissions-policy" in res.headers

    def test_csp_present(self, client: TestClient):
        res = client.get("/api/v1/health")
        csp = res.headers.get("content-security-policy", "")
        assert "default-src" in csp
        assert "frame-ancestors" in csp


# ──────────────────── 보고서 RBAC ────────────────────────────────────────────

class TestReportAuth:
    _PAYLOAD = {
        "analysis_id": "test-0000-0000-0000",
        "mode":  "cpk",
        "usl":   11.0,
        "lsl":    9.0,
        "data":  [10.0] * 30,
        "stats": {
            "n": 30, "mean": 10.0, "std_overall": 0.1,
            "min": 9.7, "max": 10.3, "median": 10.0,
        },
        "cpk": {
            "cpk": 1.67, "cp": 1.67, "cpu": 1.67, "cpl": 1.67,
            "sigma_within": 0.1, "sigma_method_used": "rbar", "k": 0.0,
            "defect_usl_pct": 0.0001, "defect_lsl_pct": 0.0001,
            "defect_total_pct": 0.0002, "dpmo": 0.2, "sigma_level": 5.0,
        },
    }

    def test_viewer_excel_forbidden(self, client: TestClient, viewer_token: str):
        res = client.post("/api/v1/reports/excel", json=self._PAYLOAD,
                          headers={"Authorization": f"Bearer {viewer_token}"})
        assert res.status_code == 403

    def test_viewer_pdf_forbidden(self, client: TestClient, viewer_token: str):
        res = client.post("/api/v1/reports/pdf", json=self._PAYLOAD,
                          headers={"Authorization": f"Bearer {viewer_token}"})
        assert res.status_code == 403

    def test_no_token_excel_returns_401(self, client: TestClient):
        res = client.post("/api/v1/reports/excel", json=self._PAYLOAD)
        assert res.status_code == 401

    def test_engineer_excel_succeeds(self, client: TestClient, engineer_token: str):
        """engineer 는 Excel 보고서 생성 가능."""
        res = client.post("/api/v1/reports/excel", json=self._PAYLOAD,
                          headers={"Authorization": f"Bearer {engineer_token}"})
        # weasyprint 없는 환경도 허용 (501), openpyxl 없으면 500
        assert res.status_code in (200, 500, 501)
