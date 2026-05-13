from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Cabang, Tempat
from app.repositories import master_data as repo
from app.repositories.query_helpers import validate_value
from app.schemas.common import PaginatedResponse, build_paginated_response
from app.schemas.master_data import CabangCreate, CabangUpdate, TempatCreate, TempatUpdate


TEMPAT_STATUSES = {"available", "occupied", "maintenance", "booked", "unavailable"}


def list_cabang(
    db: Session,
    *,
    page: int,
    limit: int,
    search: str | None = None,
    sort_by: str | None = None,
    sort_order: str = "asc",
) -> PaginatedResponse[Cabang]:
    """Return branches using database pagination."""
    items, total_items = repo.list_cabang(
        db,
        page=page,
        limit=limit,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    return build_paginated_response(items, page=page, limit=limit, total_items=total_items)


def create_cabang(db: Session, payload: CabangCreate) -> Cabang:
    """Create a branch."""
    cabang = Cabang(**payload.model_dump())
    db.add(cabang)
    db.commit()
    db.refresh(cabang)
    return cabang


def update_cabang(db: Session, cabang_id: int, payload: CabangUpdate) -> Cabang:
    """Patch branch data."""
    cabang = repo.get_cabang(db, cabang_id)
    if not cabang:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cabang tidak ditemukan")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(cabang, key, value)

    db.commit()
    db.refresh(cabang)
    return cabang


def delete_cabang(db: Session, cabang_id: int) -> None:
    """Delete a branch."""
    cabang = repo.get_cabang(db, cabang_id)
    if not cabang:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cabang tidak ditemukan")

    db.delete(cabang)
    db.commit()


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
) -> PaginatedResponse[Tempat]:
    """Return tables filtered by branch or table status using database pagination."""
    normalized_status = validate_value(status_tempat, TEMPAT_STATUSES, field_name="status_tempat")
    items, total_items = repo.list_tempat(
        db,
        page=page,
        limit=limit,
        id_cabang=id_cabang,
        status_tempat=normalized_status,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    return build_paginated_response(items, page=page, limit=limit, total_items=total_items)


def create_tempat(db: Session, payload: TempatCreate) -> Tempat:
    """Create a table in an existing branch."""
    if not repo.get_cabang(db, payload.id_cabang):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cabang tidak ditemukan")

    tempat = Tempat(**payload.model_dump())
    db.add(tempat)
    db.commit()
    db.refresh(tempat)
    return tempat


def delete_tempat(db: Session, tempat_id: int) -> None:
    """Delete a table."""
    tempat = repo.get_tempat(db, tempat_id)
    if not tempat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tempat tidak ditemukan")

    db.delete(tempat)
    db.commit()


def update_tempat(db: Session, tempat_id: int, payload: TempatUpdate) -> Tempat:
    """Patch table data."""
    tempat = repo.get_tempat(db, tempat_id)
    if not tempat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tempat tidak ditemukan")

    data = payload.model_dump(exclude_unset=True)
    if "id_cabang" in data and not repo.get_cabang(db, data["id_cabang"]):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cabang tujuan tidak ditemukan")

    for key, value in data.items():
        setattr(tempat, key, value)

    db.commit()
    db.refresh(tempat)
    return tempat
