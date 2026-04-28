from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import has_permission
from app.models import Payment, PaymentLog, Refund, User
from app.repositories import pembayaran as repo
from app.repositories import reservasi as reservasi_repo
from app.schemas.pembayaran import (
    PaymentCreate,
    PaymentLogCreate,
    PaymentUpdateStatus,
    RefundCreate,
    RefundUpdateStatus,
)
from app.services.permissions import MANAGE_PAYMENTS


def _assert_reservasi_access(current_user: User, reservasi_user_id: int) -> None:
    if reservasi_user_id != current_user.id_user and not has_permission(current_user, MANAGE_PAYMENTS):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User hanya bisa mengakses pembayaran miliknya sendiri")


def _assert_payment_access(current_user: User, payment: Payment) -> None:
    _assert_reservasi_access(current_user, payment.reservasi.id_user)


def list_pembayaran(
    db: Session,
    *,
    current_user: User,
    id_reservasi: int | None = None,
    status_pembayaran: str | None = None,
) -> list[Payment]:
    """Return payments; regular users only see payments for their own reservations."""
    payments = repo.list_pembayaran(db, id_reservasi=id_reservasi, status_pembayaran=status_pembayaran)
    if has_permission(current_user, MANAGE_PAYMENTS):
        return payments
    return [payment for payment in payments if payment.reservasi.id_user == current_user.id_user]


def create_pembayaran(db: Session, payload: PaymentCreate, *, current_user: User) -> Payment:
    """Create a payment for a reservation owned by the caller unless caller can manage payments."""
    reservasi = reservasi_repo.get_reservasi(db, payload.id_reservasi)
    if not reservasi:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservasi tidak ditemukan")
    _assert_reservasi_access(current_user, reservasi.id_user)

    payment = Payment(**payload.model_dump())
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


def update_status_pembayaran(db: Session, payment_id: int, payload: PaymentUpdateStatus) -> Payment:
    """Update payment status."""
    payment = repo.get_payment(db, payment_id)
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pembayaran tidak ditemukan")

    payment.status = payload.status
    db.commit()
    db.refresh(payment)
    return payment


def create_payment_log(db: Session, payment_id: int, payload: PaymentLogCreate) -> PaymentLog:
    """Create a payment gateway log entry."""
    if not repo.get_payment(db, payment_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pembayaran tidak ditemukan")

    payment_log = PaymentLog(id_payment=payment_id, response=payload.response)
    db.add(payment_log)
    db.commit()
    db.refresh(payment_log)
    return payment_log


def create_refund(db: Session, payment_id: int, payload: RefundCreate, *, current_user: User) -> Refund:
    """Create a refund request for a payment owned by the caller unless caller can manage payments."""
    payment = repo.get_payment(db, payment_id)
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pembayaran tidak ditemukan")
    _assert_payment_access(current_user, payment)

    refund = Refund(id_payment=payment_id, **payload.model_dump())
    db.add(refund)
    db.commit()
    db.refresh(refund)
    return refund


def update_status_refund(db: Session, refund_id: int, payload: RefundUpdateStatus) -> Refund:
    """Approve, reject, or otherwise update a refund status."""
    refund = repo.get_refund(db, refund_id)
    if not refund:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Refund tidak ditemukan")

    refund.status = payload.status
    db.commit()
    db.refresh(refund)
    return refund
