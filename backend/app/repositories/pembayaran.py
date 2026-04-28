from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Payment, Refund


def list_pembayaran(
    db: Session,
    *,
    id_reservasi: int | None = None,
    status_pembayaran: str | None = None,
) -> list[Payment]:
    query = select(Payment).order_by(Payment.id_payment.desc())
    if id_reservasi is not None:
        query = query.where(Payment.id_reservasi == id_reservasi)
    if status_pembayaran is not None:
        query = query.where(Payment.status == status_pembayaran)
    return list(db.scalars(query).all())


def get_payment(db: Session, payment_id: int) -> Payment | None:
    return db.get(Payment, payment_id)


def get_refund(db: Session, refund_id: int) -> Refund | None:
    return db.get(Refund, refund_id)
