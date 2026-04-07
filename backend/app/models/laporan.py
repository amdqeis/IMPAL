from __future__ import annotations

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class Laporan(Base):
    __tablename__ = "laporan"

    id_laporan: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    tipe: Mapped[str] = mapped_column(String(100), nullable=False)
    lampiran: Mapped[str] = mapped_column(String(255), nullable=False)
    dibuat_oleh: Mapped[int] = mapped_column(
        ForeignKey("users.id_user", ondelete="CASCADE"),
        nullable=False,
    )

    user: Mapped["User"] = relationship(
        "User",
        back_populates="laporan_list",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"Laporan(id_laporan={self.id_laporan!r}, tipe={self.tipe!r})"

