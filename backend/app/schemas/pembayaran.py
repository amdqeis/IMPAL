from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.reservasi import ReservasiRead


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class PaymentCreate(BaseModel):
    id_reservasi: int
    amount: Decimal = Field(..., ge=0)
    status: str = Field(default="pending", min_length=1, max_length=50)


class PaymentUpdateStatus(BaseModel):
    status: str = Field(..., min_length=1, max_length=50)


class PaymentRead(ORMModel):
    id_payment: int
    id_reservasi: int
    amount: Decimal
    status: str
    reservasi: ReservasiRead | None = None


class PaymentLogCreate(BaseModel):
    response: str = Field(..., min_length=1)


class PaymentLogRead(ORMModel):
    id_log: int
    id_payment: int
    response: str


class RefundCreate(BaseModel):
    amount: Decimal = Field(..., ge=0)
    status: str = Field(default="pending", min_length=1, max_length=50)


class RefundUpdateStatus(BaseModel):
    status: str = Field(..., min_length=1, max_length=50)


class RefundRead(ORMModel):
    id_refund: int
    id_payment: int
    amount: Decimal
    status: str
