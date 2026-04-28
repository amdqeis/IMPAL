from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Cabang, Tempat


def list_cabang(db: Session) -> list[Cabang]:
    return list(db.scalars(select(Cabang).order_by(Cabang.id_cabang)).all())


def get_cabang(db: Session, cabang_id: int) -> Cabang | None:
    return db.get(Cabang, cabang_id)


def list_tempat(db: Session, *, id_cabang: int | None = None, status_tempat: str | None = None) -> list[Tempat]:
    query = select(Tempat).order_by(Tempat.id_tempat)
    if id_cabang is not None:
        query = query.where(Tempat.id_cabang == id_cabang)
    if status_tempat is not None:
        query = query.where(Tempat.status == status_tempat)
    return list(db.scalars(query).all())


def get_tempat(db: Session, tempat_id: int) -> Tempat | None:
    return db.get(Tempat, tempat_id)
