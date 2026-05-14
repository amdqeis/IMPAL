from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, Query, status

from app.api.deps import require_permissions, run_db
from app.models import User
from app.schemas import COMMON_ERROR_RESPONSES, PaginatedResponse, ReservasiCreate, ReservasiListRead, ReservasiRead, ReservasiUpdateStatus
from app.services import reservasi as service
from app.services.permissions import CREATE_RESERVATIONS, MANAGE_RESERVATIONS, VIEW_RESERVATIONS


router = APIRouter(prefix="/reservasi", tags=["4. Reservasi"])


@router.get(
    "/",
    response_model=PaginatedResponse[ReservasiListRead],
    summary="List reservasi",
    description="Mengambil daftar reservasi. User biasa hanya mendapat reservasi miliknya sendiri; manage_reservations dapat melihat semua.",
    responses=COMMON_ERROR_RESPONSES,
)
async def list_reservasi(
    current_user: User = Depends(require_permissions(VIEW_RESERVATIONS, MANAGE_RESERVATIONS)),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    id_user: int | None = None,
    id_cabang: int | None = None,
    id_tempat: int | None = None,
    id_jadwal: int | None = None,
    status_reservasi: str | None = None,
    tanggal: date | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    search: str | None = Query(default=None, min_length=1, max_length=255),
    sort_by: str | None = Query(default=None),
    sort_order: Literal["asc", "desc"] = "asc",
):
    """Return reservations scoped by permission."""
    return await run_db(
        service.list_reservasi,
        current_user=current_user,
        page=page,
        limit=limit,
        id_user=id_user,
        id_cabang=id_cabang,
        id_tempat=id_tempat,
        id_jadwal=id_jadwal,
        status_reservasi=status_reservasi,
        tanggal=tanggal,
        start_date=start_date,
        end_date=end_date,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.post(
    "/",
    response_model=ReservasiRead,
    status_code=status.HTTP_201_CREATED,
    summary="Buat reservasi",
    description="Membuat reservasi baru. User biasa hanya boleh membuat reservasi untuk dirinya sendiri.",
    responses=COMMON_ERROR_RESPONSES,
)
async def create_reservasi(
    payload: ReservasiCreate,
    current_user: User = Depends(require_permissions(CREATE_RESERVATIONS, MANAGE_RESERVATIONS)),
):
    """Create a reservation."""
    return await run_db(service.create_reservasi, payload, current_user=current_user, serializer=ReservasiRead)


@router.get(
    "/{reservasi_id}",
    response_model=ReservasiListRead,
    summary="Detail reservasi",
    description="Mengambil detail satu reservasi. User biasa hanya boleh melihat reservasi miliknya sendiri.",
    responses=COMMON_ERROR_RESPONSES,
)
async def get_reservasi(
    reservasi_id: int,
    current_user: User = Depends(require_permissions(VIEW_RESERVATIONS, MANAGE_RESERVATIONS)),
) -> ReservasiListRead:
    """Return one reservation detail scoped by permission."""
    return await run_db(service.get_reservasi_detail, reservasi_id, current_user=current_user)


@router.patch(
    "/{reservasi_id}/status",
    response_model=ReservasiRead,
    summary="Update status reservasi",
    description="Mengubah status reservasi. Membutuhkan permission manage_reservations.",
    responses=COMMON_ERROR_RESPONSES,
)
async def update_status_reservasi(
    reservasi_id: int,
    payload: ReservasiUpdateStatus,
    _current_user=Depends(require_permissions(MANAGE_RESERVATIONS)),
):
    """Update reservation status."""
    return await run_db(service.update_status_reservasi, reservasi_id, payload, serializer=ReservasiRead)
