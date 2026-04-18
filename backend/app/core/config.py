import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv


basedir = Path(__file__).resolve().parents[2]
load_dotenv(basedir / ".env")


def _to_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _to_list(value: str | None) -> list[str]:
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


class Config:
    def __init__(self) -> None:
        self.APP_NAME = os.getenv("APP_NAME", "IMPAL Backend")
        self.APP_ENV = os.getenv("APP_ENV", "development")
        self.DEBUG = _to_bool(os.getenv("APP_DEBUG"), default=True)

        self.DB_HOST = os.getenv("DB_HOST", "localhost")
        self.DB_PORT = int(os.getenv("DB_PORT", "5432"))
        self.DB_NAME = os.getenv("DB_NAME", "impal_db")
        self.DB_USER = os.getenv("DB_USER", "postgres")
        self.DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")

        self.SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL") or (
            f"postgresql+psycopg2://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )
        self.SQLALCHEMY_TRACK_MODIFICATIONS = False

        self.SECRET_KEY = os.getenv("SECRET_KEY", "change-this-secret-key")
        self.SESSION_COOKIE_HTTPONLY = True
        self.SESSION_COOKIE_SECURE = _to_bool(
            os.getenv("SESSION_COOKIE_SECURE"),
            default=False,
        )
        self.PERMANENT_SESSION_LIFETIME = timedelta(hours=24)

        self.MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.gmail.com")
        self.MAIL_PORT = int(os.getenv("MAIL_PORT", "587"))
        self.MAIL_USE_TLS = _to_bool(os.getenv("MAIL_USE_TLS"), default=True)
        self.MAIL_USERNAME = os.getenv("MAIL_USERNAME")
        self.MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")
        self.MAIL_DEFAULT_SENDER = os.getenv("MAIL_DEFAULT_SENDER") or self.MAIL_USERNAME

        self.CORS_ORIGINS = _to_list(os.getenv("FRONTEND_URL", "http://localhost:3000"))
        self.CORS_SUPPORTS_CREDENTIALS = True

    @property
    def database_url(self) -> str:
        return self.SQLALCHEMY_DATABASE_URI

    @property
    def app_name(self) -> str:
        return self.APP_NAME

    @property
    def app_env(self) -> str:
        return self.APP_ENV

    @property
    def app_debug(self) -> bool:
        return self.DEBUG


class DevelopmentConfig(Config):
    def __init__(self) -> None:
        super().__init__()
        self.DEBUG = True


class ProductionConfig(Config):
    def __init__(self) -> None:
        super().__init__()
        self.DEBUG = False
        self.SESSION_COOKIE_SECURE = True


config = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}


settings = config.get(os.getenv("APP_ENV", "default"), DevelopmentConfig)()
