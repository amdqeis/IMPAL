from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import Jadwal, Reservasi, User

from .schemas import ReservasiCreate, ReservasiRead, ReservasiUpdateStatus


router = APIRouter(prefix="/reservasi", tags=["4. Reservasi"])


@router.get("/", response_model=list[ReservasiRead])
def list_reservasi(
    id_user: int | None = None,
    status_reservasi: str | None = None,
    db: Session = Depends(get_db),
) -> list[Reservasi]:
    query = select(Reservasi).order_by(Reservasi.id_reservasi.desc())
    if id_user is not None:
        query = query.where(Reservasi.id_user == id_user)
    if status_reservasi is not None:
        query = query.where(Reservasi.status == status_reservasi)
    return list(db.scalars(query).all())


@router.post("/", response_model=ReservasiRead, status_code=status.HTTP_201_CREATED)
def create_reservasi(payload: ReservasiCreate, db: Session = Depends(get_db)) -> Reservasi:
    if not db.get(User, payload.id_user):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User tidak ditemukan")
    if not db.get(Jadwal, payload.id_jadwal):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Jadwal tidak ditemukan")

    reservasi = Reservasi(**payload.model_dump())
    db.add(reservasi)
    db.commit()
    db.refresh(reservasi)
    return reservasi


@router.patch("/{reservasi_id}/status", response_model=ReservasiRead)
def update_status_reservasi(
    reservasi_id: int,
    payload: ReservasiUpdateStatus,
    db: Session = Depends(get_db),
) -> Reservasi:
    reservasi = db.get(Reservasi, reservasi_id)
    if not reservasi:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservasi tidak ditemukan")

    reservasi.status = payload.status
    db.commit()
    db.refresh(reservasi)
    return reservasi
