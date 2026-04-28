from fastapi import APIRouter, Depends, status

from app.api.deps import DbSession, require_permissions
from app.models import User
from app.schemas import COMMON_ERROR_RESPONSES, ReservasiCreate, ReservasiRead, ReservasiUpdateStatus
from app.services import reservasi as service
from app.services.permissions import CREATE_RESERVATIONS, MANAGE_RESERVATIONS, VIEW_RESERVATIONS


router = APIRouter(prefix="/reservasi", tags=["4. Reservasi"])


@router.get(
    "/",
    response_model=list[ReservasiRead],
    summary="List reservasi",
    description="Mengambil daftar reservasi. User biasa hanya mendapat reservasi miliknya sendiri; manage_reservations dapat melihat semua.",
    responses=COMMON_ERROR_RESPONSES,
)
def list_reservasi(
    db: DbSession,
    current_user: User = Depends(require_permissions(VIEW_RESERVATIONS, MANAGE_RESERVATIONS)),
    id_user: int | None = None,
    status_reservasi: str | None = None,
):
    """Return reservations scoped by permission."""
    return service.list_reservasi(db, current_user=current_user, id_user=id_user, status_reservasi=status_reservasi)


@router.post(
    "/",
    response_model=ReservasiRead,
    status_code=status.HTTP_201_CREATED,
    summary="Buat reservasi",
    description="Membuat reservasi baru. User biasa hanya boleh membuat reservasi untuk dirinya sendiri.",
    responses=COMMON_ERROR_RESPONSES,
)
def create_reservasi(
    payload: ReservasiCreate,
    db: DbSession,
    current_user: User = Depends(require_permissions(CREATE_RESERVATIONS, MANAGE_RESERVATIONS)),
):
    """Create a reservation."""
    return service.create_reservasi(db, payload, current_user=current_user)


@router.patch(
    "/{reservasi_id}/status",
    response_model=ReservasiRead,
    summary="Update status reservasi",
    description="Mengubah status reservasi. Membutuhkan permission manage_reservations.",
    responses=COMMON_ERROR_RESPONSES,
)
def update_status_reservasi(
    reservasi_id: int,
    payload: ReservasiUpdateStatus,
    db: DbSession,
    _current_user=Depends(require_permissions(MANAGE_RESERVATIONS)),
):
    """Update reservation status."""
    return service.update_status_reservasi(db, reservasi_id, payload)
