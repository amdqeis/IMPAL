from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import Payment, PaymentLog, Refund, Reservasi

from .schemas import (
    PaymentCreate,
    PaymentLogCreate,
    PaymentLogRead,
    PaymentRead,
    PaymentUpdateStatus,
    RefundCreate,
    RefundRead,
    RefundUpdateStatus,
)


router = APIRouter(prefix="/pembayaran", tags=["5. Pembayaran"])


@router.get("/", response_model=list[PaymentRead])
def list_pembayaran(
    id_reservasi: int | None = None,
    status_pembayaran: str | None = None,
    db: Session = Depends(get_db),
) -> list[Payment]:
    query = select(Payment).order_by(Payment.id_payment.desc())
    if id_reservasi is not None:
        query = query.where(Payment.id_reservasi == id_reservasi)
    if status_pembayaran is not None:
        query = query.where(Payment.status == status_pembayaran)
    return list(db.scalars(query).all())


@router.post("/", response_model=PaymentRead, status_code=status.HTTP_201_CREATED)
def create_pembayaran(payload: PaymentCreate, db: Session = Depends(get_db)) -> Payment:
    if not db.get(Reservasi, payload.id_reservasi):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservasi tidak ditemukan")

    payment = Payment(**payload.model_dump())
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


@router.patch("/{payment_id}/status", response_model=PaymentRead)
def update_status_pembayaran(
    payment_id: int,
    payload: PaymentUpdateStatus,
    db: Session = Depends(get_db),
) -> Payment:
    payment = db.get(Payment, payment_id)
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pembayaran tidak ditemukan")

    payment.status = payload.status
    db.commit()
    db.refresh(payment)
    return payment


@router.post("/{payment_id}/logs", response_model=PaymentLogRead, status_code=status.HTTP_201_CREATED)
def create_payment_log(
    payment_id: int,
    payload: PaymentLogCreate,
    db: Session = Depends(get_db),
) -> PaymentLog:
    if not db.get(Payment, payment_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pembayaran tidak ditemukan")

    payment_log = PaymentLog(id_payment=payment_id, response=payload.response)
    db.add(payment_log)
    db.commit()
    db.refresh(payment_log)
    return payment_log


@router.post("/{payment_id}/refunds", response_model=RefundRead, status_code=status.HTTP_201_CREATED)
def create_refund(payment_id: int, payload: RefundCreate, db: Session = Depends(get_db)) -> Refund:
    if not db.get(Payment, payment_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pembayaran tidak ditemukan")

    refund = Refund(id_payment=payment_id, **payload.model_dump())
    db.add(refund)
    db.commit()
    db.refresh(refund)
    return refund


@router.patch("/refunds/{refund_id}/status", response_model=RefundRead)
def update_status_refund(
    refund_id: int,
    payload: RefundUpdateStatus,
    db: Session = Depends(get_db),
) -> Refund:
    refund = db.get(Refund, refund_id)
    if not refund:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Refund tidak ditemukan")

    refund.status = payload.status
    db.commit()
    db.refresh(refund)
    return refund
