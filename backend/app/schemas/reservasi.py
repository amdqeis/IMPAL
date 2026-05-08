from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.auth import UserRead
from app.schemas.jadwal import JadwalRead
from app.schemas.master_data import TempatRead


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class ReservasiCreate(BaseModel):
    id_user: int
    id_tempat: int
    id_jadwal: int
    tanggal: date
    status: str = Field(default="pending", min_length=1, max_length=50)
    total_harga: Decimal = Field(..., ge=0)


class ReservasiUpdateStatus(BaseModel):
    status: str = Field(..., min_length=1, max_length=50)


class ReservasiRead(ORMModel):
    id_reservasi: int
    id_user: int
    id_tempat: int
    id_jadwal: int
    tanggal: date
    status: str
    total_harga: Decimal
    user: UserRead | None = None
    tempat: TempatRead | None = None
    jadwal: JadwalRead | None = None
