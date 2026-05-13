def create_app():
    import logging
    from time import perf_counter

    from fastapi import FastAPI
    from fastapi import Request
    from fastapi.middleware.cors import CORSMiddleware
    from starlette.middleware.sessions import SessionMiddleware

    from app.api import api_router
    from app.core.config import settings

    request_logger = logging.getLogger("app.request")
    if not request_logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter("%(message)s"))
        request_logger.addHandler(handler)
    request_logger.setLevel(logging.INFO)
    request_logger.propagate = False
    db_logger = logging.getLogger("app.db")
    if not db_logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter("%(message)s"))
        db_logger.addHandler(handler)
    db_logger.setLevel(logging.INFO)
    db_logger.propagate = False

    app = FastAPI(
        title=settings.app_name,
        debug=settings.app_debug,
        description=(
            "API reservasi IMPAL dengan JWT authentication, permission-based access control, "
            "dan dokumentasi OpenAPI per domain."
        ),
        version="1.0.0",
    )

    if settings.CORS_ORIGINS:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.CORS_ORIGINS,
            allow_credentials=settings.CORS_SUPPORTS_CREDENTIALS,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    app.add_middleware(
        SessionMiddleware,
        secret_key=settings.SESSION_SECRET_KEY,
        session_cookie="session",
        max_age=settings.SESSION_MAX_AGE,
        same_site=settings.SESSION_COOKIE_SAMESITE,
        https_only=settings.SESSION_COOKIE_SECURE or settings.app_env == "production",
    )

    app.include_router(api_router, prefix="/api")

    @app.middleware("http")
    async def log_request_duration(request: Request, call_next):
        started_at = perf_counter()
        response = await call_next(request)
        duration_ms = (perf_counter() - started_at) * 1000
        request_logger.info(
            "%s %s %s response_total %.2fms",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
        )
        return response

    @app.get(
        "/",
        tags=["healthcheck"],
        summary="Healthcheck API",
        description="Memastikan aplikasi FastAPI aktif dan dapat menerima request.",
    )
    def read_root() -> dict[str, str]:
        """Return a simple API health message."""
        return {"message": "IMPAL Backend API aktif"}

    @app.get(
        "/health",
        tags=["healthcheck"],
        summary="Container healthcheck",
        description="Endpoint ringan untuk Docker, CI/CD, dan reverse proxy checks.",
    )
    def healthcheck() -> dict[str, str]:
        """Return a stable health response for deployment checks."""
        return {"status": "ok"}

    return app
