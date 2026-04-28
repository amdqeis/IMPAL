from fastapi import APIRouter, Depends, status

from app.api.deps import DbSession, require_permissions
from app.schemas import COMMON_ERROR_RESPONSES, LaporanCreate, LaporanRead, LaporanUpdate
from app.services import laporan as service
from app.services.permissions import MANAGE_REPORTS, VIEW_REPORTS


router = APIRouter(prefix="/laporan", tags=["6. Laporan"])


@router.get(
    "/",
    response_model=list[LaporanRead],
    summary="List laporan",
    description="Mengambil daftar laporan. Membutuhkan permission view_reports atau manage_reports.",
    responses=COMMON_ERROR_RESPONSES,
)
def list_laporan(
    db: DbSession,
    _current_user=Depends(require_permissions(VIEW_REPORTS, MANAGE_REPORTS)),
):
    """Return all reports."""
    return service.list_laporan(db)


@router.post(
    "/",
    response_model=LaporanRead,
    status_code=status.HTTP_201_CREATED,
    summary="Buat laporan",
    description="Membuat metadata laporan. Membutuhkan permission manage_reports.",
    responses=COMMON_ERROR_RESPONSES,
)
def create_laporan(
    payload: LaporanCreate,
    db: DbSession,
    _current_user=Depends(require_permissions(MANAGE_REPORTS)),
):
    """Create a report."""
    return service.create_laporan(db, payload)


@router.patch(
    "/{laporan_id}",
    response_model=LaporanRead,
    summary="Update laporan",
    description="Memperbarui sebagian metadata laporan. Membutuhkan permission manage_reports.",
    responses=COMMON_ERROR_RESPONSES,
)
def update_laporan(
    laporan_id: int,
    payload: LaporanUpdate,
    db: DbSession,
    _current_user=Depends(require_permissions(MANAGE_REPORTS)),
):
    """Patch report metadata."""
    return service.update_laporan(db, laporan_id, payload)
