from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class CabangCreate(BaseModel):
    nama: str = Field(..., min_length=1, max_length=255)
    lokasi: str = Field(..., min_length=1, max_length=255)


class CabangUpdate(BaseModel):
    nama: str | None = Field(default=None, min_length=1, max_length=255)
    lokasi: str | None = Field(default=None, min_length=1, max_length=255)


class CabangRead(ORMModel):
    id_cabang: int
    nama: str
    lokasi: str


class TempatCreate(BaseModel):
    id_cabang: int
    nomor_meja: str = Field(..., min_length=1, max_length=50)
    harga: Decimal = Field(..., ge=0)
    status: str = Field(..., min_length=1, max_length=50)


class TempatUpdate(BaseModel):
    id_cabang: int | None = None
    nomor_meja: str | None = Field(default=None, min_length=1, max_length=50)
    harga: Decimal | None = Field(default=None, ge=0)
    status: str | None = Field(default=None, min_length=1, max_length=50)


class TempatRead(ORMModel):
    id_tempat: int
    id_cabang: int
    nomor_meja: str
    harga: Decimal
    status: str
