"""
감사 로그 서비스 (사양서 §10)
user_id + timestamp + IP + action + status_code 기록.

현재: 구조화 로그(stdout) → 프로덕션에서 DB 테이블로 교체.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

import structlog

logger = structlog.get_logger("audit")


def log_action(
    *,
    user_id: str | None,
    action: str,
    resource: str | None = None,
    client_ip: str = "unknown",
    status_code: int = 200,
    detail: str | None = None,
) -> None:
    """
    감사 이벤트를 구조화 JSON 로그로 출력한다.

    Args:
        user_id:     요청한 사용자 UUID (미인증 시 None)
        action:      동작명 (예: 'login', 'analyze', 'delete_history')
        resource:    대상 리소스 ID (예: analysis_id)
        client_ip:   클라이언트 IP
        status_code: HTTP 응답 코드
        detail:      추가 정보
    """
    logger.info(
        "audit",
        user_id=user_id,
        action=action,
        resource=resource,
        client_ip=client_ip,
        status_code=status_code,
        detail=detail,
        ts=datetime.now(timezone.utc).isoformat(),
    )
