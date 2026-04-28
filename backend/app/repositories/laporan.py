from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Laporan


def list_laporan(db: Session) -> list[Laporan]:
    return list(db.scalars(select(Laporan).order_by(Laporan.id_laporan.desc())).all())


def get_laporan(db: Session, laporan_id: int) -> Laporan | None:
    return db.get(Laporan, laporan_id)
