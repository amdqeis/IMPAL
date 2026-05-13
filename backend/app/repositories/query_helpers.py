from collections.abc import Sequence
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import Select, asc, desc, func, select
from sqlalchemy.orm import Session


def normalize_search(search: str | None) -> str | None:
    if search is None:
        return None
    stripped = search.strip()
    return stripped or None


def validate_value(value: str | None, allowed_values: set[str], *, field_name: str) -> str | None:
    if value is None:
        return None
    normalized = value.strip().lower()
    if normalized not in allowed_values:
        allowed = ", ".join(sorted(allowed_values))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field_name} harus salah satu dari: {allowed}",
        )
    return normalized


def apply_sort(
    query: Select[Any],
    *,
    sort_by: str | None,
    sort_order: str,
    allowed_sort_columns: dict[str, Any],
    default_order: Sequence[Any],
) -> Select[Any]:
    if sort_by is None:
        return query.order_by(*default_order)

    if sort_by not in allowed_sort_columns:
        allowed = ", ".join(sorted(allowed_sort_columns))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"sort_by harus salah satu dari: {allowed}",
        )

    column = allowed_sort_columns[sort_by]
    ordering = desc(column) if sort_order == "desc" else asc(column)
    return query.order_by(ordering)


def paginate_scalars(db: Session, query: Select[Any], *, page: int, limit: int) -> tuple[list[Any], int]:
    count_query = select(func.count()).select_from(query.order_by(None).subquery())
    total_items = db.scalar(count_query) or 0
    offset = (page - 1) * limit
    items = list(db.scalars(query.offset(offset).limit(limit)).all())
    return items, total_items
