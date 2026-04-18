from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import Cabang, Tempat

from .schemas import (
    CabangCreate,
    CabangRead,
    CabangUpdate,
    TempatCreate,
    TempatRead,
    TempatUpdate,
)


router = APIRouter(prefix="/master-data", tags=["2. Kelola Cabang & Tempat"])


@router.get("/cabang", response_model=list[CabangRead])
def list_cabang(db: Session = Depends(get_db)) -> list[Cabang]:
    return list(db.scalars(select(Cabang).order_by(Cabang.id_cabang)).all())


@router.post("/cabang", response_model=CabangRead, status_code=status.HTTP_201_CREATED)
def create_cabang(payload: CabangCreate, db: Session = Depends(get_db)) -> Cabang:
    cabang = Cabang(**payload.model_dump())
    db.add(cabang)
    db.commit()
    db.refresh(cabang)
    return cabang


@router.patch("/cabang/{cabang_id}", response_model=CabangRead)
def update_cabang(cabang_id: int, payload: CabangUpdate, db: Session = Depends(get_db)) -> Cabang:
    cabang = db.get(Cabang, cabang_id)
    if not cabang:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cabang tidak ditemukan")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(cabang, key, value)

    db.commit()
    db.refresh(cabang)
    return cabang


@router.get("/tempat", response_model=list[TempatRead])
def list_tempat(
    id_cabang: int | None = None,
    status_tempat: str | None = None,
    db: Session = Depends(get_db),
) -> list[Tempat]:
    query = select(Tempat).order_by(Tempat.id_tempat)
    if id_cabang is not None:
        query = query.where(Tempat.id_cabang == id_cabang)
    if status_tempat is not None:
        query = query.where(Tempat.status == status_tempat)
    return list(db.scalars(query).all())


@router.post("/tempat", response_model=TempatRead, status_code=status.HTTP_201_CREATED)
def create_tempat(payload: TempatCreate, db: Session = Depends(get_db)) -> Tempat:
    if not db.get(Cabang, payload.id_cabang):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cabang tidak ditemukan")

    tempat = Tempat(**payload.model_dump())
    db.add(tempat)
    db.commit()
    db.refresh(tempat)
    return tempat


@router.patch("/tempat/{tempat_id}", response_model=TempatRead)
def update_tempat(tempat_id: int, payload: TempatUpdate, db: Session = Depends(get_db)) -> Tempat:
    tempat = db.get(Tempat, tempat_id)
    if not tempat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tempat tidak ditemukan")

    data = payload.model_dump(exclude_unset=True)
    if "id_cabang" in data and not db.get(Cabang, data["id_cabang"]):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cabang tujuan tidak ditemukan")

    for key, value in data.items():
        setattr(tempat, key, value)

    db.commit()
    db.refresh(tempat)
    return tempat
