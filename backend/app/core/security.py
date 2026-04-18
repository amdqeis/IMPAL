from __future__ import annotations

import base64
import hashlib
import hmac
import os

try:
    import bcrypt
except ImportError:  # pragma: no cover - depends on local environment
    bcrypt = None


PBKDF2_SCHEME = "pbkdf2_sha512"
PBKDF2_ITERATIONS = 310_000
SALT_BYTES = 16
_BCRYPT_PREFIXES = ("$2a$", "$2b$", "$2y$")


def _b64encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("utf-8").rstrip("=")


def _b64decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(f"{value}{padding}")


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

    if bcrypt is not None:
        return bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode("utf-8")

    salt = os.urandom(SALT_BYTES)
    digest = hashlib.pbkdf2_hmac("sha512", password_bytes, salt, PBKDF2_ITERATIONS)
    return f"{PBKDF2_SCHEME}${PBKDF2_ITERATIONS}${_b64encode(salt)}${_b64encode(digest)}"


def verify_password(password: str, hashed_password: str) -> bool:
    password_bytes = password.encode("utf-8")

    if hashed_password.startswith(_BCRYPT_PREFIXES):
        if bcrypt is None:
            return False
        return bcrypt.checkpw(password_bytes, hashed_password.encode("utf-8"))

    if hashed_password.startswith(f"{PBKDF2_SCHEME}$"):
        try:
            _, iterations, salt, expected_digest = hashed_password.split("$", maxsplit=3)
        except ValueError:
            return False

        candidate_digest = hashlib.pbkdf2_hmac(
            "sha512",
            password_bytes,
            _b64decode(salt),
            int(iterations),
        )
        return hmac.compare_digest(_b64encode(candidate_digest), expected_digest)

    return hmac.compare_digest(hashed_password, password)


def needs_password_rehash(hashed_password: str) -> bool:
    if bcrypt is not None:
        return not hashed_password.startswith(_BCRYPT_PREFIXES)
    return not hashed_password.startswith(f"{PBKDF2_SCHEME}$")
