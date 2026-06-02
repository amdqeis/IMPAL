import asyncio
from datetime import date, time, timedelta
import unittest
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import ValidationError
from starlette.requests import Request
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_current_session_user, get_current_user, require_permissions
from app.core.config import settings
from app.core.security import create_access_token
from app.models import Base, Cabang, Jadwal, Permission, Role, Tempat, User, UserRole
from app.schemas.auth import LoginRequest, UserCreate, UserUpdate
from app.services.auth_claims import AuthenticatedUser
from app.api.routes.auth import get_me, logout, update_user as update_user_route
from app.schemas.reservasi import ReservasiCreate
from app.services import auth as auth_service
from app.services import reservasi as reservasi_service


class QueryCounter:
    def __init__(self, engine):
        self.engine = engine
        self.count = 0

    def before_cursor_execute(self, conn, cursor, statement, parameters, context, executemany):
        self.count += 1

    def __enter__(self):
        event.listen(self.engine, "before_cursor_execute", self.before_cursor_execute)
        return self

    def __exit__(self, *args):
        event.remove(self.engine, "before_cursor_execute", self.before_cursor_execute)


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

    def _request_with_session(self, session_data: dict) -> Request:
        return Request({"type": "http", "method": "GET", "path": "/", "headers": [], "session": session_data})

    def _create_jadwal(self) -> Jadwal:
        cabang = Cabang(nama="Cabang Test", lokasi="Jakarta")
        self.db.add(cabang)
        self.db.flush()
        tempat = Tempat(id_cabang=cabang.id_cabang, nomor_meja="A01", harga=100000, status="available")
        self.db.add(tempat)
        self.db.flush()
        jadwal = Jadwal(
            id_tempat=tempat.id_tempat,
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

        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=registered.access_token)
        current_user = get_current_user(credentials, self.db)
        self.assertEqual(current_user.email, "baru@example.com")

    def test_login_eager_loads_roles_permissions_with_constant_query_count(self) -> None:
        user = self._create_user("nplusone@example.com", role=self.admin_role)
        for index in range(20):
            self.db.add(Permission(id_role=self.admin_role.id_role, nama_permission=f"admin_extra_{index}"))
        self.db.commit()
        email = user.email

        with QueryCounter(self.engine) as counter:
            logged_in = auth_service.login_user(
                self.db,
                LoginRequest(email=email, password="Password123"),
            )

        self.assertIn("manage_reservations", logged_in.permissions)
        self.assertIn("admin_extra_19", logged_in.permissions)
        self.assertLessEqual(counter.count, 4)

    def test_jwt_claim_authorization_does_not_query_roles_permissions(self) -> None:
        token, _ = create_access_token(
            subject="999",
            secret_key=settings.SECRET_KEY,
            algorithm=settings.jwt_algorithm,
            expires_delta=timedelta(minutes=5),
            claims={
                "email": "claim@example.com",
                "name": "Claim User",
                "no_hp": "081200000099",
                "roles": ["user"],
                "permissions": ["view_reservations"],
            },
        )
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

        with QueryCounter(self.engine) as counter:
            current_user = get_current_user(credentials, self.db)

        self.assertEqual(current_user.id_user, 999)
        self.assertEqual(current_user.email, "claim@example.com")
        self.assertEqual(counter.count, 0)

    def test_session_authorization_does_not_query_roles_permissions(self) -> None:
        request = self._request_with_session(
            {
                "user_id": 123,
                "email": "session@example.com",
                "name": "Session User",
                "no_hp": "081200000123",
                "roles": ["user"],
                "permissions": ["view_reservations"],
            }
        )

        with QueryCounter(self.engine) as counter:
            current_user = get_current_session_user(request, None, self.db)

        self.assertEqual(current_user.id_user, 123)
        self.assertEqual(current_user.email, "session@example.com")
        self.assertEqual(counter.count, 0)

    def test_me_response_shape_from_session_user(self) -> None:
        current_user = AuthenticatedUser(
            id_user=88,
            email="me@example.com",
            nama="Me User",
            no_hp="081200000088",
            role_names=["user"],
            permissions=["view_reservations"],
        )

        response = get_me(current_user)

        self.assertEqual(response.user.id_user, 88)
        self.assertIn("user", response.roles)
        self.assertIn("view_reservations", response.permissions)
        self.assertIsNone(response.access_token)

    def test_logout_clears_session(self) -> None:
        request = self._request_with_session({"user_id": 10, "roles": ["user"], "permissions": ["view_reservations"]})

        response = logout(request)

        self.assertEqual(response.message, "Logout berhasil")
        self.assertEqual(request.session, {})

    def test_logout_is_stateless_and_client_discards_jwt(self) -> None:
        user = self._create_user("logout@example.com")
        token, _ = create_access_token(
            subject=str(user.id_user),
            secret_key=settings.SECRET_KEY,
            algorithm=settings.jwt_algorithm,
            expires_delta=timedelta(minutes=5),
        )
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

        self.assertEqual(get_current_user(credentials, self.db).id_user, user.id_user)

        response = auth_service.logout_user()
        self.assertEqual(response.message, "Logout berhasil")
        self.assertEqual(get_current_user(credentials, self.db).id_user, user.id_user)

    def test_expired_token_returns_401(self) -> None:
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
        self.assertEqual(expired.exception.detail, "Token sudah expired")

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
        payload = ReservasiCreate(
            id_user=other_user.id_user,
            id_tempat=jadwal.id_tempat,
            id_jadwal=jadwal.id_jadwal,
            tanggal=date(2026, 5, 1),
            total_harga=100000,
        )

        with self.assertRaises(HTTPException) as denied:
            reservasi_service.create_reservasi(self.db, payload, current_user=current_user)
        self.assertEqual(denied.exception.status_code, 403)

    def test_update_user_can_replace_roles(self) -> None:
        managed_user = self._create_user("managed@example.com")

        updated = auth_service.update_user(self.db, managed_user.id_user, UserUpdate(roles=["admin"]))

        self.assertEqual(updated.roles, ["admin"])
        refreshed = auth_service.get_user_access(self.db, managed_user.id_user)
        self.assertEqual(refreshed.roles, ["admin"])

    def test_update_user_payload_rejects_unknown_role(self) -> None:
        with self.assertRaises(ValidationError):
            UserUpdate(roles=["superadmin"])

    def test_route_rejects_role_change_for_non_admin_self_update(self) -> None:
        current_user = AuthenticatedUser(
            id_user=10,
            email="user@example.com",
            nama="User",
            no_hp="081200000010",
            role_names=["user"],
            permissions=[],
        )

        with self.assertRaises(HTTPException) as denied:
            asyncio.run(update_user_route(10, UserUpdate(roles=["admin"]), current_user))

        self.assertEqual(denied.exception.status_code, 403)

    def test_route_rejects_role_change_for_current_admin_session(self) -> None:
        current_user = AuthenticatedUser(
            id_user=11,
            email="admin@example.com",
            nama="Admin",
            no_hp="081200000011",
            role_names=["admin"],
            permissions=["manage_users"],
        )

        with self.assertRaises(HTTPException) as denied:
            asyncio.run(update_user_route(11, UserUpdate(roles=["owner"]), current_user))

        self.assertEqual(denied.exception.status_code, 400)

    def test_route_allows_admin_to_change_other_user_role(self) -> None:
        current_user = AuthenticatedUser(
            id_user=12,
            email="admin2@example.com",
            nama="Admin Dua",
            no_hp="081200000012",
            role_names=["admin"],
            permissions=["manage_users"],
        )
        expected = auth_service.build_user_access(self._create_user("target@example.com", role=self.user_role))

        with patch("app.api.routes.auth.run_db", new=AsyncMock(return_value=expected)) as mocked_run_db:
            result = asyncio.run(update_user_route(expected.id_user, UserUpdate(roles=["admin"]), current_user))

        self.assertEqual(result.roles, expected.roles)
        mocked_run_db.assert_awaited_once()


if __name__ == "__main__":
    unittest.main()
