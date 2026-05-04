from datetime import date

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Jadwal
from app.repositories import jadwal as jadwal_repo
from app.repositories import master_data as master_repo
from app.repositories import reservasi as reservasi_repo
from app.schemas.jadwal import JadwalCreate, JadwalUpdate


def list_jadwal(db: Session, *, id_tempat: int | None = None) -> list[Jadwal]:
    """Return schedules filtered by table."""
    return jadwal_repo.list_jadwal(db, id_tempat=id_tempat)


def list_jadwal_tersedia(db: Session) -> list[Jadwal]:
    """Return schedules whose table status is available."""
    return jadwal_repo.list_jadwal_tersedia(db)


def list_jadwal_availability(db: Session, *, id_tempat: int, tanggal: date) -> list[dict]:
    """Return schedule slots with availability for one table and date."""
    if not master_repo.get_tempat(db, id_tempat):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tempat tidak ditemukan")

    jadwal_list = jadwal_repo.list_jadwal(db, id_tempat=id_tempat)
    reservasi_aktif = reservasi_repo.list_active_reservasi_for_tempat_tanggal(
        db,
        id_tempat=id_tempat,
        tanggal=tanggal,
    )
    booked_jadwal_ids = {reservasi.id_jadwal for reservasi in reservasi_aktif}

    # Availability dicek dari reservasi aktif pada tanggal pilihan, bukan dari tabel jadwal.
    return [
        {
            "id_jadwal": jadwal.id_jadwal,
            "id_tempat": jadwal.id_tempat,
            "jam_mulai": jadwal.jam_mulai,
            "jam_selesai": jadwal.jam_selesai,
            "available": jadwal.id_jadwal not in booked_jadwal_ids,
        }
        for jadwal in jadwal_list
    ]


def checkAvailability(db: Session, id_tempat: int, tanggal: date) -> bool:
    """Check if any slot is available for a given table and date."""
    return any(slot["available"] for slot in list_jadwal_availability(db, id_tempat=id_tempat, tanggal=tanggal))


def create_jadwal(db: Session, payload: JadwalCreate) -> Jadwal:
    """Create a schedule for an existing table."""
    if not master_repo.get_tempat(db, payload.id_tempat):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tempat tidak ditemukan")

    jadwal = Jadwal(**payload.model_dump())
    db.add(jadwal)
    db.commit()
    db.refresh(jadwal)
    return jadwal


def update_jadwal(db: Session, jadwal_id: int, payload: JadwalUpdate) -> Jadwal:
    """Patch schedule data."""
    jadwal = jadwal_repo.get_jadwal(db, jadwal_id)
    if not jadwal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Jadwal tidak ditemukan")

    data = payload.model_dump(exclude_unset=True)
    if "id_tempat" in data and not master_repo.get_tempat(db, data["id_tempat"]):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tempat tidak ditemukan")

    for key, value in data.items():
        setattr(jadwal, key, value)

    db.commit()
    db.refresh(jadwal)
    return jadwal


def delete_jadwal(db: Session, jadwal_id: int) -> None:
    """Delete a schedule."""
    jadwal = jadwal_repo.get_jadwal(db, jadwal_id)
    if not jadwal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Jadwal tidak ditemukan")

    db.delete(jadwal)
    db.commit()
