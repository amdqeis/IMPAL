from __future__ import annotations

from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class Tempat(Base):
    __tablename__ = "tempat"

    id_tempat: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    id_cabang: Mapped[int] = mapped_column(
        ForeignKey("cabang.id_cabang", ondelete="CASCADE"),
        nullable=False,
    )
    nomor_meja: Mapped[str] = mapped_column(String(50), nullable=False)
    harga: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False)

    cabang: Mapped["Cabang"] = relationship(
        "Cabang",
        back_populates="tempat_list",
        lazy="selectin",
    )
    jadwal_list: Mapped[list["Jadwal"]] = relationship(
        "Jadwal",
        back_populates="tempat",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"Tempat(id_tempat={self.id_tempat!r}, nomor_meja={self.nomor_meja!r})"

