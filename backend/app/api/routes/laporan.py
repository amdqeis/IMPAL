from fastapi import APIRouter, Depends, status
from sqlalchemy import func, select

from app.api.deps import DbSession, require_permissions
from app.models import Payment, Reservasi
from app.schemas import COMMON_ERROR_RESPONSES, DashboardSummaryRead, LaporanCreate, LaporanRead, LaporanUpdate
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


@router.get(
    "/summary",
    response_model=DashboardSummaryRead,
    summary="Ringkasan dashboard",
    description="Mengembalikan metrik ringkas booking dan pembayaran untuk dashboard/cashflow admin.",
    responses=COMMON_ERROR_RESPONSES,
)
def get_dashboard_summary(
    db: DbSession,
    _current_user=Depends(require_permissions(VIEW_REPORTS, MANAGE_REPORTS)),
) -> DashboardSummaryRead:
    total_bookings = db.scalar(select(func.count(Reservasi.id_reservasi))) or 0
    active_bookings = (
        db.scalar(select(func.count(Reservasi.id_reservasi)).where(Reservasi.status.in_(("pending", "confirmed"))))
        or 0
    )
    paid_payments = db.scalar(select(func.count(Payment.id_payment)).where(Payment.status == "paid")) or 0
    pending_payments = db.scalar(select(func.count(Payment.id_payment)).where(Payment.status == "pending")) or 0
    income_total = db.scalar(select(func.coalesce(func.sum(Payment.amount), 0)).where(Payment.status == "paid")) or 0
    return DashboardSummaryRead(
        total_bookings=total_bookings,
        active_bookings=active_bookings,
        paid_payments=paid_payments,
        pending_payments=pending_payments,
        income_total=str(income_total),
    )


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
