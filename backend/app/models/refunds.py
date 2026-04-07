from __future__ import annotations

from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class Refund(Base):
    __tablename__ = "refunds"

    id_refund: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    id_payment: Mapped[int] = mapped_column(
        ForeignKey("payments.id_payment", ondelete="CASCADE"),
        nullable=False,
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False)

    payment: Mapped["Payment"] = relationship(
        "Payment",
        back_populates="refunds",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"Refund(id_refund={self.id_refund!r}, status={self.status!r})"

