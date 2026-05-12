from fastapi import APIRouter, Depends, status

from app.api.deps import DbSession, require_permissions
from app.models import User
from app.schemas import (
    COMMON_ERROR_RESPONSES,
    PaymentCreate,
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
    response_model=list[PaymentRead],
    summary="List pembayaran",
    description="Mengambil daftar pembayaran. User biasa hanya melihat pembayaran dari reservasinya sendiri; manage_payments dapat melihat semua.",
    responses=COMMON_ERROR_RESPONSES,
)
def list_pembayaran(
    db: DbSession,
    current_user: User = Depends(require_permissions(VIEW_PAYMENTS, MANAGE_PAYMENTS)),
    id_reservasi: int | None = None,
    id_cabang: int | None = None,
    status_pembayaran: str | None = None,
):
    """Return payments scoped by permission."""
    return service.list_pembayaran(
        db,
        current_user=current_user,
        id_reservasi=id_reservasi,
        id_cabang=id_cabang,
        status_pembayaran=status_pembayaran,
    )


@router.post(
    "/",
    response_model=PaymentRead,
    status_code=status.HTTP_201_CREATED,
    summary="Buat pembayaran",
    description="Membuat pembayaran untuk reservasi. User biasa hanya boleh membuat pembayaran untuk reservasinya sendiri.",
    responses=COMMON_ERROR_RESPONSES,
)
def create_pembayaran(
    payload: PaymentCreate,
    db: DbSession,
    current_user: User = Depends(require_permissions(CREATE_PAYMENTS, MANAGE_PAYMENTS)),
):
    """Create a payment."""
    return service.create_pembayaran(db, payload, current_user=current_user)


@router.patch(
    "/{payment_id}/status",
    response_model=PaymentRead,
    summary="Update status pembayaran",
    description="Mengubah status pembayaran. Membutuhkan permission manage_payments.",
    responses=COMMON_ERROR_RESPONSES,
)
def update_status_pembayaran(
    payment_id: int,
    payload: PaymentUpdateStatus,
    db: DbSession,
    _current_user=Depends(require_permissions(MANAGE_PAYMENTS)),
):
    """Update payment status."""
    return service.update_status_pembayaran(db, payment_id, payload)


@router.post(
    "/{payment_id}/logs",
    response_model=PaymentLogRead,
    status_code=status.HTTP_201_CREATED,
    summary="Buat log pembayaran",
    description="Menyimpan response gateway pembayaran. Membutuhkan permission manage_payments.",
    responses=COMMON_ERROR_RESPONSES,
)
def create_payment_log(
    payment_id: int,
    payload: PaymentLogCreate,
    db: DbSession,
    _current_user=Depends(require_permissions(MANAGE_PAYMENTS)),
):
    """Create a payment log."""
    return service.create_payment_log(db, payment_id, payload)


@router.post(
    "/{payment_id}/refunds",
    response_model=RefundRead,
    status_code=status.HTTP_201_CREATED,
    summary="Buat refund",
    description="Membuat request refund. User biasa hanya boleh refund pembayaran miliknya sendiri.",
    responses=COMMON_ERROR_RESPONSES,
)
def create_refund(
    payment_id: int,
    payload: RefundCreate,
    db: DbSession,
    current_user: User = Depends(require_permissions(REQUEST_REFUNDS, MANAGE_PAYMENTS)),
):
    """Create a refund request."""
    return service.create_refund(db, payment_id, payload, current_user=current_user)


@router.patch(
    "/refunds/{refund_id}/status",
    response_model=RefundRead,
    summary="Update status refund",
    description="Mengubah status refund. Membutuhkan permission approve_refunds atau manage_payments.",
    responses=COMMON_ERROR_RESPONSES,
)
def update_status_refund(
    refund_id: int,
    payload: RefundUpdateStatus,
    db: DbSession,
    _current_user=Depends(require_permissions(APPROVE_REFUNDS, MANAGE_PAYMENTS)),
):
    """Update refund status."""
    return service.update_status_refund(db, refund_id, payload)
