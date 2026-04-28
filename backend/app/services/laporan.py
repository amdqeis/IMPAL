from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Laporan
from app.repositories import laporan as repo
from app.repositories import users as user_repo
from app.schemas.laporan import LaporanCreate, LaporanUpdate


def list_laporan(db: Session) -> list[Laporan]:
    """Return all reports."""
    return repo.list_laporan(db)


def create_laporan(db: Session, payload: LaporanCreate) -> Laporan:
    """Create a report metadata row."""
    if not user_repo.get_user_by_id(db, payload.dibuat_oleh):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pembuat laporan tidak ditemukan")

    laporan = Laporan(**payload.model_dump())
    db.add(laporan)
    db.commit()
    db.refresh(laporan)
    return laporan


def update_laporan(db: Session, laporan_id: int, payload: LaporanUpdate) -> Laporan:
    """Patch report metadata."""
    laporan = repo.get_laporan(db, laporan_id)
    if not laporan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Laporan tidak ditemukan")

    data = payload.model_dump(exclude_unset=True)
    if "dibuat_oleh" in data and not user_repo.get_user_by_id(db, data["dibuat_oleh"]):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pembuat laporan tidak ditemukan")

    for key, value in data.items():
        setattr(laporan, key, value)

    db.commit()
    db.refresh(laporan)
    return laporan
