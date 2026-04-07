from __future__ import annotations

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class Permission(Base):
    __tablename__ = "permissions"

    id_permission: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    id_role: Mapped[int] = mapped_column(
        ForeignKey("roles.id_role", ondelete="CASCADE"),
        nullable=False,
    )
    nama_permission: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)

    role: Mapped["Role"] = relationship(
        "Role",
        back_populates="permissions",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"Permission(id_permission={self.id_permission!r}, nama_permission={self.nama_permission!r})"

