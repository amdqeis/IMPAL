from __future__ import annotations

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class Role(Base):
    __tablename__ = "roles"

    id_role: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    nama_role: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)

    user_roles: Mapped[list["UserRole"]] = relationship(
        "UserRole",
        back_populates="role",
        cascade="all, delete-orphan",
        lazy="selectin",
        overlaps="roles,users",
    )
    users: Mapped[list["User"]] = relationship(
        "User",
        secondary="user_roles",
        back_populates="roles",
        lazy="selectin",
        overlaps="user,user_roles,role",
    )
    permissions: Mapped[list["Permission"]] = relationship(
        "Permission",
        back_populates="role",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"Role(id_role={self.id_role!r}, nama_role={self.nama_role!r})"

