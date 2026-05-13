from datetime import date
import logging
from time import perf_counter
from typing import Any

from sqlalchemy import Select, desc, func, or_, select
from sqlalchemy.orm import Session

from app.models import Cabang, Jadwal, Payment, Reservasi, Tempat, User
from app.repositories.query_helpers import apply_sort, normalize_search

ACTIVE_RESERVATION_STATUSES = ("pending", "confirmed")
query_logger = logging.getLogger("app.db")


def list_reservasi(
    db: Session,
    *,
    page: int,
    limit: int,
    id_user: int | None = None,
    id_cabang: int | None = None,
    id_tempat: int | None = None,
    id_jadwal: int | None = None,
    status_reservasi: str | None = None,
    tanggal: date | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    search: str | None = None,
    sort_by: str | None = None,
    sort_order: str = "asc",
) -> tuple[list[dict[str, Any]], int]:
    latest_payment_id = (
        select(Payment.id_payment)
        .where(Payment.id_reservasi == Reservasi.id_reservasi)
        .order_by(Payment.id_payment.desc())
        .limit(1)
        .correlate(Reservasi)
        .scalar_subquery()
    )
    latest_payment_status = (
        select(Payment.status)
        .where(Payment.id_reservasi == Reservasi.id_reservasi)
        .order_by(Payment.id_payment.desc())
        .limit(1)
        .correlate(Reservasi)
        .scalar_subquery()
    )
    query = _base_reservasi_list_query(latest_payment_id, latest_payment_status)
    query = _apply_reservasi_list_filters(
        query,
        id_user=id_user,
        id_cabang=id_cabang,
        id_tempat=id_tempat,
        id_jadwal=id_jadwal,
        status_reservasi=status_reservasi,
        tanggal=tanggal,
        start_date=start_date,
        end_date=end_date,
        search=search,
        joined_user=True,
        joined_tempat=True,
    )
    count_query = _apply_reservasi_list_filters(
        select(func.count(Reservasi.id_reservasi)),
        id_user=id_user,
        id_cabang=id_cabang,
        id_tempat=id_tempat,
        id_jadwal=id_jadwal,
        status_reservasi=status_reservasi,
        tanggal=tanggal,
        start_date=start_date,
        end_date=end_date,
        search=search,
        joined_user=False,
        joined_tempat=False,
    )

    query = apply_sort(
        query,
        sort_by=sort_by,
        sort_order=sort_order,
        allowed_sort_columns={
            "id_reservasi": Reservasi.id_reservasi,
            "id_user": Reservasi.id_user,
            "id_tempat": Reservasi.id_tempat,
            "id_jadwal": Reservasi.id_jadwal,
            "tanggal": Reservasi.tanggal,
            "status": Reservasi.status,
            "total_harga": Reservasi.total_harga,
            "jam_mulai": Jadwal.jam_mulai,
        },
        default_order=(desc(Reservasi.id_reservasi),),
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
    items = [_reservasi_list_row_to_dict(row) for row in rows]
    serialize_duration_ms = (perf_counter() - serialize_started_at) * 1000
    query_logger.info(
        "reservasi.list count %.2fms data %.2fms serialize %.2fms rows=%s total=%s",
        count_duration_ms,
        data_duration_ms,
        serialize_duration_ms,
        len(items),
        total_items,
    )
    return items, total_items


def _base_reservasi_list_query(latest_payment_id, latest_payment_status) -> Select[Any]:
    return (
        select(
            Reservasi.id_reservasi.label("id_reservasi"),
            Reservasi.id_user.label("id_user"),
            Reservasi.id_tempat.label("id_tempat"),
            Reservasi.id_jadwal.label("id_jadwal"),
            Reservasi.tanggal.label("tanggal"),
            Reservasi.status.label("status"),
            Reservasi.total_harga.label("total_harga"),
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
        .select_from(Reservasi)
        .join(User, User.id_user == Reservasi.id_user)
        .join(Tempat, Tempat.id_tempat == Reservasi.id_tempat)
        .join(Cabang, Cabang.id_cabang == Tempat.id_cabang)
        .join(Jadwal, Jadwal.id_jadwal == Reservasi.id_jadwal)
    )


def _apply_reservasi_list_filters(
    query: Select[Any],
    *,
    id_user: int | None,
    id_cabang: int | None,
    id_tempat: int | None,
    id_jadwal: int | None,
    status_reservasi: str | None,
    tanggal: date | None,
    start_date: date | None,
    end_date: date | None,
    search: str | None,
    joined_user: bool,
    joined_tempat: bool,
) -> Select[Any]:
    if id_user is not None:
        query = query.where(Reservasi.id_user == id_user)
    if id_tempat is not None:
        query = query.where(Reservasi.id_tempat == id_tempat)
    if id_jadwal is not None:
        query = query.where(Reservasi.id_jadwal == id_jadwal)

    if id_cabang is not None:
        if not joined_tempat:
            query = query.join(Reservasi.tempat)
            joined_tempat = True
        query = query.where(Tempat.id_cabang == id_cabang)
    if status_reservasi is not None:
        query = query.where(Reservasi.status == status_reservasi)
    if tanggal is not None:
        query = query.where(Reservasi.tanggal == tanggal)
    if start_date is not None:
        query = query.where(Reservasi.tanggal >= start_date)
    if end_date is not None:
        query = query.where(Reservasi.tanggal <= end_date)

    search_value = normalize_search(search)
    if search_value:
        pattern = f"%{search_value}%"
        if not joined_user:
            query = query.join(Reservasi.user)
        if not joined_tempat:
            query = query.join(Reservasi.tempat)
        query = query.where(
            or_(
                User.nama.ilike(pattern),
                User.email.ilike(pattern),
                Tempat.nomor_meja.ilike(pattern),
            )
        )
    return query


def _reservasi_list_row_to_dict(row: Any) -> dict[str, Any]:
    return {
        "id_reservasi": row["id_reservasi"],
        "id_user": row["id_user"],
        "id_tempat": row["id_tempat"],
        "id_jadwal": row["id_jadwal"],
        "tanggal": row["tanggal"],
        "status": row["status"],
        "total_harga": row["total_harga"],
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
    }


def get_reservasi(db: Session, reservasi_id: int) -> Reservasi | None:
    return db.get(Reservasi, reservasi_id)


def list_active_reservasi_for_tempat_tanggal(db: Session, *, id_tempat: int, tanggal: date) -> list[Reservasi]:
    query = select(Reservasi).where(
        Reservasi.id_tempat == id_tempat,
        Reservasi.tanggal == tanggal,
        Reservasi.status.in_(ACTIVE_RESERVATION_STATUSES),
    )
    return list(db.scalars(query).all())


def list_active_jadwal_ids_for_tempat_tanggal(db: Session, *, id_tempat: int, tanggal: date) -> set[int]:
    query = select(Reservasi.id_jadwal).where(
        Reservasi.id_tempat == id_tempat,
        Reservasi.tanggal == tanggal,
        Reservasi.status.in_(ACTIVE_RESERVATION_STATUSES),
    )
    return set(db.scalars(query).all())


def get_active_slot_conflict(
    db: Session,
    *,
    id_tempat: int,
    id_jadwal: int,
    tanggal: date,
    exclude_reservasi_id: int | None = None,
) -> Reservasi | None:
    query = select(Reservasi).where(
        Reservasi.id_tempat == id_tempat,
        Reservasi.id_jadwal == id_jadwal,
        Reservasi.tanggal == tanggal,
        Reservasi.status.in_(ACTIVE_RESERVATION_STATUSES),
    )
    if exclude_reservasi_id is not None:
        query = query.where(Reservasi.id_reservasi != exclude_reservasi_id)
    return db.scalars(query).first()
