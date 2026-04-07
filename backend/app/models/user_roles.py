from __future__ import annotations

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class UserRole(Base):
    __tablename__ = "user_roles"

    id_user: Mapped[int] = mapped_column(
        ForeignKey("users.id_user", ondelete="CASCADE"),
        primary_key=True,
    )
    id_role: Mapped[int] = mapped_column(
        ForeignKey("roles.id_role", ondelete="CASCADE"),
        primary_key=True,
    )

    user: Mapped["User"] = relationship(
        "User",
        back_populates="user_roles",
        lazy="selectin",
        overlaps="roles,users",
    )
    role: Mapped["Role"] = relationship(
        "Role",
        back_populates="user_roles",
        lazy="selectin",
        overlaps="roles,users",
    )

    def __repr__(self) -> str:
        return f"UserRole(id_user={self.id_user!r}, id_role={self.id_role!r})"

