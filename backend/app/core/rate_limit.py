"""
IP 기반 Rate Limiting (사양서 §10)
- 분석 API: 60회/분
- 로그인 API: 10회/분
- 인메모리 슬라이딩 윈도우 (프로덕션에서는 Redis 교체 권장)
"""

from __future__ import annotations

import time
from collections import defaultdict, deque
from fastapi import HTTPException, Request, status


class RateLimiter:
    """슬라이딩 윈도우 카운터 (초 단위)."""

    def __init__(self, max_calls: int, window_seconds: int = 60):
        self.max_calls = max_calls
        self.window = window_seconds
        # {ip: deque of timestamps}
        self._store: dict[str, deque[float]] = defaultdict(deque)

    def check(self, ip: str) -> None:
        """초과 시 HTTP 429 발생."""
        now = time.monotonic()
        q = self._store[ip]

        # 윈도우 밖 항목 제거
        cutoff = now - self.window
        while q and q[0] < cutoff:
            q.popleft()

        if len(q) >= self.max_calls:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"요청 한도 초과 ({self.max_calls}회/{self.window}초). 잠시 후 다시 시도하세요.",
                headers={"Retry-After": str(self.window)},
            )

        q.append(now)


# 싱글턴 인스턴스 (사양서 §10)
analyze_limiter = RateLimiter(max_calls=60,  window_seconds=60)
login_limiter   = RateLimiter(max_calls=10,  window_seconds=60)


def get_ip(request: Request) -> str:
    fwd = request.headers.get("X-Forwarded-For")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "0.0.0.0"
