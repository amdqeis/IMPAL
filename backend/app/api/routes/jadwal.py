from datetime import date

from fastapi import APIRouter, Depends, status

from app.api.deps import DbSession, require_permissions
from app.schemas import COMMON_ERROR_RESPONSES, JadwalAvailabilityRead, JadwalCreate, JadwalRead, JadwalUpdate
from app.services import jadwal as service
from app.services.permissions import MANAGE_SCHEDULES, VIEW_SCHEDULES


router = APIRouter(prefix="/jadwal", tags=["3. Kelola Jadwal"])


@router.get(
    "/",
    response_model=list[JadwalRead],
    summary="List jadwal",
    description="Mengambil daftar slot jadwal, dapat difilter berdasarkan tempat. Membutuhkan permission view_schedules atau manage_schedules.",
    responses=COMMON_ERROR_RESPONSES,
)
def list_jadwal(
    db: DbSession,
    id_tempat: int | None = None,
    _current_user=Depends(require_permissions(VIEW_SCHEDULES, MANAGE_SCHEDULES)),
):
    """Return schedules with optional filters."""
    return service.list_jadwal(db, id_tempat=id_tempat)


@router.get(
    "/availability",
    response_model=list[JadwalAvailabilityRead],
    summary="List availability jadwal",
    description="Mengambil slot jadwal untuk tempat dan tanggal tertentu, lengkap dengan status available. Membutuhkan permission view_schedules atau manage_schedules.",
    responses=COMMON_ERROR_RESPONSES,
)
def list_jadwal_availability(
    db: DbSession,
    id_tempat: int,
    tanggal: date,
    _current_user=Depends(require_permissions(VIEW_SCHEDULES, MANAGE_SCHEDULES)),
):
    """Return schedule slots with availability."""
    return service.list_jadwal_availability(db, id_tempat=id_tempat, tanggal=tanggal)


@router.get(
    "/tersedia",
    response_model=list[JadwalRead],
    summary="List jadwal tersedia",
    description="Mengambil jadwal yang tempatnya berstatus available. Membutuhkan permission view_schedules atau manage_schedules.",
    responses=COMMON_ERROR_RESPONSES,
)
def list_jadwal_tersedia(
    db: DbSession,
    _current_user=Depends(require_permissions(VIEW_SCHEDULES, MANAGE_SCHEDULES)),
):
    """Return available schedules."""
    return service.list_jadwal_tersedia(db)


@router.post(
    "/",
    response_model=JadwalRead,
    status_code=status.HTTP_201_CREATED,
    summary="Buat jadwal",
    description="Membuat jadwal untuk tempat yang sudah ada. Membutuhkan permission manage_schedules.",
    responses=COMMON_ERROR_RESPONSES,
)
def create_jadwal(
    payload: JadwalCreate,
    db: DbSession,
    _current_user=Depends(require_permissions(MANAGE_SCHEDULES)),
):
    """Create a schedule."""
    return service.create_jadwal(db, payload)


@router.patch(
    "/{jadwal_id}",
    response_model=JadwalRead,
    summary="Update jadwal",
    description="Memperbarui sebagian data jadwal berdasarkan ID. Membutuhkan permission manage_schedules.",
    responses=COMMON_ERROR_RESPONSES,
)
def update_jadwal(
    jadwal_id: int,
    payload: JadwalUpdate,
    db: DbSession,
    _current_user=Depends(require_permissions(MANAGE_SCHEDULES)),
):
    """Patch schedule data."""
    return service.update_jadwal(db, jadwal_id, payload)


@router.delete(
    "/{jadwal_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Hapus jadwal",
    description="Menghapus jadwal berdasarkan ID. Membutuhkan permission manage_schedules.",
    responses=COMMON_ERROR_RESPONSES,
)
def delete_jadwal(
    jadwal_id: int,
    db: DbSession,
    _current_user=Depends(require_permissions(MANAGE_SCHEDULES)),
):
    """Delete a schedule."""
    service.delete_jadwal(db, jadwal_id)
