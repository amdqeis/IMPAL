import asyncio
from datetime import date
import logging
from time import perf_counter
from typing import Literal

from fastapi import APIRouter, Depends, status
from fastapi import Query
from fastapi.responses import Response
from sqlalchemy import case, func, select

from app.api.deps import require_permissions, run_db
from app.models import Payment, Reservasi, Tempat, User
from app.schemas import COMMON_ERROR_RESPONSES, DashboardSummaryRead, LaporanCreate, LaporanRead, LaporanUpdate, PaginatedResponse
from app.services import laporan as service
from app.services.permissions import MANAGE_REPORTS, VIEW_REPORTS


router = APIRouter(prefix="/laporan", tags=["6. Laporan"])
summary_logger = logging.getLogger("app.db")


@router.get(
    "/",
    response_model=PaginatedResponse[LaporanRead],
    summary="List laporan",
    description="Mengambil daftar laporan. Membutuhkan permission view_reports atau manage_reports.",
    responses=COMMON_ERROR_RESPONSES,
)
async def list_laporan(
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
    return await run_db(
        service.list_laporan,
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
async def get_dashboard_summary(
    id_cabang: int | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    _current_user=Depends(require_permissions(VIEW_REPORTS, MANAGE_REPORTS)),
) -> DashboardSummaryRead:
    reservations_task = run_db(
        _get_reservation_summary,
        id_cabang=id_cabang,
        start_date=start_date,
        end_date=end_date,
    )
    payments_task = run_db(
        _get_payment_summary,
        id_cabang=id_cabang,
        start_date=start_date,
        end_date=end_date,
    )
    reservation_summary, payment_summary = await asyncio.gather(reservations_task, payments_task)
    total_bookings, active_bookings, reservations_duration_ms = reservation_summary
    paid_payments, pending_payments, income_total, payments_duration_ms = payment_summary
    summary_logger.info(
        "laporan.summary reservations %.2fms payments %.2fms",
        reservations_duration_ms,
        payments_duration_ms,
    )
    return DashboardSummaryRead(
        total_bookings=int(total_bookings or 0),
        active_bookings=int(active_bookings or 0),
        paid_payments=int(paid_payments or 0),
        pending_payments=int(pending_payments or 0),
        income_total=str(income_total),
    )


def _get_reservation_summary(
    db,
    *,
    id_cabang: int | None,
    start_date: date | None,
    end_date: date | None,
):
    query = _apply_reservasi_summary_filters(
        select(
            func.count(Reservasi.id_reservasi),
            func.coalesce(
                func.sum(case((Reservasi.status.in_(("pending", "confirmed")), 1), else_=0)),
                0,
            ),
        ),
        id_cabang=id_cabang,
        start_date=start_date,
        end_date=end_date,
    )
    started_at = perf_counter()
    total_bookings, active_bookings = db.execute(query).one()
    duration_ms = (perf_counter() - started_at) * 1000
    return total_bookings, active_bookings, duration_ms


def _get_payment_summary(
    db,
    *,
    id_cabang: int | None,
    start_date: date | None,
    end_date: date | None,
):
    query = _apply_payment_summary_filters(
        select(
            func.coalesce(func.sum(case((Payment.status == "paid", 1), else_=0)), 0),
            func.coalesce(func.sum(case((Payment.status == "pending", 1), else_=0)), 0),
            func.coalesce(func.sum(case((Payment.status == "paid", Payment.amount), else_=0)), 0),
        ).select_from(Payment),
        id_cabang=id_cabang,
        start_date=start_date,
        end_date=end_date,
    )
    started_at = perf_counter()
    paid_payments, pending_payments, income_total = db.execute(query).one()
    duration_ms = (perf_counter() - started_at) * 1000
    return paid_payments, pending_payments, income_total, duration_ms


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
async def create_laporan(
    payload: LaporanCreate,
    current_user: User = Depends(require_permissions(MANAGE_REPORTS)),
):
    """Create a report."""
    return await run_db(service.create_laporan, payload, dibuat_oleh=current_user.id_user, serializer=LaporanRead)


@router.patch(
    "/{laporan_id}",
    response_model=LaporanRead,
    summary="Update laporan",
    description="Memperbarui sebagian metadata laporan. Membutuhkan permission manage_reports.",
    responses=COMMON_ERROR_RESPONSES,
)
async def update_laporan(
    laporan_id: int,
    payload: LaporanUpdate,
    _current_user=Depends(require_permissions(MANAGE_REPORTS)),
):
    """Patch report metadata."""
    return await run_db(service.update_laporan, laporan_id, payload, serializer=LaporanRead)


@router.get(
    "/{laporan_id}/pdf",
    summary="Download laporan PDF",
    description="Menghasilkan PDF laporan dari data terbaru di database.",
    responses=COMMON_ERROR_RESPONSES,
)
async def download_laporan_pdf(
    laporan_id: int,
    _current_user=Depends(require_permissions(VIEW_REPORTS, MANAGE_REPORTS)),
) -> Response:
    """Generate a PDF file for a report."""
    pdf_bytes, filename = await run_db(service.generate_laporan_pdf, laporan_id)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
