from __future__ import annotations

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class Cabang(Base):
    __tablename__ = "cabang"

    id_cabang: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    nama: Mapped[str] = mapped_column(String(255), nullable=False)
    lokasi: Mapped[str] = mapped_column(String(255), nullable=False)

    tempat_list: Mapped[list["Tempat"]] = relationship(
        "Tempat",
        back_populates="cabang",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"Cabang(id_cabang={self.id_cabang!r}, nama={self.nama!r})"


