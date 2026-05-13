from typing import Literal

from fastapi import APIRouter, Depends, Query, status

from app.api.deps import DbSession, require_permissions
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
def list_cabang(
    db: DbSession,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None, min_length=1, max_length=255),
    sort_by: str | None = Query(default=None),
    sort_order: Literal["asc", "desc"] = "asc",
    _current_user=Depends(require_permissions(VIEW_LOCATIONS, MANAGE_BRANCHES, MANAGE_TABLES)),
):
    """Return branches using database pagination."""
    return service.list_cabang(
        db,
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
def create_cabang(
    payload: CabangCreate,
    db: DbSession,
    _current_user=Depends(require_permissions(MANAGE_BRANCHES)),
):
    """Create a branch."""
    return service.create_cabang(db, payload)


@router.patch(
    "/cabang/{cabang_id}",
    response_model=CabangRead,
    summary="Update cabang",
    description="Memperbarui sebagian data cabang berdasarkan ID. Membutuhkan permission manage_branches.",
    responses=COMMON_ERROR_RESPONSES,
)
def update_cabang(
    cabang_id: int,
    payload: CabangUpdate,
    db: DbSession,
    _current_user=Depends(require_permissions(MANAGE_BRANCHES)),
):
    """Patch branch data."""
    return service.update_cabang(db, cabang_id, payload)


@router.delete(
    "/cabang/{cabang_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Hapus cabang",
    description="Menghapus cabang berdasarkan ID. Membutuhkan permission manage_branches.",
    responses=COMMON_ERROR_RESPONSES,
)
def delete_cabang(
    cabang_id: int,
    db: DbSession,
    _current_user=Depends(require_permissions(MANAGE_BRANCHES)),
):
    """Delete a branch."""
    service.delete_cabang(db, cabang_id)


@router.get(
    "/tempat",
    response_model=PaginatedResponse[TempatRead],
    summary="List tempat",
    description="Mengambil daftar meja/tempat, dapat difilter berdasarkan cabang dan status. Membutuhkan permission view_locations atau kelola tempat.",
    responses=COMMON_ERROR_RESPONSES,
)
def list_tempat(
    db: DbSession,
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
    return service.list_tempat(
        db,
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
def create_tempat(
    payload: TempatCreate,
    db: DbSession,
    _current_user=Depends(require_permissions(MANAGE_TABLES)),
):
    """Create a table."""
    return service.create_tempat(db, payload)


@router.patch(
    "/tempat/{tempat_id}",
    response_model=TempatRead,
    summary="Update tempat",
    description="Memperbarui sebagian data meja/tempat berdasarkan ID. Membutuhkan permission manage_tables.",
    responses=COMMON_ERROR_RESPONSES,
)
def update_tempat(
    tempat_id: int,
    payload: TempatUpdate,
    db: DbSession,
    _current_user=Depends(require_permissions(MANAGE_TABLES)),
):
    """Patch table data."""
    return service.update_tempat(db, tempat_id, payload)


@router.delete(
    "/tempat/{tempat_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Hapus tempat",
    description="Menghapus meja/tempat berdasarkan ID. Membutuhkan permission manage_tables.",
    responses=COMMON_ERROR_RESPONSES,
)
def delete_tempat(
    tempat_id: int,
    db: DbSession,
    _current_user=Depends(require_permissions(MANAGE_TABLES)),
):
    """Delete a table."""
    service.delete_tempat(db, tempat_id)
