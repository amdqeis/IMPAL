from datetime import date
import logging
from time import perf_counter
from typing import Any

from sqlalchemy import Select, desc, func, or_, select
from sqlalchemy.orm import Session, aliased

from app.models import Cabang, Jadwal, Payment, Refund, Reservasi, Tempat, User
from app.repositories.query_helpers import apply_sort, normalize_search


query_logger = logging.getLogger("app.db")


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
) -> tuple[list[dict[str, Any]], int]:
    latest_payment = aliased(Payment)
    latest_payment_id = (
        select(latest_payment.id_payment)
        .where(latest_payment.id_reservasi == Reservasi.id_reservasi)
        .order_by(latest_payment.id_payment.desc())
        .limit(1)
        .correlate(Reservasi)
        .scalar_subquery()
    )
    latest_payment_status = (
        select(latest_payment.status)
        .where(latest_payment.id_reservasi == Reservasi.id_reservasi)
        .order_by(latest_payment.id_payment.desc())
        .limit(1)
        .correlate(Reservasi)
        .scalar_subquery()
    )
    query = _base_payment_list_query(latest_payment_id, latest_payment_status)
    query = _apply_payment_list_filters(
        query,
        id_reservasi=id_reservasi,
        id_user=id_user,
        id_cabang=id_cabang,
        status_pembayaran=status_pembayaran,
        start_date=start_date,
        end_date=end_date,
        search=search,
        joined_reservasi=True,
        joined_user=True,
        joined_tempat=True,
    )
    count_query = _apply_payment_list_filters(
        select(func.count(Payment.id_payment)),
        id_reservasi=id_reservasi,
        id_user=id_user,
        id_cabang=id_cabang,
        status_pembayaran=status_pembayaran,
        start_date=start_date,
        end_date=end_date,
        search=search,
        joined_reservasi=False,
        joined_user=False,
        joined_tempat=False,
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
    count_query = count_query.order_by(None)
    count_started_at = perf_counter()
    total_items = db.scalar(count_query) or 0
    count_duration_ms = (perf_counter() - count_started_at) * 1000
    offset = (page - 1) * limit
    data_started_at = perf_counter()
    rows = db.execute(query.offset(offset).limit(limit)).mappings().all()
    data_duration_ms = (perf_counter() - data_started_at) * 1000
    serialize_started_at = perf_counter()
    items = [_payment_list_row_to_dict(row) for row in rows]
    serialize_duration_ms = (perf_counter() - serialize_started_at) * 1000
    query_logger.info(
        "pembayaran.list count %.2fms data %.2fms serialize %.2fms rows=%s total=%s",
        count_duration_ms,
        data_duration_ms,
        serialize_duration_ms,
        len(items),
        total_items,
    )
    return items, total_items


def _base_payment_list_query(latest_payment_id, latest_payment_status) -> Select[Any]:
    return (
        select(
            Payment.id_payment.label("id_payment"),
            Payment.id_reservasi.label("id_reservasi"),
            Payment.amount.label("amount"),
            Payment.status.label("status"),
            Reservasi.id_reservasi.label("reservasi_id_reservasi"),
            Reservasi.id_user.label("reservasi_id_user"),
            Reservasi.id_tempat.label("reservasi_id_tempat"),
            Reservasi.id_jadwal.label("reservasi_id_jadwal"),
            Reservasi.tanggal.label("reservasi_tanggal"),
            Reservasi.status.label("reservasi_status"),
            Reservasi.total_harga.label("reservasi_total_harga"),
            User.id_user.label("user_id_user"),
            User.nama.label("user_nama"),
            User.email.label("user_email"),
            User.no_hp.label("user_no_hp"),
            Tempat.id_tempat.label("tempat_id_tempat"),
            Tempat.id_cabang.label("tempat_id_cabang"),
            Tempat.nomor_meja.label("tempat_nomor_meja"),
            Tempat.harga.label("tempat_harga"),
            Tempat.status.label("tempat_status"),
            Cabang.id_cabang.label("cabang_id_cabang"),
            Cabang.nama.label("cabang_nama"),
            Cabang.lokasi.label("cabang_lokasi"),
            Jadwal.id_jadwal.label("jadwal_id_jadwal"),
            Jadwal.id_tempat.label("jadwal_id_tempat"),
            Jadwal.jam_mulai.label("jadwal_jam_mulai"),
            Jadwal.jam_selesai.label("jadwal_jam_selesai"),
            latest_payment_id.label("latest_payment_id"),
            latest_payment_status.label("latest_payment_status"),
        )
        .select_from(Payment)
        .join(Reservasi, Reservasi.id_reservasi == Payment.id_reservasi)
        .join(User, User.id_user == Reservasi.id_user)
        .join(Tempat, Tempat.id_tempat == Reservasi.id_tempat)
        .join(Cabang, Cabang.id_cabang == Tempat.id_cabang)
        .join(Jadwal, Jadwal.id_jadwal == Reservasi.id_jadwal)
    )


def _apply_payment_list_filters(
    query: Select[Any],
    *,
    id_reservasi: int | None,
    id_user: int | None,
    id_cabang: int | None,
    status_pembayaran: str | None,
    start_date: date | None,
    end_date: date | None,
    search: str | None,
    joined_reservasi: bool,
    joined_user: bool,
    joined_tempat: bool,
) -> Select[Any]:
    if id_reservasi is not None:
        query = query.where(Payment.id_reservasi == id_reservasi)
    if status_pembayaran is not None:
        query = query.where(Payment.status == status_pembayaran)

    if id_user is not None or start_date is not None or end_date is not None:
        if not joined_reservasi:
            query = query.join(Payment.reservasi)
            joined_reservasi = True
        if id_user is not None:
            query = query.where(Reservasi.id_user == id_user)
        if start_date is not None:
            query = query.where(Reservasi.tanggal >= start_date)
        if end_date is not None:
            query = query.where(Reservasi.tanggal <= end_date)

    if id_cabang is not None:
        if not joined_reservasi:
            query = query.join(Payment.reservasi)
            joined_reservasi = True
        if not joined_tempat:
            query = query.join(Reservasi.tempat)
            joined_tempat = True
        query = query.where(Tempat.id_cabang == id_cabang)

    search_value = normalize_search(search)
    if search_value:
        pattern = f"%{search_value}%"
        if not joined_reservasi:
            query = query.join(Payment.reservasi)
            joined_reservasi = True
        if not joined_user:
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
    return query


def _payment_list_row_to_dict(row: Any) -> dict[str, Any]:
    return {
        "id_payment": row["id_payment"],
        "id_reservasi": row["id_reservasi"],
        "amount": row["amount"],
        "status": row["status"],
        "reservasi": {
            "id_reservasi": row["reservasi_id_reservasi"],
            "id_user": row["reservasi_id_user"],
            "id_tempat": row["reservasi_id_tempat"],
            "id_jadwal": row["reservasi_id_jadwal"],
            "tanggal": row["reservasi_tanggal"],
            "status": row["reservasi_status"],
            "total_harga": row["reservasi_total_harga"],
            "latest_payment_id": row["latest_payment_id"],
            "latest_payment_status": row["latest_payment_status"],
            "user": {
                "id_user": row["user_id_user"],
                "nama": row["user_nama"],
                "email": row["user_email"],
                "no_hp": row["user_no_hp"],
            },
            "tempat": {
                "id_tempat": row["tempat_id_tempat"],
                "id_cabang": row["tempat_id_cabang"],
                "nomor_meja": row["tempat_nomor_meja"],
                "harga": row["tempat_harga"],
                "status": row["tempat_status"],
                "cabang": {
                    "id_cabang": row["cabang_id_cabang"],
                    "nama": row["cabang_nama"],
                    "lokasi": row["cabang_lokasi"],
                },
            },
            "jadwal": {
                "id_jadwal": row["jadwal_id_jadwal"],
                "id_tempat": row["jadwal_id_tempat"],
                "jam_mulai": row["jadwal_jam_mulai"],
                "jam_selesai": row["jadwal_jam_selesai"],
            },
        },
    }


def get_payment(db: Session, payment_id: int) -> Payment | None:
    return db.get(Payment, payment_id)


def get_refund(db: Session, refund_id: int) -> Refund | None:
    return db.get(Refund, refund_id)
