from sqlalchemy import asc, or_, select
from sqlalchemy.orm import Session

from app.models import Cabang, Tempat
from app.repositories.query_helpers import apply_sort, normalize_search, paginate_scalars


def list_cabang(
    db: Session,
    *,
    page: int,
    limit: int,
    search: str | None = None,
    sort_by: str | None = None,
    sort_order: str = "asc",
) -> tuple[list[Cabang], int]:
    query = select(Cabang)
    search_value = normalize_search(search)
    if search_value:
        pattern = f"%{search_value}%"
        query = query.where(or_(Cabang.nama.ilike(pattern), Cabang.lokasi.ilike(pattern)))

    query = apply_sort(
        query,
        sort_by=sort_by,
        sort_order=sort_order,
        allowed_sort_columns={
            "id_cabang": Cabang.id_cabang,
            "nama": Cabang.nama,
            "lokasi": Cabang.lokasi,
        },
        default_order=(asc(Cabang.id_cabang),),
    )
    return paginate_scalars(db, query, page=page, limit=limit)


def get_cabang(db: Session, cabang_id: int) -> Cabang | None:
    return db.get(Cabang, cabang_id)


def list_tempat(
    db: Session,
    *,
    page: int,
    limit: int,
    id_cabang: int | None = None,
    status_tempat: str | None = None,
    search: str | None = None,
    sort_by: str | None = None,
    sort_order: str = "asc",
) -> tuple[list[Tempat], int]:
    query = select(Tempat)
    if id_cabang is not None:
        query = query.where(Tempat.id_cabang == id_cabang)
    if status_tempat is not None:
        query = query.where(Tempat.status == status_tempat)
    search_value = normalize_search(search)
    if search_value:
        query = query.where(Tempat.nomor_meja.ilike(f"%{search_value}%"))

    query = apply_sort(
        query,
        sort_by=sort_by,
        sort_order=sort_order,
        allowed_sort_columns={
            "id_tempat": Tempat.id_tempat,
            "id_cabang": Tempat.id_cabang,
            "nomor_meja": Tempat.nomor_meja,
            "harga": Tempat.harga,
            "status": Tempat.status,
        },
        default_order=(asc(Tempat.id_tempat),),
    )
    return paginate_scalars(db, query, page=page, limit=limit)


def get_tempat(db: Session, tempat_id: int) -> Tempat | None:
    return db.get(Tempat, tempat_id)
