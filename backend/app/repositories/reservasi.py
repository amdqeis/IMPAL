from datetime import date

from sqlalchemy import asc, desc, or_, select
from sqlalchemy.orm import Session, selectinload

from app.models import Jadwal, Reservasi, Tempat, User
from app.repositories.query_helpers import apply_sort, normalize_search, paginate_scalars

ACTIVE_RESERVATION_STATUSES = ("pending", "confirmed")


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
) -> tuple[list[Reservasi], int]:
    query = select(Reservasi).options(
        selectinload(Reservasi.user),
        selectinload(Reservasi.tempat).selectinload(Tempat.cabang),
        selectinload(Reservasi.jadwal),
    )
    if id_user is not None:
        query = query.where(Reservasi.id_user == id_user)
    if id_tempat is not None:
        query = query.where(Reservasi.id_tempat == id_tempat)
    if id_jadwal is not None:
        query = query.where(Reservasi.id_jadwal == id_jadwal)

    joined_tempat = False
    if id_cabang is not None:
        query = query.join(Reservasi.tempat).where(Tempat.id_cabang == id_cabang)
        joined_tempat = True
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

    if sort_by == "jam_mulai":
        query = query.join(Reservasi.jadwal)

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
    return paginate_scalars(db, query, page=page, limit=limit)


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
