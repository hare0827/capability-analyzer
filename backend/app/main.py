import time
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1 import analyze as analyze_router
from app.api.v1 import upload as upload_router
from app.api.v1 import auth as auth_router
from app.api.v1 import reports as reports_router
from app.api.v1 import history as history_router

_START_TIME = time.time()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json"
    if settings.ENVIRONMENT != "production" else None,
    docs_url=f"{settings.API_V1_PREFIX}/docs"
    if settings.ENVIRONMENT != "production" else None,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(o) for o in settings.BACKEND_CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 보안 헤더 미들웨어 (사양서 §10)
@app.middleware("http")
async def security_headers(request: Request, call_next) -> Response:
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data:; "
        "connect-src 'self'; "
        "frame-ancestors 'none';"
    )
    if request.url.scheme == "https":
        response.headers["Strict-Transport-Security"] = (
            "max-age=63072000; includeSubDomains; preload"
        )
    return response


# 라우터 등록
app.include_router(auth_router.router,    prefix=settings.API_V1_PREFIX)
app.include_router(analyze_router.router, prefix=settings.API_V1_PREFIX)
app.include_router(upload_router.router,  prefix=settings.API_V1_PREFIX)
app.include_router(reports_router.router, prefix=settings.API_V1_PREFIX)
app.include_router(history_router.router, prefix=settings.API_V1_PREFIX)


@app.api_route("/", methods=["GET", "HEAD"], include_in_schema=False)
async def root():
    """Render 헬스체크용 루트 엔드포인트 (GET + HEAD 모두 허용)."""
    return {"status": "ok"}


@app.get(f"{settings.API_V1_PREFIX}/health", include_in_schema=False)
async def health():
    """
    상태 확인 엔드포인트 (Docker healthcheck + 모니터링 시스템용).
    인증 불필요.
    """
    uptime_seconds = int(time.time() - _START_TIME)
    return {
        "status": "ok",
        "environment": settings.ENVIRONMENT,
        "uptime_seconds": uptime_seconds,
        "version": "1.0.0",
    }
