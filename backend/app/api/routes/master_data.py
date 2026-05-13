from typing import Literal

from fastapi import APIRouter, Depends, Query, status

from app.api.deps import require_permissions, run_db
from app.schemas import (
    COMMON_ERROR_RESPONSES,
    CabangCreate,
    CabangRead,
    CabangUpdate,
    PaginatedResponse,
    TempatCreate,
    TempatRead,
    TempatUpdate,
)
from app.services import master_data as service
from app.services.permissions import MANAGE_BRANCHES, MANAGE_TABLES, VIEW_LOCATIONS


router = APIRouter(prefix="/master-data", tags=["2. Kelola Cabang & Tempat"])


@router.get(
    "/cabang",
    response_model=PaginatedResponse[CabangRead],
    summary="List cabang",
    description="Mengambil daftar seluruh cabang. Membutuhkan permission view_locations atau permission kelola lokasi.",
    responses=COMMON_ERROR_RESPONSES,
)
async def list_cabang(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None, min_length=1, max_length=255),
    sort_by: str | None = Query(default=None),
    sort_order: Literal["asc", "desc"] = "asc",
    _current_user=Depends(require_permissions(VIEW_LOCATIONS, MANAGE_BRANCHES, MANAGE_TABLES)),
):
    """Return branches using database pagination."""
    return await run_db(
        service.list_cabang,
        page=page,
        limit=limit,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.post(
    "/cabang",
    response_model=CabangRead,
    status_code=status.HTTP_201_CREATED,
    summary="Buat cabang",
    description="Membuat cabang baru. Membutuhkan permission manage_branches.",
    responses=COMMON_ERROR_RESPONSES,
)
async def create_cabang(
    payload: CabangCreate,
    _current_user=Depends(require_permissions(MANAGE_BRANCHES)),
):
    """Create a branch."""
    return await run_db(service.create_cabang, payload, serializer=CabangRead)


@router.patch(
    "/cabang/{cabang_id}",
    response_model=CabangRead,
    summary="Update cabang",
    description="Memperbarui sebagian data cabang berdasarkan ID. Membutuhkan permission manage_branches.",
    responses=COMMON_ERROR_RESPONSES,
)
async def update_cabang(
    cabang_id: int,
    payload: CabangUpdate,
    _current_user=Depends(require_permissions(MANAGE_BRANCHES)),
):
    """Patch branch data."""
    return await run_db(service.update_cabang, cabang_id, payload, serializer=CabangRead)


@router.delete(
    "/cabang/{cabang_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Hapus cabang",
    description="Menghapus cabang berdasarkan ID. Membutuhkan permission manage_branches.",
    responses=COMMON_ERROR_RESPONSES,
)
async def delete_cabang(
    cabang_id: int,
    _current_user=Depends(require_permissions(MANAGE_BRANCHES)),
):
    """Delete a branch."""
    await run_db(service.delete_cabang, cabang_id)


@router.get(
    "/tempat",
    response_model=PaginatedResponse[TempatRead],
    summary="List tempat",
    description="Mengambil daftar meja/tempat, dapat difilter berdasarkan cabang dan status. Membutuhkan permission view_locations atau kelola tempat.",
    responses=COMMON_ERROR_RESPONSES,
)
async def list_tempat(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    id_cabang: int | None = None,
    status_tempat: str | None = None,
    search: str | None = Query(default=None, min_length=1, max_length=255),
    sort_by: str | None = Query(default=None),
    sort_order: Literal["asc", "desc"] = "asc",
    _current_user=Depends(require_permissions(VIEW_LOCATIONS, MANAGE_BRANCHES, MANAGE_TABLES)),
):
    """Return tables with optional filters using database pagination."""
    return await run_db(
        service.list_tempat,
        page=page,
        limit=limit,
        id_cabang=id_cabang,
        status_tempat=status_tempat,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.post(
    "/tempat",
    response_model=TempatRead,
    status_code=status.HTTP_201_CREATED,
    summary="Buat tempat",
    description="Membuat meja/tempat pada cabang yang sudah ada. Membutuhkan permission manage_tables.",
    responses=COMMON_ERROR_RESPONSES,
)
async def create_tempat(
    payload: TempatCreate,
    _current_user=Depends(require_permissions(MANAGE_TABLES)),
):
    """Create a table."""
    return await run_db(service.create_tempat, payload, serializer=TempatRead)


@router.patch(
    "/tempat/{tempat_id}",
    response_model=TempatRead,
    summary="Update tempat",
    description="Memperbarui sebagian data meja/tempat berdasarkan ID. Membutuhkan permission manage_tables.",
    responses=COMMON_ERROR_RESPONSES,
)
async def update_tempat(
    tempat_id: int,
    payload: TempatUpdate,
    _current_user=Depends(require_permissions(MANAGE_TABLES)),
):
    """Patch table data."""
    return await run_db(service.update_tempat, tempat_id, payload, serializer=TempatRead)


@router.delete(
    "/tempat/{tempat_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Hapus tempat",
    description="Menghapus meja/tempat berdasarkan ID. Membutuhkan permission manage_tables.",
    responses=COMMON_ERROR_RESPONSES,
)
async def delete_tempat(
    tempat_id: int,
    _current_user=Depends(require_permissions(MANAGE_TABLES)),
):
    """Delete a table."""
    await run_db(service.delete_tempat, tempat_id)
