"""
FastAPI 의존성 주입 (사양서 §10)

- get_current_user : 인증된 사용자 반환 (JWT 필수)
- require_role     : RBAC 역할 검사 (Admin / Engineer / Viewer)
- get_client_ip    : 클라이언트 IP 추출 (감사 로그용)
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError

from app.core.security import decode_token

_bearer = HTTPBearer(auto_error=False)


@dataclass
class CurrentUser:
    user_id: str
    role: str    # 'admin' | 'engineer' | 'viewer'


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> CurrentUser:
    """
    Authorization: Bearer <token> 헤더를 검증하고 사용자 정보를 반환한다.
    토큰이 없거나 만료되면 401 반환.
    """
    exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="인증이 필요합니다.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not credentials:
        raise exc

    try:
        payload = decode_token(credentials.credentials)
    except JWTError:
        raise exc

    if payload.get("type") != "access":
        raise exc

    user_id: str | None = payload.get("sub")
    role: str = payload.get("role", "viewer")

    if not user_id:
        raise exc

    return CurrentUser(user_id=user_id, role=role)


def require_role(*roles: str):
    """
    RBAC 데코레이터 팩토리 (사양서 §10).

    사용 예:
        @router.delete("/{id}", dependencies=[Depends(require_role("admin", "engineer"))])
    """
    async def _check(user: Annotated[CurrentUser, Depends(get_current_user)]):
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"이 작업에는 {' 또는 '.join(roles)} 권한이 필요합니다.",
            )
        return user
    return _check


def get_client_ip(request: Request) -> str:
    """X-Forwarded-For 헤더 우선, 없으면 직접 연결 IP."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"
