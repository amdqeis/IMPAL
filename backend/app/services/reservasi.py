from datetime import date

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import has_permission
from app.models import Reservasi, User
from app.repositories import jadwal as jadwal_repo
from app.repositories import master_data as master_repo
from app.repositories import reservasi as repo
from app.repositories import users as user_repo
from app.repositories.query_helpers import validate_value
from app.schemas.common import PaginatedResponse, build_paginated_response
from app.schemas.reservasi import ReservasiCreate, ReservasiListRead, ReservasiUpdateStatus
from app.services.permissions import MANAGE_RESERVATIONS

RESERVASI_STATUSES = {"pending", "confirmed", "completed", "cancelled", "declined", "no_show", "expired", "refunded"}


def list_reservasi(
    db: Session,
    *,
    current_user: User,
    page: int,
    limit: int,
    id_user: int | None = None,
    id_cabang: int | None = None,
    id_tempat: int | None = None,
    id_jadwal: int | None = None,
    status_reservasi: str | None = None,
    tanggal: date | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    search: str | None = None,
    sort_by: str | None = None,
    sort_order: str = "asc",
) -> PaginatedResponse[ReservasiListRead]:
    """Return reservations; regular users are scoped to their own data."""
    if not has_permission(current_user, MANAGE_RESERVATIONS):
        id_user = current_user.id_user
    normalized_status = validate_value(status_reservasi, RESERVASI_STATUSES, field_name="status_reservasi")
    items, total_items = repo.list_reservasi(
        db,
        page=page,
        limit=limit,
        id_user=id_user,
        id_cabang=id_cabang,
        id_tempat=id_tempat,
        id_jadwal=id_jadwal,
        status_reservasi=normalized_status,
        tanggal=tanggal,
        start_date=start_date,
        end_date=end_date,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    serialized_items = [ReservasiListRead.model_validate(item) for item in items]
    return build_paginated_response(serialized_items, page=page, limit=limit, total_items=total_items)


def get_reservasi_detail(db: Session, reservasi_id: int, *, current_user: User) -> ReservasiListRead:
    """Return one reservation detail, scoped to the owner unless caller can manage reservations."""
    item = repo.get_reservasi_detail(db, reservasi_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservasi tidak ditemukan")
    if item["id_user"] != current_user.id_user and not has_permission(current_user, MANAGE_RESERVATIONS):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User tidak boleh melihat reservasi ini")
    return ReservasiListRead.model_validate(item)


def _assert_tanggal_not_past(tanggal: date) -> None:
    if tanggal < date.today():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tanggal reservasi tidak boleh di masa lalu")


def _assert_slot_available(
    db: Session,
    *,
    id_tempat: int,
    id_jadwal: int,
    tanggal: date,
    exclude_reservasi_id: int | None = None,
) -> None:
    conflict = repo.get_active_slot_conflict(
        db,
        id_tempat=id_tempat,
        id_jadwal=id_jadwal,
        tanggal=tanggal,
        exclude_reservasi_id=exclude_reservasi_id,
    )
    if conflict:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Slot jadwal sudah dipesan")


def create_reservasi(db: Session, payload: ReservasiCreate, *, current_user: User) -> Reservasi:
    """Create a reservation for the current user unless caller can manage reservations."""
    if payload.id_user != current_user.id_user and not has_permission(current_user, MANAGE_RESERVATIONS):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User hanya bisa membuat reservasi miliknya sendiri")

    _assert_tanggal_not_past(payload.tanggal)

    if not user_repo.get_user_by_id(db, payload.id_user):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User tidak ditemukan")
    if not master_repo.get_tempat(db, payload.id_tempat):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tempat tidak ditemukan")

    jadwal = jadwal_repo.get_jadwal(db, payload.id_jadwal)
    if not jadwal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Jadwal tidak ditemukan")
    if jadwal.id_tempat != payload.id_tempat:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Jadwal tidak sesuai dengan tempat")

    if payload.status in repo.ACTIVE_RESERVATION_STATUSES:
        _assert_slot_available(
            db,
            id_tempat=payload.id_tempat,
            id_jadwal=payload.id_jadwal,
            tanggal=payload.tanggal,
        )

    reservasi = Reservasi(**payload.model_dump())
    db.add(reservasi)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Slot jadwal sudah dipesan") from exc
    db.refresh(reservasi)
    return reservasi


def update_status_reservasi(db: Session, reservasi_id: int, payload: ReservasiUpdateStatus) -> Reservasi:
    """Update reservation status."""
    reservasi = repo.get_reservasi(db, reservasi_id)
    if not reservasi:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservasi tidak ditemukan")

    if payload.status in repo.ACTIVE_RESERVATION_STATUSES:
        _assert_slot_available(
            db,
            id_tempat=reservasi.id_tempat,
            id_jadwal=reservasi.id_jadwal,
            tanggal=reservasi.tanggal,
            exclude_reservasi_id=reservasi.id_reservasi,
        )

    reservasi.status = payload.status
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Slot jadwal sudah dipesan") from exc
    db.refresh(reservasi)
    return reservasi
