from datetime import date, time, timedelta
from decimal import Decimal
import unittest

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.models import Base, Cabang, Jadwal, Payment, Reservasi, Tempat, User
from app.services import master_data as master_data_service
from app.services import pembayaran as pembayaran_service
from app.services import reservasi as reservasi_service


class PaginationServiceTest(unittest.TestCase):
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

    def _create_user(self, email: str) -> User:
        user = User(nama=email.split("@")[0], email=email, password="", no_hp="081200000000")
        user.set_password("Password123")
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def test_list_cabang_returns_paginated_envelope(self) -> None:
        self.db.add_all(
            [
                Cabang(nama="SiBooking Bandung", lokasi="Bandung"),
                Cabang(nama="SiBooking Jakarta", lokasi="Jakarta"),
                Cabang(nama="SiBooking Surabaya", lokasi="Surabaya"),
            ]
        )
        self.db.commit()

        result = master_data_service.list_cabang(self.db, page=1, limit=2, search="SiBooking")

        self.assertEqual(len(result.data), 2)
        self.assertEqual(result.pagination.page, 1)
        self.assertEqual(result.pagination.limit, 2)
        self.assertEqual(result.pagination.total_items, 3)
        self.assertEqual(result.pagination.total_pages, 2)
        self.assertTrue(result.pagination.has_next)
        self.assertFalse(result.pagination.has_prev)

    def test_invalid_tempat_status_filter_returns_400(self) -> None:
        with self.assertRaises(HTTPException) as exc:
            master_data_service.list_tempat(self.db, page=1, limit=20, status_tempat="not-a-status")

        self.assertEqual(exc.exception.status_code, 400)

    def test_regular_user_payment_list_is_filtered_in_query(self) -> None:
        user = self._create_user("user@example.com")
        other_user = self._create_user("other@example.com")
        cabang = Cabang(nama="Cabang Test", lokasi="Jakarta")
        self.db.add(cabang)
        self.db.flush()
        tempat = Tempat(id_cabang=cabang.id_cabang, nomor_meja="A01", harga=100000, status="available")
        self.db.add(tempat)
        self.db.flush()
        jadwal = Jadwal(id_tempat=tempat.id_tempat, jam_mulai=time(9, 0), jam_selesai=time(10, 0))
        self.db.add(jadwal)
        self.db.flush()
        self.db.add_all(
            [
                Reservasi(
                    id_user=user.id_user,
                    id_tempat=tempat.id_tempat,
                    id_jadwal=jadwal.id_jadwal,
                    tanggal=date.today() + timedelta(days=1),
                    status="pending",
                    total_harga=Decimal("100000.00"),
                ),
                Reservasi(
                    id_user=other_user.id_user,
                    id_tempat=tempat.id_tempat,
                    id_jadwal=jadwal.id_jadwal,
                    tanggal=date.today() + timedelta(days=2),
                    status="pending",
                    total_harga=Decimal("100000.00"),
                ),
            ]
        )
        self.db.flush()
        reservasi_rows = self.db.query(Reservasi).order_by(Reservasi.id_reservasi).all()
        self.db.add_all(
            [
                Payment(id_reservasi=reservasi_rows[0].id_reservasi, amount=100000, status="paid"),
                Payment(id_reservasi=reservasi_rows[1].id_reservasi, amount=100000, status="paid"),
            ]
        )
        self.db.commit()

        result = pembayaran_service.list_pembayaran(self.db, current_user=user, page=1, limit=20)

        self.assertEqual(result.pagination.total_items, 1)
        self.assertEqual(len(result.data), 1)
        self.assertEqual(result.data[0].reservasi.id_user, user.id_user)
        self.assertEqual(result.data[0].reservasi.latest_payment_status, "paid")

    def test_reservasi_list_returns_lightweight_nested_fields_and_latest_payment(self) -> None:
        user = self._create_user("customer@example.com")
        cabang = Cabang(nama="Cabang Reservasi", lokasi="Bandung")
        self.db.add(cabang)
        self.db.flush()
        tempat = Tempat(id_cabang=cabang.id_cabang, nomor_meja="B02", harga=150000, status="available")
        self.db.add(tempat)
        self.db.flush()
        jadwal = Jadwal(id_tempat=tempat.id_tempat, jam_mulai=time(11, 0), jam_selesai=time(12, 0))
        self.db.add(jadwal)
        self.db.flush()
        reservasi = Reservasi(
            id_user=user.id_user,
            id_tempat=tempat.id_tempat,
            id_jadwal=jadwal.id_jadwal,
            tanggal=date.today() + timedelta(days=1),
            status="pending",
            total_harga=Decimal("150000.00"),
        )
        self.db.add(reservasi)
        self.db.flush()
        self.db.add(Payment(id_reservasi=reservasi.id_reservasi, amount=150000, status="paid"))
        self.db.commit()

        result = reservasi_service.list_reservasi(self.db, current_user=user, page=1, limit=20)

        self.assertEqual(result.pagination.total_items, 1)
        self.assertEqual(result.data[0].user.nama, "customer")
        self.assertEqual(result.data[0].tempat.cabang.nama, "Cabang Reservasi")
        self.assertEqual(result.data[0].jadwal.jam_mulai, time(11, 0))
        self.assertEqual(result.data[0].latest_payment_status, "paid")


if __name__ == "__main__":
    unittest.main()
