from __future__ import annotations

from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class Reservasi(Base):
    __tablename__ = "reservasi"

    id_reservasi: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    id_user: Mapped[int] = mapped_column(
        ForeignKey("users.id_user", ondelete="CASCADE"),
        nullable=False,
    )
    id_jadwal: Mapped[int] = mapped_column(
        ForeignKey("jadwal.id_jadwal", ondelete="CASCADE"),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(String(50), nullable=False)
    total_harga: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    user: Mapped["User"] = relationship(
        "User",
        back_populates="reservasi_list",
        lazy="selectin",
    )
    jadwal: Mapped["Jadwal"] = relationship(
        "Jadwal",
        back_populates="reservasi_list",
        lazy="selectin",
    )
    payments: Mapped[list["Payment"]] = relationship(
        "Payment",
        back_populates="reservasi",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"Reservasi(id_reservasi={self.id_reservasi!r}, status={self.status!r})"

