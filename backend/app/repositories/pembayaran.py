from datetime import date

from sqlalchemy import desc, or_, select
from sqlalchemy.orm import Session, selectinload

from app.models import Payment, Refund, Reservasi, Tempat, User
from app.repositories.query_helpers import apply_sort, normalize_search, paginate_scalars


def list_pembayaran(
    db: Session,
    *,
    page: int,
    limit: int,
    id_reservasi: int | None = None,
    id_user: int | None = None,
    id_cabang: int | None = None,
    status_pembayaran: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    search: str | None = None,
    sort_by: str | None = None,
    sort_order: str = "asc",
) -> tuple[list[Payment], int]:
    query = select(Payment).options(
        selectinload(Payment.reservasi).selectinload(Reservasi.user),
        selectinload(Payment.reservasi).selectinload(Reservasi.tempat).selectinload(Tempat.cabang),
        selectinload(Payment.reservasi).selectinload(Reservasi.jadwal),
    )
    if id_reservasi is not None:
        query = query.where(Payment.id_reservasi == id_reservasi)

    needs_reservasi_join = any(
        value is not None
        for value in (id_user, id_cabang, start_date, end_date)
    ) or bool(normalize_search(search)) or sort_by == "tanggal"
    joined_tempat = False
    if needs_reservasi_join:
        query = query.join(Payment.reservasi)

    if id_user is not None:
        query = query.where(Reservasi.id_user == id_user)
    if id_cabang is not None:
        query = query.join(Reservasi.tempat).where(Tempat.id_cabang == id_cabang)
        joined_tempat = True
    if status_pembayaran is not None:
        query = query.where(Payment.status == status_pembayaran)
    if start_date is not None:
        query = query.where(Reservasi.tanggal >= start_date)
    if end_date is not None:
        query = query.where(Reservasi.tanggal <= end_date)

    search_value = normalize_search(search)
    if search_value:
        pattern = f"%{search_value}%"
        query = query.join(Reservasi.user)
        if not joined_tempat:
            query = query.join(Reservasi.tempat)
        query = query.where(
            or_(
                User.nama.ilike(pattern),
                User.email.ilike(pattern),
                Tempat.nomor_meja.ilike(pattern),
                Reservasi.status.ilike(pattern),
                Payment.status.ilike(pattern),
            )
        )

    query = apply_sort(
        query,
        sort_by=sort_by,
        sort_order=sort_order,
        allowed_sort_columns={
            "id_payment": Payment.id_payment,
            "id_reservasi": Payment.id_reservasi,
            "amount": Payment.amount,
            "status": Payment.status,
            "tanggal": Reservasi.tanggal,
        },
        default_order=(desc(Payment.id_payment),),
    )
    return paginate_scalars(db, query, page=page, limit=limit)


def get_payment(db: Session, payment_id: int) -> Payment | None:
    return db.get(Payment, payment_id)


def get_refund(db: Session, refund_id: int) -> Refund | None:
    return db.get(Refund, refund_id)
