from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, status
from fastapi import Query
from fastapi.responses import Response
from sqlalchemy import func, select

from app.api.deps import DbSession, require_permissions
from app.models import Payment, Reservasi, Tempat, User
from app.schemas import COMMON_ERROR_RESPONSES, DashboardSummaryRead, LaporanCreate, LaporanRead, LaporanUpdate, PaginatedResponse
from app.services import laporan as service
from app.services.permissions import MANAGE_REPORTS, VIEW_REPORTS


router = APIRouter(prefix="/laporan", tags=["6. Laporan"])


@router.get(
    "/",
    response_model=PaginatedResponse[LaporanRead],
    summary="List laporan",
    description="Mengambil daftar laporan. Membutuhkan permission view_reports atau manage_reports.",
    responses=COMMON_ERROR_RESPONSES,
)
def list_laporan(
    db: DbSession,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None, min_length=1, max_length=255),
    tipe: str | None = Query(default=None, min_length=1, max_length=100),
    dibuat_oleh: int | None = None,
    sort_by: str | None = Query(default=None),
    sort_order: Literal["asc", "desc"] = "asc",
    _current_user=Depends(require_permissions(VIEW_REPORTS, MANAGE_REPORTS)),
):
    """Return reports using database pagination."""
    return service.list_laporan(
        db,
        page=page,
        limit=limit,
        search=search,
        tipe=tipe,
        dibuat_oleh=dibuat_oleh,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.get(
    "/summary",
    response_model=DashboardSummaryRead,
    summary="Ringkasan dashboard",
    description="Mengembalikan metrik ringkas booking dan pembayaran untuk dashboard/cashflow admin.",
    responses=COMMON_ERROR_RESPONSES,
)
def get_dashboard_summary(
    db: DbSession,
    id_cabang: int | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    _current_user=Depends(require_permissions(VIEW_REPORTS, MANAGE_REPORTS)),
) -> DashboardSummaryRead:
    reservation_count_query = _apply_reservasi_summary_filters(
        select(func.count(Reservasi.id_reservasi)),
        id_cabang=id_cabang,
        start_date=start_date,
        end_date=end_date,
    )
    active_count_query = _apply_reservasi_summary_filters(
        select(func.count(Reservasi.id_reservasi)).where(Reservasi.status.in_(("pending", "confirmed"))),
        id_cabang=id_cabang,
        start_date=start_date,
        end_date=end_date,
    )
    paid_count_query = _apply_payment_summary_filters(
        select(func.count(Payment.id_payment)).select_from(Payment).where(Payment.status == "paid"),
        id_cabang=id_cabang,
        start_date=start_date,
        end_date=end_date,
    )
    pending_count_query = _apply_payment_summary_filters(
        select(func.count(Payment.id_payment)).select_from(Payment).where(Payment.status == "pending"),
        id_cabang=id_cabang,
        start_date=start_date,
        end_date=end_date,
    )
    income_query = _apply_payment_summary_filters(
        select(func.coalesce(func.sum(Payment.amount), 0)).select_from(Payment).where(Payment.status == "paid"),
        id_cabang=id_cabang,
        start_date=start_date,
        end_date=end_date,
    )
    total_bookings = db.scalar(reservation_count_query) or 0
    active_bookings = db.scalar(active_count_query) or 0
    paid_payments = db.scalar(paid_count_query) or 0
    pending_payments = db.scalar(pending_count_query) or 0
    income_total = db.scalar(income_query) or 0
    return DashboardSummaryRead(
        total_bookings=total_bookings,
        active_bookings=active_bookings,
        paid_payments=paid_payments,
        pending_payments=pending_payments,
        income_total=str(income_total),
    )


def _apply_reservasi_summary_filters(query, *, id_cabang: int | None, start_date: date | None, end_date: date | None):
    if id_cabang is not None:
        query = query.join(Reservasi.tempat).where(Tempat.id_cabang == id_cabang)
    if start_date is not None:
        query = query.where(Reservasi.tanggal >= start_date)
    if end_date is not None:
        query = query.where(Reservasi.tanggal <= end_date)
    return query


def _apply_payment_summary_filters(query, *, id_cabang: int | None, start_date: date | None, end_date: date | None):
    if id_cabang is None and start_date is None and end_date is None:
        return query
    query = query.join(Payment.reservasi)
    if id_cabang is not None:
        query = query.join(Reservasi.tempat).where(Tempat.id_cabang == id_cabang)
    if start_date is not None:
        query = query.where(Reservasi.tanggal >= start_date)
    if end_date is not None:
        query = query.where(Reservasi.tanggal <= end_date)
    return query


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
    current_user: User = Depends(require_permissions(MANAGE_REPORTS)),
):
    """Create a report."""
    return service.create_laporan(db, payload, dibuat_oleh=current_user.id_user)


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


@router.get(
    "/{laporan_id}/pdf",
    summary="Download laporan PDF",
    description="Menghasilkan PDF laporan dari data terbaru di database.",
    responses=COMMON_ERROR_RESPONSES,
)
def download_laporan_pdf(
    laporan_id: int,
    db: DbSession,
    _current_user=Depends(require_permissions(VIEW_REPORTS, MANAGE_REPORTS)),
) -> Response:
    """Generate a PDF file for a report."""
    pdf_bytes, filename = service.generate_laporan_pdf(db, laporan_id)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
