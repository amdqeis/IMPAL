from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Reservasi


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
