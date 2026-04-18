def create_app():
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware

    from app.api import api_router
    from app.core.config import settings

    app = FastAPI(title=settings.app_name, debug=settings.app_debug)

    if settings.CORS_ORIGINS:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.CORS_ORIGINS,
            allow_credentials=settings.CORS_SUPPORTS_CREDENTIALS,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    app.include_router(api_router, prefix="/api")

    @app.get("/", tags=["healthcheck"])
    def read_root() -> dict[str, str]:
        return {"message": "IMPAL Backend API aktif"}

    return app
