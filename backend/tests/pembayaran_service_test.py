from datetime import date, time, timedelta
from decimal import Decimal
import unittest

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.models import Base, Cabang, Jadwal, Payment, PaymentLog, Reservasi, Role, Tempat, User, UserRole
from app.services import pembayaran as pembayaran_service


class PembayaranServiceTest(unittest.TestCase):
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

    def _create_reservasi(self, user: User, *, status: str = "pending") -> Reservasi:
        cabang = Cabang(nama=f"Cabang {user.id_user}", lokasi="Jakarta")
        self.db.add(cabang)
        self.db.flush()
        tempat = Tempat(id_cabang=cabang.id_cabang, nomor_meja=f"A{user.id_user}", harga=100000, status="available")
        self.db.add(tempat)
        self.db.flush()
        jadwal = Jadwal(id_tempat=tempat.id_tempat, jam_mulai=time(9, 0), jam_selesai=time(10, 0))
        self.db.add(jadwal)
        self.db.flush()
        reservasi = Reservasi(
            id_user=user.id_user,
            id_tempat=tempat.id_tempat,
            id_jadwal=jadwal.id_jadwal,
            tanggal=date.today() + timedelta(days=1),
            status=status,
            total_harga=Decimal("100000.00"),
        )
        self.db.add(reservasi)
        self.db.commit()
        self.db.refresh(reservasi)
        return reservasi

    def _create_payment(self, reservasi: Reservasi, *, status: str = "pending") -> Payment:
        payment = Payment(id_reservasi=reservasi.id_reservasi, amount=reservasi.total_harga, status=status)
        self.db.add(payment)
        self.db.commit()
        self.db.refresh(payment)
        return payment

    def test_dummy_confirm_payment_marks_payment_paid_and_reservation_confirmed(self) -> None:
        user = self._create_user("user@example.com")
        reservasi = self._create_reservasi(user, status="pending")
        payment = self._create_payment(reservasi, status="pending")

        result = pembayaran_service.dummy_confirm_payment(self.db, payment.id_payment, current_user=user)

        self.assertEqual(result.status, "paid")
        self.assertEqual(result.reservasi.status, "confirmed")
        logs = self.db.query(PaymentLog).filter(PaymentLog.id_payment == payment.id_payment).all()
        self.assertEqual(len(logs), 1)
        self.assertIn("dummy_gateway", logs[0].response)

    def test_dummy_confirm_payment_is_idempotent_when_already_paid(self) -> None:
        user = self._create_user("paid@example.com")
        reservasi = self._create_reservasi(user, status="confirmed")
        payment = self._create_payment(reservasi, status="paid")

        result = pembayaran_service.dummy_confirm_payment(self.db, payment.id_payment, current_user=user)

        self.assertEqual(result.status, "paid")
        logs = self.db.query(PaymentLog).filter(PaymentLog.id_payment == payment.id_payment).all()
        self.assertEqual(logs, [])

    def test_dummy_confirm_payment_returns_404_for_missing_payment(self) -> None:
        user = self._create_user("missing@example.com")

        with self.assertRaises(HTTPException) as exc:
            pembayaran_service.dummy_confirm_payment(self.db, 999, current_user=user)

        self.assertEqual(exc.exception.status_code, 404)

    def test_dummy_confirm_payment_rejects_other_user_payment(self) -> None:
        current_user = self._create_user("current@example.com")
        owner = self._create_user("owner@example.com")
        reservasi = self._create_reservasi(owner, status="pending")
        payment = self._create_payment(reservasi, status="pending")

        with self.assertRaises(HTTPException) as exc:
            pembayaran_service.dummy_confirm_payment(self.db, payment.id_payment, current_user=current_user)

        self.assertEqual(exc.exception.status_code, 403)

    def test_admin_can_dummy_confirm_other_user_payment(self) -> None:
        admin = self._create_user("admin@example.com", role=self.admin_role)
        owner = self._create_user("customer@example.com")
        reservasi = self._create_reservasi(owner, status="pending")
        payment = self._create_payment(reservasi, status="unpaid")

        result = pembayaran_service.dummy_confirm_payment(self.db, payment.id_payment, current_user=admin)

        self.assertEqual(result.status, "paid")
        self.assertEqual(result.reservasi.status, "confirmed")

    def test_dummy_confirm_payment_blocks_cancelled_reservation(self) -> None:
        user = self._create_user("cancelled@example.com")
        reservasi = self._create_reservasi(user, status="cancelled")
        payment = self._create_payment(reservasi, status="pending")

        with self.assertRaises(HTTPException) as exc:
            pembayaran_service.dummy_confirm_payment(self.db, payment.id_payment, current_user=user)

        self.assertEqual(exc.exception.status_code, 400)
        self.assertEqual(payment.status, "pending")


if __name__ == "__main__":
    unittest.main()
