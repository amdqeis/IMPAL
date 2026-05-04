import unittest

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.models import Base, Cabang, Tempat
from app.services import master_data as master_data_service


class MasterDataServiceTest(unittest.TestCase):
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

    def _create_cabang(self, *, nama: str = "Cabang Test") -> Cabang:
        cabang = Cabang(nama=nama, lokasi="Jakarta")
        self.db.add(cabang)
        self.db.commit()
        self.db.refresh(cabang)
        return cabang

    def _create_tempat(self, cabang: Cabang, *, nomor_meja: str = "A01") -> Tempat:
        tempat = Tempat(id_cabang=cabang.id_cabang, nomor_meja=nomor_meja, harga=100000, status="available")
        self.db.add(tempat)
        self.db.commit()
        self.db.refresh(tempat)
        return tempat

    def test_delete_cabang_removes_branch_and_related_tempat(self) -> None:
        cabang = self._create_cabang()
        tempat = self._create_tempat(cabang)

        master_data_service.delete_cabang(self.db, cabang.id_cabang)

        self.assertIsNone(self.db.get(Cabang, cabang.id_cabang))
        self.assertIsNone(self.db.get(Tempat, tempat.id_tempat))

    def test_delete_cabang_returns_404_when_not_found(self) -> None:
        with self.assertRaises(HTTPException) as exc:
            master_data_service.delete_cabang(self.db, 999)

        self.assertEqual(exc.exception.status_code, 404)
        self.assertEqual(exc.exception.detail, "Cabang tidak ditemukan")

    def test_delete_tempat_removes_table(self) -> None:
        cabang = self._create_cabang()
        tempat = self._create_tempat(cabang)

        master_data_service.delete_tempat(self.db, tempat.id_tempat)

        self.assertIsNone(self.db.get(Tempat, tempat.id_tempat))
        self.assertIsNotNone(self.db.get(Cabang, cabang.id_cabang))

    def test_delete_tempat_returns_404_when_not_found(self) -> None:
        with self.assertRaises(HTTPException) as exc:
            master_data_service.delete_tempat(self.db, 999)

        self.assertEqual(exc.exception.status_code, 404)
        self.assertEqual(exc.exception.detail, "Tempat tidak ditemukan")


if __name__ == "__main__":
    unittest.main()
