"""
인증 API (사양서 §10)

POST /api/v1/auth/login    — 로그인 (Rate Limit: 10/분)
POST /api/v1/auth/refresh  — Access Token 갱신
POST /api/v1/auth/register — 사용자 등록 (Admin 전용)
GET  /api/v1/auth/me       — 현재 사용자 정보
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from jose import JWTError

from app.core.security import create_access_token, create_refresh_token, decode_token
from app.core.deps import CurrentUser, get_current_user, require_role, get_client_ip
from app.core.rate_limit import login_limiter, get_ip
from app.schemas.auth import (
    LoginRequest, TokenResponse, RefreshRequest,
    UserResponse, RegisterRequest,
)
from app.services import user_store
from app.services.audit_log import log_action
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, request: Request) -> TokenResponse:
    """
    이메일 + 비밀번호로 로그인.
    Rate Limit: 10회/분/IP (사양서 §10)
    """
    ip = get_ip(request)
    login_limiter.check(ip)   # 429 자동 발생

    user = user_store.authenticate(req.email, req.password)

    if not user:
        log_action(user_id=None, action="login_failed", client_ip=ip, status_code=401,
                   detail=req.email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이메일 또는 비밀번호가 올바르지 않습니다.",
        )

    access  = create_access_token(user.id, user.role)
    refresh = create_refresh_token(user.id)

    log_action(user_id=user.id, action="login", client_ip=ip, status_code=200)

    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(req: RefreshRequest, request: Request) -> TokenResponse:
    """Refresh Token 으로 새 Access Token 발급."""
    exc = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 Refresh Token")
    try:
        payload = decode_token(req.refresh_token)
    except JWTError:
        raise exc

    if payload.get("type") != "refresh":
        raise exc

    user_id: str | None = payload.get("sub")
    if not user_id:
        raise exc

    user = user_store.get_by_id(user_id)
    if not user or not user.is_active:
        raise exc

    access  = create_access_token(user.id, user.role)
    refresh = create_refresh_token(user.id)

    log_action(user_id=user.id, action="token_refresh",
               client_ip=get_ip(request), status_code=200)

    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/register", response_model=UserResponse,
             dependencies=[Depends(require_role("admin"))])
async def register(req: RegisterRequest, request: Request) -> UserResponse:
    """새 사용자 등록 — Admin 전용 (사양서 §10 RBAC)."""
    try:
        user = user_store.create_user(req.email, req.password, req.role)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))

    log_action(user_id=None, action="register", resource=user.id,
               client_ip=get_ip(request), status_code=201)

    return UserResponse(user_id=user.id, email=user.email, role=user.role)


@router.get("/me", response_model=UserResponse)
async def me(current: Annotated[CurrentUser, Depends(get_current_user)]) -> UserResponse:
    """현재 인증된 사용자 정보."""
    user = user_store.get_by_id(current.user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="사용자를 찾을 수 없습니다.")
    return UserResponse(user_id=user.id, email=user.email, role=user.role)
