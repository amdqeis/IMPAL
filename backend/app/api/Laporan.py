from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import Laporan, User

from .schemas import LaporanCreate, LaporanRead, LaporanUpdate


router = APIRouter(prefix="/laporan", tags=["6. Laporan"])


@router.get("/", response_model=list[LaporanRead])
def list_laporan(db: Session = Depends(get_db)) -> list[Laporan]:
    return list(db.scalars(select(Laporan).order_by(Laporan.id_laporan.desc())).all())


@router.post("/", response_model=LaporanRead, status_code=status.HTTP_201_CREATED)
def create_laporan(payload: LaporanCreate, db: Session = Depends(get_db)) -> Laporan:
    if not db.get(User, payload.dibuat_oleh):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pembuat laporan tidak ditemukan")

    laporan = Laporan(**payload.model_dump())
    db.add(laporan)
    db.commit()
    db.refresh(laporan)
    return laporan


@router.patch("/{laporan_id}", response_model=LaporanRead)
def update_laporan(laporan_id: int, payload: LaporanUpdate, db: Session = Depends(get_db)) -> Laporan:
    laporan = db.get(Laporan, laporan_id)
    if not laporan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Laporan tidak ditemukan")

    data = payload.model_dump(exclude_unset=True)
    if "dibuat_oleh" in data and not db.get(User, data["dibuat_oleh"]):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pembuat laporan tidak ditemukan")

    for key, value in data.items():
        setattr(laporan, key, value)

    db.commit()
    db.refresh(laporan)
    return laporan
