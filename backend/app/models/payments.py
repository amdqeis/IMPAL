from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class Payment(Base):
    __tablename__ = "payments"

    id_payment: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    id_reservasi: Mapped[int] = mapped_column(
        ForeignKey("reservasi.id_reservasi", ondelete="CASCADE"),
        nullable=False,
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    reservasi: Mapped["Reservasi"] = relationship(
        "Reservasi",
        back_populates="payments",
        lazy="selectin",
    )
    payment_logs: Mapped[list["PaymentLog"]] = relationship(
        "PaymentLog",
        back_populates="payment",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    refunds: Mapped[list["Refund"]] = relationship(
        "Refund",
        back_populates="payment",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"Payment(id_payment={self.id_payment!r}, status={self.status!r})"

