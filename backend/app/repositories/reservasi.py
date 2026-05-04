from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Reservasi

ACTIVE_RESERVATION_STATUSES = ("pending", "confirmed")


def list_reservasi(
    db: Session,
    *,
    id_user: int | None = None,
    status_reservasi: str | None = None,
) -> list[Reservasi]:
    query = select(Reservasi).order_by(Reservasi.id_reservasi.desc())
    if id_user is not None:
        query = query.where(Reservasi.id_user == id_user)
    if status_reservasi is not None:
        query = query.where(Reservasi.status == status_reservasi)
    return list(db.scalars(query).all())


def get_reservasi(db: Session, reservasi_id: int) -> Reservasi | None:
    return db.get(Reservasi, reservasi_id)


def list_active_reservasi_for_tempat_tanggal(db: Session, *, id_tempat: int, tanggal: date) -> list[Reservasi]:
    query = select(Reservasi).where(
        Reservasi.id_tempat == id_tempat,
        Reservasi.tanggal == tanggal,
        Reservasi.status.in_(ACTIVE_RESERVATION_STATUSES),
    )
    return list(db.scalars(query).all())


def get_active_slot_conflict(
    db: Session,
    *,
    id_tempat: int,
    id_jadwal: int,
    tanggal: date,
    exclude_reservasi_id: int | None = None,
) -> Reservasi | None:
    query = select(Reservasi).where(
        Reservasi.id_tempat == id_tempat,
        Reservasi.id_jadwal == id_jadwal,
        Reservasi.tanggal == tanggal,
        Reservasi.status.in_(ACTIVE_RESERVATION_STATUSES),
    )
    if exclude_reservasi_id is not None:
        query = query.where(Reservasi.id_reservasi != exclude_reservasi_id)
    return db.scalars(query).first()
