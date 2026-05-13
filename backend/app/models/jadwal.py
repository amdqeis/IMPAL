from __future__ import annotations

from datetime import time

from sqlalchemy import ForeignKey, Index, Time
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class Jadwal(Base):
    __tablename__ = "jadwal"
    __table_args__ = (
        Index("ix_jadwal_id_tempat", "id_tempat"),
        Index("ix_jadwal_id_tempat_jam_mulai", "id_tempat", "jam_mulai"),
    )

    id_jadwal: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    id_tempat: Mapped[int] = mapped_column(
        ForeignKey("tempat.id_tempat", ondelete="CASCADE"),
        nullable=False,
    )
    jam_mulai: Mapped[time] = mapped_column(Time, nullable=False)
    jam_selesai: Mapped[time] = mapped_column(Time, nullable=False)

    tempat: Mapped["Tempat"] = relationship(
        "Tempat",
        back_populates="jadwal_list",
        lazy="selectin",
    )
    reservasi_list: Mapped[list["Reservasi"]] = relationship(
        "Reservasi",
        back_populates="jadwal",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"Jadwal(id_jadwal={self.id_jadwal!r}, id_tempat={self.id_tempat!r})"
