from datetime import time

from sqlalchemy import asc, select
from sqlalchemy.orm import Session, load_only, noload

from app.models import Jadwal, Tempat
from app.repositories.query_helpers import apply_sort, paginate_scalars


def list_jadwal(
    db: Session,
    *,
    page: int,
    limit: int,
    id_tempat: int | None = None,
    id_cabang: int | None = None,
    jam_mulai: time | None = None,
    jam_selesai: time | None = None,
    sort_by: str | None = None,
    sort_order: str = "asc",
) -> tuple[list[Jadwal], int]:
    query = select(Jadwal).options(
        load_only(Jadwal.id_jadwal, Jadwal.id_tempat, Jadwal.jam_mulai, Jadwal.jam_selesai),
        noload(Jadwal.reservasi_list),
        noload(Jadwal.tempat),
    )
    if id_tempat is not None:
        query = query.where(Jadwal.id_tempat == id_tempat)
    if id_cabang is not None:
        query = query.join(Jadwal.tempat).where(Tempat.id_cabang == id_cabang)
    if jam_mulai is not None:
        query = query.where(Jadwal.jam_mulai == jam_mulai)
    if jam_selesai is not None:
        query = query.where(Jadwal.jam_selesai == jam_selesai)

    query = apply_sort(
        query,
        sort_by=sort_by,
        sort_order=sort_order,
        allowed_sort_columns={
            "id_jadwal": Jadwal.id_jadwal,
            "id_tempat": Jadwal.id_tempat,
            "jam_mulai": Jadwal.jam_mulai,
            "jam_selesai": Jadwal.jam_selesai,
        },
        default_order=(asc(Jadwal.id_tempat), asc(Jadwal.jam_mulai)),
    )
    return paginate_scalars(db, query, page=page, limit=limit)


def list_jadwal_tersedia(
    db: Session,
    *,
    page: int,
    limit: int,
    id_tempat: int | None = None,
    id_cabang: int | None = None,
    jam_mulai: time | None = None,
    jam_selesai: time | None = None,
    sort_by: str | None = None,
    sort_order: str = "asc",
) -> tuple[list[Jadwal], int]:
    query = (
        select(Jadwal)
        .options(
            load_only(Jadwal.id_jadwal, Jadwal.id_tempat, Jadwal.jam_mulai, Jadwal.jam_selesai),
            noload(Jadwal.reservasi_list),
            noload(Jadwal.tempat),
        )
        .join(Tempat)
        .where(Tempat.status == "available")
    )
    if id_tempat is not None:
        query = query.where(Jadwal.id_tempat == id_tempat)
    if id_cabang is not None:
        query = query.where(Tempat.id_cabang == id_cabang)
    if jam_mulai is not None:
        query = query.where(Jadwal.jam_mulai == jam_mulai)
    if jam_selesai is not None:
        query = query.where(Jadwal.jam_selesai == jam_selesai)

    query = apply_sort(
        query,
        sort_by=sort_by,
        sort_order=sort_order,
        allowed_sort_columns={
            "id_jadwal": Jadwal.id_jadwal,
            "id_tempat": Jadwal.id_tempat,
            "jam_mulai": Jadwal.jam_mulai,
            "jam_selesai": Jadwal.jam_selesai,
        },
        default_order=(asc(Jadwal.id_tempat), asc(Jadwal.jam_mulai)),
    )
    return paginate_scalars(db, query, page=page, limit=limit)


def get_jadwal(db: Session, jadwal_id: int) -> Jadwal | None:
    return db.get(Jadwal, jadwal_id)
