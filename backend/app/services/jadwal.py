from datetime import date, time

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Jadwal
from app.repositories import jadwal as jadwal_repo
from app.repositories import master_data as master_repo
from app.repositories import reservasi as reservasi_repo
from app.schemas.common import PaginatedResponse, build_paginated_response
from app.schemas.jadwal import JadwalAvailabilityRead, JadwalCreate, JadwalRead, JadwalUpdate


def list_jadwal(
    db: Session,
    *,
    page: int,
    limit: int,
    id_tempat: int | None = None,
    id_cabang: int | None = None,
    jam_mulai: time | None = None,
    jam_selesai: time | None = None,
    sort_by: str | None = None,
    sort_order: str = "asc",
) -> PaginatedResponse[JadwalRead]:
    """Return schedules filtered by table."""
    items, total_items = jadwal_repo.list_jadwal(
        db,
        page=page,
        limit=limit,
        id_tempat=id_tempat,
        id_cabang=id_cabang,
        jam_mulai=jam_mulai,
        jam_selesai=jam_selesai,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    serialized_items = [JadwalRead.model_validate(item) for item in items]
    return build_paginated_response(serialized_items, page=page, limit=limit, total_items=total_items)


def list_jadwal_tersedia(
    db: Session,
    *,
    page: int,
    limit: int,
    id_tempat: int | None = None,
    id_cabang: int | None = None,
    jam_mulai: time | None = None,
    jam_selesai: time | None = None,
    sort_by: str | None = None,
    sort_order: str = "asc",
) -> PaginatedResponse[JadwalRead]:
    """Return schedules whose table status is available."""
    items, total_items = jadwal_repo.list_jadwal_tersedia(
        db,
        page=page,
        limit=limit,
        id_tempat=id_tempat,
        id_cabang=id_cabang,
        jam_mulai=jam_mulai,
        jam_selesai=jam_selesai,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    serialized_items = [JadwalRead.model_validate(item) for item in items]
    return build_paginated_response(serialized_items, page=page, limit=limit, total_items=total_items)


def list_jadwal_availability(
    db: Session,
    *,
    page: int,
    limit: int,
    id_tempat: int,
    tanggal: date,
    sort_by: str | None = None,
    sort_order: str = "asc",
) -> PaginatedResponse[JadwalAvailabilityRead]:
    """Return schedule slots with availability for one table and date."""
    if not master_repo.get_tempat(db, id_tempat):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tempat tidak ditemukan")

    jadwal_list, total_items = jadwal_repo.list_jadwal(
        db,
        page=page,
        limit=limit,
        id_tempat=id_tempat,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    booked_jadwal_ids = reservasi_repo.list_active_jadwal_ids_for_tempat_tanggal(
        db,
        id_tempat=id_tempat,
        tanggal=tanggal,
    )

    # Availability dicek dari reservasi aktif pada tanggal pilihan, bukan dari tabel jadwal.
    data = [
        JadwalAvailabilityRead.model_validate(
            {
                "id_jadwal": jadwal.id_jadwal,
                "id_tempat": jadwal.id_tempat,
                "jam_mulai": jadwal.jam_mulai,
                "jam_selesai": jadwal.jam_selesai,
                "available": jadwal.id_jadwal not in booked_jadwal_ids,
            }
        )
        for jadwal in jadwal_list
    ]
    return build_paginated_response(data, page=page, limit=limit, total_items=total_items)


def checkAvailability(db: Session, id_tempat: int, tanggal: date) -> bool:
    """Check if any slot is available for a given table and date."""
    availability = list_jadwal_availability(db, page=1, limit=100, id_tempat=id_tempat, tanggal=tanggal)
    return any(slot.available for slot in availability.data)


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
