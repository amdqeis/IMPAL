from __future__ import annotations

from sqlalchemy import ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class PaymentLog(Base):
    __tablename__ = "payment_logs"

    id_log: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    id_payment: Mapped[int] = mapped_column(
        ForeignKey("payments.id_payment", ondelete="CASCADE"),
        nullable=False,
    )
    response: Mapped[str] = mapped_column(Text, nullable=False)

    payment: Mapped["Payment"] = relationship(
        "Payment",
        back_populates="payment_logs",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"PaymentLog(id_log={self.id_log!r}, id_payment={self.id_payment!r})"

