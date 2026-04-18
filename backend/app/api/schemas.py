from __future__ import annotations

from datetime import date, time
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, field_validator

from app.core.security import validate_password_strength


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class RoleRead(ORMModel):
    id_role: int
    nama_role: str


class PermissionRead(ORMModel):
    id_permission: int
    id_role: int
    nama_permission: str


class UserCreate(BaseModel):
    nama: str
    email: str
    password: str
    no_hp: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        return validate_password_strength(value)


class LoginRequest(BaseModel):
    email: str
    password: str


class UserRead(ORMModel):
    id_user: int
    nama: str
    email: str
    no_hp: str


class AuthResponse(BaseModel):
    user: UserRead
    roles: list[str]
    permissions: list[str]
    token: str | None = None
    message: str


class CabangCreate(BaseModel):
    nama: str
    lokasi: str


class CabangUpdate(BaseModel):
    nama: str | None = None
    lokasi: str | None = None


class CabangRead(ORMModel):
    id_cabang: int
    nama: str
    lokasi: str


class TempatCreate(BaseModel):
    id_cabang: int
    nomor_meja: str
    harga: Decimal
    status: str


class TempatUpdate(BaseModel):
    id_cabang: int | None = None
    nomor_meja: str | None = None
    harga: Decimal | None = None
    status: str | None = None


class TempatRead(ORMModel):
    id_tempat: int
    id_cabang: int
    nomor_meja: str
    harga: Decimal
    status: str


class JadwalCreate(BaseModel):
    id_tempat: int
    tanggal: date
    jam_mulai: time
    jam_selesai: time


class JadwalUpdate(BaseModel):
    id_tempat: int | None = None
    tanggal: date | None = None
    jam_mulai: time | None = None
    jam_selesai: time | None = None


class JadwalRead(ORMModel):
    id_jadwal: int
    id_tempat: int
    tanggal: date
    jam_mulai: time
    jam_selesai: time


class ReservasiCreate(BaseModel):
    id_user: int
    id_jadwal: int
    status: str = "pending"
    total_harga: Decimal


class ReservasiUpdateStatus(BaseModel):
    status: str


class ReservasiRead(ORMModel):
    id_reservasi: int
    id_user: int
    id_jadwal: int
    status: str
    total_harga: Decimal


class PaymentCreate(BaseModel):
    id_reservasi: int
    amount: Decimal
    status: str = "pending"


class PaymentUpdateStatus(BaseModel):
    status: str


class PaymentRead(ORMModel):
    id_payment: int
    id_reservasi: int
    amount: Decimal
    status: str


class PaymentLogCreate(BaseModel):
    response: str


class PaymentLogRead(ORMModel):
    id_log: int
    id_payment: int
    response: str


class RefundCreate(BaseModel):
    amount: Decimal
    status: str = "pending"


class RefundUpdateStatus(BaseModel):
    status: str


class RefundRead(ORMModel):
    id_refund: int
    id_payment: int
    amount: Decimal
    status: str


class LaporanCreate(BaseModel):
    tipe: str
    lampiran: str
    dibuat_oleh: int


class LaporanUpdate(BaseModel):
    tipe: str | None = None
    lampiran: str | None = None
    dibuat_oleh: int | None = None


class LaporanRead(ORMModel):
    id_laporan: int
    tipe: str
    lampiran: str
    dibuat_oleh: int
