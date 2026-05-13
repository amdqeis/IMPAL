from sqlalchemy import desc, or_, select
from sqlalchemy.orm import Session

from app.models import Laporan
from app.repositories.query_helpers import apply_sort, normalize_search, paginate_scalars


def list_laporan(
    db: Session,
    *,
    page: int,
    limit: int,
    search: str | None = None,
    tipe: str | None = None,
    dibuat_oleh: int | None = None,
    sort_by: str | None = None,
    sort_order: str = "asc",
) -> tuple[list[Laporan], int]:
    query = select(Laporan)
    if tipe:
        query = query.where(Laporan.tipe == tipe.strip().lower())
    if dibuat_oleh is not None:
        query = query.where(Laporan.dibuat_oleh == dibuat_oleh)
    search_value = normalize_search(search)
    if search_value:
        pattern = f"%{search_value}%"
        query = query.where(or_(Laporan.tipe.ilike(pattern), Laporan.lampiran.ilike(pattern)))

    query = apply_sort(
        query,
        sort_by=sort_by,
        sort_order=sort_order,
        allowed_sort_columns={
            "id_laporan": Laporan.id_laporan,
            "tipe": Laporan.tipe,
            "lampiran": Laporan.lampiran,
            "dibuat_oleh": Laporan.dibuat_oleh,
        },
        default_order=(desc(Laporan.id_laporan),),
    )
    return paginate_scalars(db, query, page=page, limit=limit)


def get_laporan(db: Session, laporan_id: int) -> Laporan | None:
    return db.get(Laporan, laporan_id)
