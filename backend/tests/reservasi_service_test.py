from datetime import date, time, timedelta
from decimal import Decimal
import unittest

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.models import Base, Cabang, Jadwal, Reservasi, Tempat, User
from app.schemas.reservasi import ReservasiCreate, ReservasiUpdateStatus
from app.services import jadwal as jadwal_service
from app.services import reservasi as reservasi_service


class ReservasiServiceTest(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine(
            "sqlite+pysqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(bind=self.engine)
        self.SessionLocal = sessionmaker(bind=self.engine)
        self.db = self.SessionLocal()

    def tearDown(self) -> None:
        self.db.close()
        self.engine.dispose()

    def _create_user(self, email: str = "user@example.com") -> User:
        user = User(nama=email.split("@")[0], email=email, password="", no_hp="081200000000")
        user.set_password("Password123")
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def _create_tempat(self, *, nomor_meja: str = "A01") -> Tempat:
        cabang = Cabang(nama=f"Cabang {nomor_meja}", lokasi="Jakarta")
        self.db.add(cabang)
        self.db.flush()

        tempat = Tempat(id_cabang=cabang.id_cabang, nomor_meja=nomor_meja, harga=100000, status="available")
        self.db.add(tempat)
        self.db.commit()
        self.db.refresh(tempat)
        return tempat

    def _create_jadwal(self, tempat: Tempat) -> Jadwal:
        jadwal = Jadwal(id_tempat=tempat.id_tempat, jam_mulai=time(9, 0), jam_selesai=time(10, 0))
        self.db.add(jadwal)
        self.db.commit()
        self.db.refresh(jadwal)
        return jadwal

    def _payload(self, user: User, jadwal: Jadwal, *, tanggal: date | None = None, status: str = "pending") -> ReservasiCreate:
        return ReservasiCreate(
            id_user=user.id_user,
            id_tempat=jadwal.id_tempat,
            id_jadwal=jadwal.id_jadwal,
            tanggal=tanggal or date.today() + timedelta(days=1),
            status=status,
            total_harga=Decimal("100000.00"),
        )

    def test_availability_marks_empty_pending_and_cancelled_slots(self) -> None:
        user = self._create_user()
        tempat = self._create_tempat()
        jadwal = self._create_jadwal(tempat)
        tanggal = date.today() + timedelta(days=1)

        empty_slots = jadwal_service.list_jadwal_availability(self.db, id_tempat=tempat.id_tempat, tanggal=tanggal)
        self.assertTrue(empty_slots[0]["available"])

        reservasi_service.create_reservasi(self.db, self._payload(user, jadwal, tanggal=tanggal), current_user=user)
        booked_slots = jadwal_service.list_jadwal_availability(self.db, id_tempat=tempat.id_tempat, tanggal=tanggal)
        self.assertFalse(booked_slots[0]["available"])

        reservasi_service.update_status_reservasi(self.db, 1, ReservasiUpdateStatus(status="cancelled"))
        cancelled_slots = jadwal_service.list_jadwal_availability(self.db, id_tempat=tempat.id_tempat, tanggal=tanggal)
        self.assertTrue(cancelled_slots[0]["available"])

    def test_create_reservasi_rejects_past_date(self) -> None:
        user = self._create_user()
        jadwal = self._create_jadwal(self._create_tempat())
        payload = self._payload(user, jadwal, tanggal=date.today() - timedelta(days=1))

        with self.assertRaises(HTTPException) as exc:
            reservasi_service.create_reservasi(self.db, payload, current_user=user)

        self.assertEqual(exc.exception.status_code, 400)

    def test_create_reservasi_rejects_double_booking_for_active_status(self) -> None:
        user = self._create_user()
        jadwal = self._create_jadwal(self._create_tempat())
        payload = self._payload(user, jadwal)

        reservasi_service.create_reservasi(self.db, payload, current_user=user)

        with self.assertRaises(HTTPException) as exc:
            reservasi_service.create_reservasi(self.db, payload, current_user=user)

        self.assertEqual(exc.exception.status_code, 409)

    def test_create_reservasi_allows_cancelled_slot_to_be_reused(self) -> None:
        user = self._create_user()
        jadwal = self._create_jadwal(self._create_tempat())
        tanggal = date.today() + timedelta(days=1)
        self.db.add(
            Reservasi(
                id_user=user.id_user,
                id_tempat=jadwal.id_tempat,
                id_jadwal=jadwal.id_jadwal,
                tanggal=tanggal,
                status="cancelled",
                total_harga=Decimal("100000.00"),
            )
        )
        self.db.commit()

        reservasi = reservasi_service.create_reservasi(
            self.db,
            self._payload(user, jadwal, tanggal=tanggal),
            current_user=user,
        )

        self.assertEqual(reservasi.status, "pending")

    def test_create_reservasi_allows_slot_reuse_after_cancellation(self) -> None:
        first_user = self._create_user()
        second_user = self._create_user("second@example.com")
        jadwal = self._create_jadwal(self._create_tempat())
        tanggal = date.today() + timedelta(days=1)

        cancelled_reservasi = reservasi_service.create_reservasi(
            self.db,
            self._payload(first_user, jadwal, tanggal=tanggal),
            current_user=first_user,
        )
        reservasi_service.update_status_reservasi(
            self.db,
            cancelled_reservasi.id_reservasi,
            ReservasiUpdateStatus(status="cancelled"),
        )

        new_reservasi = reservasi_service.create_reservasi(
            self.db,
            self._payload(second_user, jadwal, tanggal=tanggal),
            current_user=second_user,
        )

        self.assertNotEqual(new_reservasi.id_reservasi, cancelled_reservasi.id_reservasi)
        self.assertEqual(new_reservasi.status, "pending")

    def test_create_reservasi_rejects_mismatched_tempat_and_jadwal(self) -> None:
        user = self._create_user()
        jadwal = self._create_jadwal(self._create_tempat(nomor_meja="A01"))
        other_tempat = self._create_tempat(nomor_meja="A02")
        payload = self._payload(user, jadwal)
        payload.id_tempat = other_tempat.id_tempat

        with self.assertRaises(HTTPException) as exc:
            reservasi_service.create_reservasi(self.db, payload, current_user=user)

        self.assertEqual(exc.exception.status_code, 400)


if __name__ == "__main__":
    unittest.main()
