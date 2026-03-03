"""
파일 업로드 보안 레이어 (사양서 §4.2, §10)

1. 파일 크기 제한 (10 MB)
2. MIME 타입 화이트리스트 검증
3. 매직 바이트 이중 검증  ← MIME 스푸핑 방지
4. SHA-256 해시 계산
5. ClamAV 악성코드 스캔 (선택적 — 서비스 미기동 시 경고만)
"""

from __future__ import annotations

import hashlib
import socket
import struct
from dataclasses import dataclass

# 허용 MIME 타입 화이트리스트 (사양서 §4.2)
ALLOWED_MIME_TYPES: frozenset[str] = frozenset({
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",  # .xlsx
    "application/vnd.ms-excel",                                           # .xls
    "text/csv",
    "text/plain",          # CSV를 text/plain 으로 올리는 클라이언트 대응
    "application/csv",
    "application/octet-stream",  # 일부 브라우저 fallback (매직 바이트로 재검증)
})

# 매직 바이트 시그니처
_MAGIC: dict[bytes, str] = {
    b"PK\x03\x04": "xlsx",   # ZIP 기반 (xlsx)
    b"\xd0\xcf\x11\xe0": "xls",  # CFBF (xls)
}

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


@dataclass
class SecurityCheckResult:
    ok: bool
    sha256: str
    detected_format: str    # 'xlsx' | 'xls' | 'csv' | 'unknown'
    clamav_scanned: bool
    errors: list[str]


def check_file(
    content: bytes,
    filename: str,
    declared_mime: str,
    *,
    clamav_host: str = "clamav",
    clamav_port: int = 3310,
) -> SecurityCheckResult:
    """
    파일 보안 검증 파이프라인.

    Args:
        content:       파일 바이너리 전체
        filename:      원본 파일명
        declared_mime: 클라이언트가 선언한 Content-Type
        clamav_host:   ClamAV 호스트
        clamav_port:   ClamAV 포트

    Returns:
        SecurityCheckResult
    """
    errors: list[str] = []

    # 1. 파일 크기 제한
    if len(content) > MAX_FILE_SIZE_BYTES:
        return SecurityCheckResult(
            ok=False,
            sha256="",
            detected_format="unknown",
            clamav_scanned=False,
            errors=[f"파일 크기 초과: {len(content) / 1024 / 1024:.1f} MB (최대 10 MB)"],
        )

    # 2. MIME 타입 검증
    if declared_mime not in ALLOWED_MIME_TYPES:
        errors.append(f"허용되지 않는 MIME 타입: {declared_mime}")

    # 3. 매직 바이트 검증
    detected_format = _detect_format(content, filename)
    if detected_format == "unknown":
        errors.append("파일 형식을 인식할 수 없습니다. xlsx, xls, csv 만 허용됩니다.")

    # 4. SHA-256 계산
    sha256 = hashlib.sha256(content).hexdigest()

    # 5. ClamAV 스캔
    clamav_scanned = False
    if not errors:  # 형식 오류 없을 때만 스캔
        try:
            _clamav_scan(content, clamav_host, clamav_port)
            clamav_scanned = True
        except ClamAVInfectedError as e:
            errors.append(f"악성코드 감지: {e}")
            clamav_scanned = True
        except ClamAVUnavailableError:
            # ClamAV 미기동 시 스캔 생략 (경고만 — 운영환경에서는 필수)
            pass

    return SecurityCheckResult(
        ok=len(errors) == 0,
        sha256=sha256,
        detected_format=detected_format,
        clamav_scanned=clamav_scanned,
        errors=errors,
    )


# ── 내부 헬퍼 ────────────────────────────────────────────────────────────────

def _detect_format(content: bytes, filename: str) -> str:
    """매직 바이트 우선, 확장자 보조로 파일 형식 판별."""
    header = content[:4] if len(content) >= 4 else content

    for magic, fmt in _MAGIC.items():
        if header.startswith(magic):
            return fmt

    # CSV: 매직 바이트 없음 → 확장자 + 텍스트 여부로 판별
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext in ("csv", "txt"):
        # 첫 512바이트가 UTF-8/ASCII 텍스트인지 확인
        try:
            content[:512].decode("utf-8")
            return "csv"
        except UnicodeDecodeError:
            return "unknown"

    return "unknown"


class ClamAVInfectedError(Exception):
    pass


class ClamAVUnavailableError(Exception):
    pass


def _clamav_scan(content: bytes, host: str, port: int, timeout: float = 10.0) -> None:
    """
    ClamAV INSTREAM 프로토콜로 악성코드 스캔.
    감염 시 ClamAVInfectedError, 접속 불가 시 ClamAVUnavailableError.
    """
    try:
        sock = socket.create_connection((host, port), timeout=timeout)
    except OSError:
        raise ClamAVUnavailableError(f"ClamAV 접속 불가: {host}:{port}")

    with sock:
        # INSTREAM 명령: b"zINSTREAM\0" → [4바이트 청크 길이][데이터] → [0000]
        sock.sendall(b"zINSTREAM\0")
        chunk_size = struct.pack("!I", len(content))
        sock.sendall(chunk_size + content)
        sock.sendall(struct.pack("!I", 0))   # 종료 청크

        response = b""
        while True:
            part = sock.recv(1024)
            if not part:
                break
            response += part

    result = response.decode("utf-8", errors="replace").strip().rstrip("\0")
    # 응답 예: "stream: OK" 또는 "stream: Eicar-Test-Signature FOUND"
    if "FOUND" in result:
        virus_name = result.split(":")[-1].strip().replace(" FOUND", "")
        raise ClamAVInfectedError(virus_name)
