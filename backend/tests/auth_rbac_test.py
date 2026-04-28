from datetime import date, time, timedelta
import unittest

from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_current_user, require_permissions
from app.core.config import settings
from app.core.security import create_access_token
from app.models import Base, Cabang, Jadwal, Permission, Role, Tempat, User, UserRole
from app.schemas.auth import LoginRequest, UserCreate
from app.schemas.reservasi import ReservasiCreate
from app.services import auth as auth_service
from app.services import reservasi as reservasi_service


class AuthRbacTest(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine(
            "sqlite+pysqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(bind=self.engine)
        self.SessionLocal = sessionmaker(bind=self.engine)
        self.db = self.SessionLocal()

        self.user_role = Role(nama_role="user")
        self.admin_role = Role(nama_role="admin")
        self.db.add_all([self.user_role, self.admin_role])
        self.db.flush()
        self.db.add_all(
            [
                Permission(id_role=self.user_role.id_role, nama_permission="create_reservations"),
                Permission(id_role=self.user_role.id_role, nama_permission="view_reservations"),
                Permission(id_role=self.admin_role.id_role, nama_permission="manage_reservations"),
            ]
        )
        self.db.commit()

    def tearDown(self) -> None:
        self.db.close()
        self.engine.dispose()

    def _create_user(self, email: str, *, role: Role | None = None) -> User:
        user = User(nama=email.split("@")[0], email=email, password="", no_hp="081200000000")
        user.set_password("Password123")
        self.db.add(user)
        self.db.flush()
        self.db.add(UserRole(id_user=user.id_user, id_role=(role or self.user_role).id_role))
        self.db.commit()
        self.db.refresh(user)
        return user

    def _create_jadwal(self) -> Jadwal:
        cabang = Cabang(nama="Cabang Test", lokasi="Jakarta")
        self.db.add(cabang)
        self.db.flush()
        tempat = Tempat(id_cabang=cabang.id_cabang, nomor_meja="A01", harga=100000, status="available")
        self.db.add(tempat)
        self.db.flush()
        jadwal = Jadwal(
            id_tempat=tempat.id_tempat,
            tanggal=date(2026, 5, 1),
            jam_mulai=time(9, 0),
            jam_selesai=time(10, 0),
        )
        self.db.add(jadwal)
        self.db.commit()
        self.db.refresh(jadwal)
        return jadwal

    def test_register_and_login_issue_jwt(self) -> None:
        registered = auth_service.register_user(
            self.db,
            UserCreate(nama="User Baru", email="baru@example.com", password="Password123", no_hp="081200000001"),
        )
        logged_in = auth_service.login_user(self.db, LoginRequest(email="baru@example.com", password="Password123"))

        self.assertIsNotNone(registered.access_token)
        self.assertIsNotNone(logged_in.access_token)
        self.assertEqual(logged_in.token, logged_in.access_token)
        self.assertIn("create_reservations", logged_in.permissions)

    def test_missing_and_expired_token_return_401(self) -> None:
        with self.assertRaises(HTTPException) as missing:
            get_current_user(None, self.db)
        self.assertEqual(missing.exception.status_code, 401)

        expired_token, _ = create_access_token(
            subject="1",
            secret_key=settings.SECRET_KEY,
            algorithm=settings.jwt_algorithm,
            expires_delta=timedelta(seconds=-1),
        )
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=expired_token)

        with self.assertRaises(HTTPException) as expired:
            get_current_user(credentials, self.db)
        self.assertEqual(expired.exception.status_code, 401)

    def test_permission_guard_returns_403_for_missing_permission(self) -> None:
        user = self._create_user("limited@example.com")
        dependency = require_permissions("manage_payments")

        with self.assertRaises(HTTPException) as denied:
            dependency(user)
        self.assertEqual(denied.exception.status_code, 403)

    def test_user_cannot_create_reservation_for_another_user(self) -> None:
        current_user = self._create_user("current@example.com")
        other_user = self._create_user("other@example.com")
        jadwal = self._create_jadwal()
        payload = ReservasiCreate(id_user=other_user.id_user, id_jadwal=jadwal.id_jadwal, total_harga=100000)

        with self.assertRaises(HTTPException) as denied:
            reservasi_service.create_reservasi(self.db, payload, current_user=current_user)
        self.assertEqual(denied.exception.status_code, 403)


if __name__ == "__main__":
    unittest.main()
