"""
임시 파일 인메모리 저장소
- 업로드된 파일을 UUID로 임시 보관 (TTL: 30분)
- Phase 5 인증 연동 후 user_id 바인딩 예정
- 프로덕션에서는 Redis + S3 로 대체

NOTE: 서버 재시작 시 소멸. 멀티프로세스 환경 부적합.
      Phase 5 이후 Redis 캐시로 교체 예정.
"""

from __future__ import annotations

import time
import uuid
from dataclasses import dataclass


_TTL_SECONDS = 30 * 60   # 30분


@dataclass
class TempFile:
    file_id: str
    content: bytes
    filename: str
    detected_format: str
    sha256: str
    created_at: float = 0.0

    def __post_init__(self):
        if not self.created_at:
            self.created_at = time.monotonic()

    def is_expired(self) -> bool:
        return (time.monotonic() - self.created_at) > _TTL_SECONDS


_store: dict[str, TempFile] = {}


def save(content: bytes, filename: str, detected_format: str, sha256: str) -> str:
    """파일을 저장하고 file_id 반환."""
    _evict_expired()
    file_id = str(uuid.uuid4())
    _store[file_id] = TempFile(
        file_id=file_id,
        content=content,
        filename=filename,
        detected_format=detected_format,
        sha256=sha256,
    )
    return file_id


def get(file_id: str) -> TempFile | None:
    """file_id 로 파일 조회. 만료 또는 미존재 시 None."""
    _evict_expired()
    return _store.get(file_id)


def _evict_expired() -> None:
    expired = [k for k, v in _store.items() if v.is_expired()]
    for k in expired:
        del _store[k]
