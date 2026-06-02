from sqlalchemy import asc, or_, select
from sqlalchemy.orm import Session, load_only, noload, selectinload

from app.models import Permission, Role, User
from app.repositories.query_helpers import apply_sort, normalize_search, paginate_scalars


def _user_access_options():
    return (
        load_only(User.id_user, User.nama, User.email, User.password, User.no_hp),
        noload(User.user_roles),
        noload(User.reservasi_list),
        noload(User.laporan_list),
        selectinload(User.roles).options(
            load_only(Role.id_role, Role.nama_role),
            noload(Role.user_roles),
            noload(Role.users),
            selectinload(Role.permissions).options(
                load_only(Permission.id_permission, Permission.id_role, Permission.nama_permission),
                noload(Permission.role),
            ),
        ),
    )


def get_user_by_id(db: Session, user_id: int) -> User | None:
    return db.get(User, user_id)


def get_user_by_id_with_access(db: Session, user_id: int) -> User | None:
    return db.scalar(
        select(User)
        .options(*_user_access_options())
        .where(User.id_user == user_id)
    )


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(
        select(User)
        .options(*_user_access_options())
        .where(User.email == email)
    )


def list_users(
    db: Session,
    *,
    page: int,
    limit: int,
    search: str | None = None,
    role: str | None = None,
    sort_by: str | None = None,
    sort_order: str = "asc",
) -> tuple[list[User], int]:
    query = select(User).options(*_user_access_options())
    search_value = normalize_search(search)
    if search_value:
        pattern = f"%{search_value}%"
        query = query.where(or_(User.nama.ilike(pattern), User.email.ilike(pattern), User.no_hp.ilike(pattern)))
    if role:
        query = query.where(User.roles.any(Role.nama_role == role.strip().lower()))

    query = apply_sort(
        query,
        sort_by=sort_by,
        sort_order=sort_order,
        allowed_sort_columns={
            "id_user": User.id_user,
            "nama": User.nama,
            "email": User.email,
            "no_hp": User.no_hp,
        },
        default_order=(asc(User.id_user),),
    )
    return paginate_scalars(db, query, page=page, limit=limit)


def get_role_by_name(db: Session, role_name: str) -> Role | None:
    return db.scalar(select(Role).where(Role.nama_role == role_name))


def list_roles_by_names(db: Session, role_names: list[str]) -> list[Role]:
    if not role_names:
        return []
    roles = db.scalars(select(Role).where(Role.nama_role.in_(role_names))).all()
    return list(roles)


def list_permission_names(db: Session) -> list[str]:
    permissions = db.scalars(select(Permission.nama_permission).order_by(Permission.nama_permission)).all()
    return list(permissions)
