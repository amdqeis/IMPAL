from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import has_permission
from app.models import Reservasi, User
from app.repositories import jadwal as jadwal_repo
from app.repositories import reservasi as repo
from app.repositories import users as user_repo
from app.schemas.reservasi import ReservasiCreate, ReservasiUpdateStatus
from app.services.permissions import MANAGE_RESERVATIONS


def list_reservasi(
    db: Session,
    *,
    current_user: User,
    id_user: int | None = None,
    status_reservasi: str | None = None,
) -> list[Reservasi]:
    """Return reservations; regular users are scoped to their own data."""
    if not has_permission(current_user, MANAGE_RESERVATIONS):
        id_user = current_user.id_user
    return repo.list_reservasi(db, id_user=id_user, status_reservasi=status_reservasi)


def create_reservasi(db: Session, payload: ReservasiCreate, *, current_user: User) -> Reservasi:
    """Create a reservation for the current user unless caller can manage reservations."""
    if payload.id_user != current_user.id_user and not has_permission(current_user, MANAGE_RESERVATIONS):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User hanya bisa membuat reservasi miliknya sendiri")

    if not user_repo.get_user_by_id(db, payload.id_user):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User tidak ditemukan")
    if not jadwal_repo.get_jadwal(db, payload.id_jadwal):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Jadwal tidak ditemukan")

    reservasi = Reservasi(**payload.model_dump())
    db.add(reservasi)
    db.commit()
    db.refresh(reservasi)
    return reservasi


def update_status_reservasi(db: Session, reservasi_id: int, payload: ReservasiUpdateStatus) -> Reservasi:
    """Update reservation status."""
    reservasi = repo.get_reservasi(db, reservasi_id)
    if not reservasi:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservasi tidak ditemukan")

    reservasi.status = payload.status
    db.commit()
    db.refresh(reservasi)
    return reservasi
