from datetime import timedelta
import unittest

from app import create_app
from app.core.config import settings
from app.core.security import create_access_token, decode_access_token, hash_password, needs_password_rehash, verify_password


class BackendSmokeTest(unittest.TestCase):
    def test_openapi_schema_contains_documented_routes_and_auth_scheme(self) -> None:
        app = create_app()
        schema = app.openapi()

        self.assertIn("/api/auth/login", schema["paths"])
        self.assertIn("/api/auth/logout", schema["paths"])
        self.assertIn("/api/master-data/cabang/{cabang_id}", schema["paths"])
        self.assertIn("delete", schema["paths"]["/api/master-data/cabang/{cabang_id}"])
        self.assertIn("/api/jadwal/{jadwal_id}", schema["paths"])
        self.assertIn("delete", schema["paths"]["/api/jadwal/{jadwal_id}"])
        self.assertIn("/api/jadwal/availability", schema["paths"])
        self.assertIn("/api/reservasi/", schema["paths"])
        self.assertIn("/api/pembayaran/", schema["paths"])
        self.assertIn("HTTPBearer", schema["components"]["securitySchemes"])

    def test_jwt_access_token_round_trip(self) -> None:
        token, expires_at = create_access_token(
            subject="1",
            secret_key=settings.SECRET_KEY,
            algorithm=settings.jwt_algorithm,
            expires_delta=timedelta(minutes=5),
            claims={"email": "user@example.com", "roles": ["user"], "permissions": ["view_reservations"]},
        )

        payload = decode_access_token(token, secret_key=settings.SECRET_KEY, algorithms=[settings.jwt_algorithm])

        self.assertEqual(payload["sub"], "1")
        self.assertEqual(payload["email"], "user@example.com")
        self.assertIn("view_reservations", payload["permissions"])
        self.assertIsNotNone(expires_at)

    def test_password_hashing_uses_bcrypt(self) -> None:
        hashed_password = hash_password("Password123")

        self.assertTrue(hashed_password.startswith("$2b$"))
        self.assertTrue(verify_password("Password123", hashed_password))
        self.assertFalse(verify_password("WrongPassword123", hashed_password))
        self.assertFalse(needs_password_rehash(hashed_password))
        self.assertTrue(needs_password_rehash("Password123"))


if __name__ == "__main__":
    unittest.main()
