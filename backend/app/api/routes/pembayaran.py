from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, Query, status

from app.api.deps import require_permissions, run_db
from app.models import User
from app.schemas import (
    COMMON_ERROR_RESPONSES,
    PaginatedResponse,
    PaymentCreate,
    PaymentListRead,
    PaymentLogCreate,
    PaymentLogRead,
    PaymentRead,
    PaymentUpdateStatus,
    RefundCreate,
    RefundRead,
    RefundUpdateStatus,
)
from app.services import pembayaran as service
from app.services.permissions import APPROVE_REFUNDS, CREATE_PAYMENTS, MANAGE_PAYMENTS, REQUEST_REFUNDS, VIEW_PAYMENTS


router = APIRouter(prefix="/pembayaran", tags=["5. Pembayaran"])


@router.get(
    "/",
    response_model=PaginatedResponse[PaymentListRead],
    summary="List pembayaran",
    description="Mengambil daftar pembayaran. User biasa hanya melihat pembayaran dari reservasinya sendiri; manage_payments dapat melihat semua.",
    responses=COMMON_ERROR_RESPONSES,
)
async def list_pembayaran(
    current_user: User = Depends(require_permissions(VIEW_PAYMENTS, MANAGE_PAYMENTS)),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    id_reservasi: int | None = None,
    id_cabang: int | None = None,
    status_pembayaran: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    search: str | None = Query(default=None, min_length=1, max_length=255),
    sort_by: str | None = Query(default=None),
    sort_order: Literal["asc", "desc"] = "asc",
):
    """Return payments scoped by permission."""
    return await run_db(
        service.list_pembayaran,
        current_user=current_user,
        page=page,
        limit=limit,
        id_reservasi=id_reservasi,
        id_cabang=id_cabang,
        status_pembayaran=status_pembayaran,
        start_date=start_date,
        end_date=end_date,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.post(
    "/",
    response_model=PaymentRead,
    status_code=status.HTTP_201_CREATED,
    summary="Buat pembayaran",
    description="Membuat pembayaran untuk reservasi. User biasa hanya boleh membuat pembayaran untuk reservasinya sendiri.",
    responses=COMMON_ERROR_RESPONSES,
)
async def create_pembayaran(
    payload: PaymentCreate,
    current_user: User = Depends(require_permissions(CREATE_PAYMENTS, MANAGE_PAYMENTS)),
):
    """Create a payment."""
    return await run_db(service.create_pembayaran, payload, current_user=current_user, serializer=PaymentRead)


@router.patch(
    "/{payment_id}/status",
    response_model=PaymentRead,
    summary="Update status pembayaran",
    description="Mengubah status pembayaran. Membutuhkan permission manage_payments.",
    responses=COMMON_ERROR_RESPONSES,
)
async def update_status_pembayaran(
    payment_id: int,
    payload: PaymentUpdateStatus,
    _current_user=Depends(require_permissions(MANAGE_PAYMENTS)),
):
    """Update payment status."""
    return await run_db(service.update_status_pembayaran, payment_id, payload, serializer=PaymentRead)


@router.post(
    "/{payment_id}/dummy-confirm",
    response_model=PaymentRead,
    summary="Konfirmasi dummy pembayaran",
    description="Mengonfirmasi pembayaran dummy QRIS. User biasa hanya boleh mengonfirmasi pembayaran miliknya sendiri.",
    responses=COMMON_ERROR_RESPONSES,
)
async def dummy_confirm_pembayaran(
    payment_id: int,
    current_user: User = Depends(require_permissions(CREATE_PAYMENTS, MANAGE_PAYMENTS)),
):
    """Confirm a dummy payment gateway response."""
    return await run_db(service.dummy_confirm_payment, payment_id, current_user=current_user, serializer=PaymentRead)


@router.post(
    "/{payment_id}/logs",
    response_model=PaymentLogRead,
    status_code=status.HTTP_201_CREATED,
    summary="Buat log pembayaran",
    description="Menyimpan response gateway pembayaran. Membutuhkan permission manage_payments.",
    responses=COMMON_ERROR_RESPONSES,
)
async def create_payment_log(
    payment_id: int,
    payload: PaymentLogCreate,
    _current_user=Depends(require_permissions(MANAGE_PAYMENTS)),
):
    """Create a payment log."""
    return await run_db(service.create_payment_log, payment_id, payload, serializer=PaymentLogRead)


@router.post(
    "/{payment_id}/refunds",
    response_model=RefundRead,
    status_code=status.HTTP_201_CREATED,
    summary="Buat refund",
    description="Membuat request refund. User biasa hanya boleh refund pembayaran miliknya sendiri.",
    responses=COMMON_ERROR_RESPONSES,
)
async def create_refund(
    payment_id: int,
    payload: RefundCreate,
    current_user: User = Depends(require_permissions(REQUEST_REFUNDS, MANAGE_PAYMENTS)),
):
    """Create a refund request."""
    return await run_db(service.create_refund, payment_id, payload, current_user=current_user, serializer=RefundRead)


@router.patch(
    "/refunds/{refund_id}/status",
    response_model=RefundRead,
    summary="Update status refund",
    description="Mengubah status refund. Membutuhkan permission approve_refunds atau manage_payments.",
    responses=COMMON_ERROR_RESPONSES,
)
async def update_status_refund(
    refund_id: int,
    payload: RefundUpdateStatus,
    _current_user=Depends(require_permissions(APPROVE_REFUNDS, MANAGE_PAYMENTS)),
):
    """Update refund status."""
    return await run_db(service.update_status_refund, refund_id, payload, serializer=RefundRead)
