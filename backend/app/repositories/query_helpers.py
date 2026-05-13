from collections.abc import Sequence
import logging
from time import perf_counter
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import Select, asc, desc, func
from sqlalchemy.orm import Session


query_logger = logging.getLogger("app.db")


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


def paginate_scalars(
    db: Session,
    query: Select[Any],
    *,
    page: int,
    limit: int,
    count_query: Select[Any] | None = None,
    log_label: str = "pagination",
) -> tuple[list[Any], int]:
    if count_query is None:
        count_query = query.with_only_columns(func.count(), maintain_column_froms=True)
    count_query = count_query.order_by(None)
    count_started_at = perf_counter()
    total_items = db.scalar(count_query) or 0
    count_duration_ms = (perf_counter() - count_started_at) * 1000
    offset = (page - 1) * limit
    items_started_at = perf_counter()
    items = list(db.scalars(query.offset(offset).limit(limit)).all())
    items_duration_ms = (perf_counter() - items_started_at) * 1000
    query_logger.info(
        "%s count %.2fms data %.2fms serialize 0.00ms rows=%s total=%s",
        log_label,
        count_duration_ms,
        items_duration_ms,
        len(items),
        total_items,
    )
    return items, total_items
