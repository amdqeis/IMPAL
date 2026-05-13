from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

import bcrypt
from jose import jwt


BCRYPT_ROUNDS = 10
_BCRYPT_PREFIXES = ("$2a$", "$2b$", "$2y$")


def validate_password_strength(password: str) -> str:
    if len(password) < 8:
        raise ValueError("Password minimal terdiri dari 8 karakter")

    if not any(char.isdigit() for char in password):
        raise ValueError("Password wajib memiliki setidaknya 1 angka")

    if not any(char.isupper() for char in password):
        raise ValueError("Password wajib memiliki setidaknya 1 huruf kapital")

    return password


def hash_password(password: str) -> str:
    password_bytes = password.encode("utf-8")
    return bcrypt.hashpw(password_bytes, bcrypt.gensalt(rounds=BCRYPT_ROUNDS)).decode("utf-8")


def verify_password(password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))
    except ValueError:
        return False


def needs_password_rehash(hashed_password: str) -> bool:
    if not hashed_password.startswith(_BCRYPT_PREFIXES):
        return True

    try:
        rounds = int(hashed_password.split("$")[2])
    except (IndexError, ValueError):
        return True

    return rounds != BCRYPT_ROUNDS


def create_access_token(
    *,
    subject: str,
    secret_key: str,
    algorithm: str,
    expires_delta: timedelta,
    claims: dict[str, Any] | None = None,
) -> tuple[str, datetime]:
    """Create a signed JWT access token and return it with its expiry time."""
    now = datetime.now(UTC)
    expires_at = now + expires_delta
    payload: dict[str, Any] = {
        "sub": subject,
        "iat": int(now.timestamp()),
        "exp": expires_at,
    }
    if claims:
        payload.update(claims)
    return jwt.encode(payload, secret_key, algorithm=algorithm), expires_at


def decode_access_token(token: str, *, secret_key: str, algorithms: list[str]) -> dict[str, Any]:
    """Decode and validate a JWT access token."""
    return jwt.decode(token, secret_key, algorithms=algorithms)
