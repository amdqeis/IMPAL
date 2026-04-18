from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import Jadwal, Tempat

from .schemas import JadwalCreate, JadwalRead, JadwalUpdate


router = APIRouter(prefix="/jadwal", tags=["3. Kelola Jadwal"])


@router.get("/", response_model=list[JadwalRead])
def list_jadwal(
    id_tempat: int | None = None,
    tanggal: date | None = None,
    db: Session = Depends(get_db),
) -> list[Jadwal]:
    query = select(Jadwal).order_by(Jadwal.tanggal, Jadwal.jam_mulai)
    if id_tempat is not None:
        query = query.where(Jadwal.id_tempat == id_tempat)
    if tanggal is not None:
        query = query.where(Jadwal.tanggal == tanggal)
    return list(db.scalars(query).all())


@router.get("/tersedia", response_model=list[JadwalRead])
def list_jadwal_tersedia(db: Session = Depends(get_db)) -> list[Jadwal]:
    query = select(Jadwal).join(Tempat).where(Tempat.status == "available").order_by(Jadwal.tanggal, Jadwal.jam_mulai)
    return list(db.scalars(query).all())


@router.post("/", response_model=JadwalRead, status_code=status.HTTP_201_CREATED)
def create_jadwal(payload: JadwalCreate, db: Session = Depends(get_db)) -> Jadwal:
    if not db.get(Tempat, payload.id_tempat):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tempat tidak ditemukan")

    jadwal = Jadwal(**payload.model_dump())
    db.add(jadwal)
    db.commit()
    db.refresh(jadwal)
    return jadwal


@router.patch("/{jadwal_id}", response_model=JadwalRead)
def update_jadwal(jadwal_id: int, payload: JadwalUpdate, db: Session = Depends(get_db)) -> Jadwal:
    jadwal = db.get(Jadwal, jadwal_id)
    if not jadwal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Jadwal tidak ditemukan")

    data = payload.model_dump(exclude_unset=True)
    if "id_tempat" in data and not db.get(Tempat, data["id_tempat"]):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tempat tidak ditemukan")

    for key, value in data.items():
        setattr(jadwal, key, value)

    db.commit()
    db.refresh(jadwal)
    return jadwal
