from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Permission, Role, User


def get_user_by_id(db: Session, user_id: int) -> User | None:
    return db.get(User, user_id)


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email))


def get_role_by_name(db: Session, role_name: str) -> Role | None:
    return db.scalar(select(Role).where(Role.nama_role == role_name))


def list_permission_names(db: Session) -> list[str]:
    permissions = db.scalars(select(Permission.nama_permission).order_by(Permission.nama_permission)).all()
    return list(permissions)
