"""
분석 이력 인메모리 저장소
- 서버 재시작 시 소멸 (Phase 5에서 PostgreSQL로 교체 예정)
- user_id별 이력 관리
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class HistoryRecord:
    id: str
    user_id: str
    mode: str
    cpk: Optional[float]
    ppk: Optional[float]
    dpmo: Optional[float]
    part_number: Optional[str]
    created_at: str  # ISO 8601


_store: list[HistoryRecord] = []


def add(record: HistoryRecord) -> None:
    _store.append(record)
    # 사용자당 최대 200건 유지
    user_records = [r for r in _store if r.user_id == record.user_id]
    if len(user_records) > 200:
        oldest = user_records[0]
        _store.remove(oldest)


def list_by_user(user_id: str, page: int = 1, page_size: int = 20) -> tuple[list[HistoryRecord], int]:
    user_records = [r for r in reversed(_store) if r.user_id == user_id]
    total = len(user_records)
    start = (page - 1) * page_size
    return user_records[start:start + page_size], total


def get_by_id(record_id: str) -> Optional[HistoryRecord]:
    return next((r for r in _store if r.id == record_id), None)


def delete_by_id(record_id: str, user_id: str) -> bool:
    """자신의 이력만 삭제 가능. 삭제 성공 시 True."""
    record = get_by_id(record_id)
    if record and record.user_id == user_id:
        _store.remove(record)
        return True
    return False
