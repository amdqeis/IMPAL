from datetime import date, time
from typing import Literal

from fastapi import APIRouter, Depends, Query, status

from app.api.deps import require_permissions, run_db
from app.schemas import COMMON_ERROR_RESPONSES, JadwalAvailabilityRead, JadwalCreate, JadwalRead, JadwalUpdate, PaginatedResponse
from app.services import jadwal as service
from app.services.permissions import MANAGE_SCHEDULES, VIEW_SCHEDULES


router = APIRouter(prefix="/jadwal", tags=["3. Kelola Jadwal"])


@router.get(
    "/",
    response_model=PaginatedResponse[JadwalRead],
    summary="List jadwal",
    description="Mengambil daftar slot jadwal, dapat difilter berdasarkan tempat. Membutuhkan permission view_schedules atau manage_schedules.",
    responses=COMMON_ERROR_RESPONSES,
)
async def list_jadwal(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    id_tempat: int | None = None,
    id_cabang: int | None = None,
    jam_mulai: time | None = None,
    jam_selesai: time | None = None,
    sort_by: str | None = Query(default=None),
    sort_order: Literal["asc", "desc"] = "asc",
    _current_user=Depends(require_permissions(VIEW_SCHEDULES, MANAGE_SCHEDULES)),
):
    """Return schedules with optional filters."""
    return await run_db(
        service.list_jadwal,
        page=page,
        limit=limit,
        id_tempat=id_tempat,
        id_cabang=id_cabang,
        jam_mulai=jam_mulai,
        jam_selesai=jam_selesai,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.get(
    "/availability",
    response_model=PaginatedResponse[JadwalAvailabilityRead],
    summary="List availability jadwal",
    description="Mengambil slot jadwal untuk tempat dan tanggal tertentu, lengkap dengan status available. Membutuhkan permission view_schedules atau manage_schedules.",
    responses=COMMON_ERROR_RESPONSES,
)
async def list_jadwal_availability(
    id_tempat: int,
    tanggal: date,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    sort_by: str | None = Query(default=None),
    sort_order: Literal["asc", "desc"] = "asc",
    _current_user=Depends(require_permissions(VIEW_SCHEDULES, MANAGE_SCHEDULES)),
):
    """Return schedule slots with availability."""
    return await run_db(
        service.list_jadwal_availability,
        page=page,
        limit=limit,
        id_tempat=id_tempat,
        tanggal=tanggal,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.get(
    "/tersedia",
    response_model=PaginatedResponse[JadwalRead],
    summary="List jadwal tersedia",
    description="Mengambil jadwal yang tempatnya berstatus available. Membutuhkan permission view_schedules atau manage_schedules.",
    responses=COMMON_ERROR_RESPONSES,
)
async def list_jadwal_tersedia(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    id_tempat: int | None = None,
    id_cabang: int | None = None,
    jam_mulai: time | None = None,
    jam_selesai: time | None = None,
    sort_by: str | None = Query(default=None),
    sort_order: Literal["asc", "desc"] = "asc",
    _current_user=Depends(require_permissions(VIEW_SCHEDULES, MANAGE_SCHEDULES)),
):
    """Return available schedules."""
    return await run_db(
        service.list_jadwal_tersedia,
        page=page,
        limit=limit,
        id_tempat=id_tempat,
        id_cabang=id_cabang,
        jam_mulai=jam_mulai,
        jam_selesai=jam_selesai,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.post(
    "/",
    response_model=JadwalRead,
    status_code=status.HTTP_201_CREATED,
    summary="Buat jadwal",
    description="Membuat jadwal untuk tempat yang sudah ada. Membutuhkan permission manage_schedules.",
    responses=COMMON_ERROR_RESPONSES,
)
async def create_jadwal(
    payload: JadwalCreate,
    _current_user=Depends(require_permissions(MANAGE_SCHEDULES)),
):
    """Create a schedule."""
    return await run_db(service.create_jadwal, payload, serializer=JadwalRead)


@router.patch(
    "/{jadwal_id}",
    response_model=JadwalRead,
    summary="Update jadwal",
    description="Memperbarui sebagian data jadwal berdasarkan ID. Membutuhkan permission manage_schedules.",
    responses=COMMON_ERROR_RESPONSES,
)
async def update_jadwal(
    jadwal_id: int,
    payload: JadwalUpdate,
    _current_user=Depends(require_permissions(MANAGE_SCHEDULES)),
):
    """Patch schedule data."""
    return await run_db(service.update_jadwal, jadwal_id, payload, serializer=JadwalRead)


@router.delete(
    "/{jadwal_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Hapus jadwal",
    description="Menghapus jadwal berdasarkan ID. Membutuhkan permission manage_schedules.",
    responses=COMMON_ERROR_RESPONSES,
)
async def delete_jadwal(
    jadwal_id: int,
    _current_user=Depends(require_permissions(MANAGE_SCHEDULES)),
):
    """Delete a schedule."""
    await run_db(service.delete_jadwal, jadwal_id)
