from __future__ import annotations

from datetime import date, time

from sqlalchemy import Date, ForeignKey, Time
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class Jadwal(Base):
    __tablename__ = "jadwal"

    id_jadwal: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    id_tempat: Mapped[int] = mapped_column(
        ForeignKey("tempat.id_tempat", ondelete="CASCADE"),
        nullable=False,
    )
    tanggal: Mapped[date] = mapped_column(Date, nullable=False)
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
        return f"Jadwal(id_jadwal={self.id_jadwal!r}, tanggal={self.tanggal!r})"

