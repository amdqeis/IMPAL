from __future__ import annotations

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class User(Base):
    __tablename__ = "users"

    id_user: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    nama: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password: Mapped[str] = mapped_column(String(255), nullable=False)
    no_hp: Mapped[str] = mapped_column(String(20), nullable=False)

    user_roles: Mapped[list["UserRole"]] = relationship(
        "UserRole",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
        overlaps="roles,users",
    )
    roles: Mapped[list["Role"]] = relationship(
        "Role",
        secondary="user_roles",
        back_populates="users",
        lazy="selectin",
        overlaps="user,user_roles,role",
    )
    reservasi_list: Mapped[list["Reservasi"]] = relationship(
        "Reservasi",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    laporan_list: Mapped[list["Laporan"]] = relationship(
        "Laporan",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"User(id_user={self.id_user!r}, email={self.email!r})"
