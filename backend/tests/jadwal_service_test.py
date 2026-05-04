from datetime import time
import unittest

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.models import Base, Cabang, Jadwal, Tempat
from app.schemas.jadwal import JadwalCreate
from app.services import jadwal as jadwal_service


class JadwalServiceTest(unittest.TestCase):
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

    def _create_tempat(self) -> Tempat:
        cabang = Cabang(nama="Cabang Test", lokasi="Jakarta")
        self.db.add(cabang)
        self.db.flush()

        tempat = Tempat(id_cabang=cabang.id_cabang, nomor_meja="A01", harga=100000, status="available")
        self.db.add(tempat)
        self.db.commit()
        self.db.refresh(tempat)
        return tempat

    def _create_jadwal(self) -> Jadwal:
        tempat = self._create_tempat()
        jadwal = Jadwal(
            id_tempat=tempat.id_tempat,
            jam_mulai=time(9, 0),
            jam_selesai=time(10, 0),
        )
        self.db.add(jadwal)
        self.db.commit()
        self.db.refresh(jadwal)
        return jadwal

    def test_delete_jadwal_removes_schedule(self) -> None:
        jadwal = self._create_jadwal()

        jadwal_service.delete_jadwal(self.db, jadwal.id_jadwal)

        self.assertIsNone(self.db.get(Jadwal, jadwal.id_jadwal))

    def test_create_jadwal_does_not_require_tanggal(self) -> None:
        tempat = self._create_tempat()
        payload = JadwalCreate(id_tempat=tempat.id_tempat, jam_mulai=time(9, 0), jam_selesai=time(10, 0))

        jadwal = jadwal_service.create_jadwal(self.db, payload)

        self.assertEqual(jadwal.id_tempat, tempat.id_tempat)
        self.assertFalse(hasattr(jadwal, "tanggal"))

    def test_delete_jadwal_returns_404_when_not_found(self) -> None:
        with self.assertRaises(HTTPException) as exc:
            jadwal_service.delete_jadwal(self.db, 999)

        self.assertEqual(exc.exception.status_code, 404)
        self.assertEqual(exc.exception.detail, "Jadwal tidak ditemukan")


if __name__ == "__main__":
    unittest.main()
