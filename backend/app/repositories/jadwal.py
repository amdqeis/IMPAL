from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Jadwal, Tempat


def list_jadwal(db: Session, *, id_tempat: int | None = None, tanggal: date | None = None) -> list[Jadwal]:
    query = select(Jadwal).order_by(Jadwal.tanggal, Jadwal.jam_mulai)
    if id_tempat is not None:
        query = query.where(Jadwal.id_tempat == id_tempat)
    if tanggal is not None:
        query = query.where(Jadwal.tanggal == tanggal)
    return list(db.scalars(query).all())


def list_jadwal_tersedia(db: Session) -> list[Jadwal]:
    query = select(Jadwal).join(Tempat).where(Tempat.status == "available").order_by(Jadwal.tanggal, Jadwal.jam_mulai)
    return list(db.scalars(query).all())


def get_jadwal(db: Session, jadwal_id: int) -> Jadwal | None:
    return db.get(Jadwal, jadwal_id)
