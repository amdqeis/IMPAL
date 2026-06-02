from datetime import timedelta

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_access_token
from app.models import User, UserRole
from app.repositories.query_helpers import validate_value
from app.schemas.common import PaginatedResponse, build_paginated_response
from app.repositories import users as user_repo
from app.schemas.auth import AuthResponse, LoginRequest, LogoutResponse, UserAccessRead, UserCreate, UserRead, UserUpdate
from app.services.auth_claims import (
    AuthUserLike,
    auth_user_to_user_read,
    extract_auth_claims,
    permission_names_from_user,
    role_names_from_user,
)

ROLE_FILTERS = {"admin", "owner", "user"}


def _role_names(user: AuthUserLike) -> list[str]:
    role_values = getattr(user, "roles", [])
    names: set[str] = set()
    for role in role_values:
        names.add(getattr(role, "nama_role", str(role)))
    return sorted(names)


def _permission_names(user: AuthUserLike) -> list[str]:
    permission_values = getattr(user, "permissions", [])
    permissions = {
        getattr(permission, "nama_permission", str(permission))
        for permission in permission_values
    }
    if permissions:
        return sorted(permissions)
    return permission_names_from_user(user)


def build_auth_response(
    user: AuthUserLike,
    *,
    message: str,
    include_token: bool = False,
) -> AuthResponse:
    """Build auth payload with user access metadata and optional JWT token."""
    token = None
    expires_at = None
    expires_in = None
    roles = _role_names(user)
    permissions = _permission_names(user)

    if include_token:
        expires_delta = timedelta(minutes=settings.access_token_expire_minutes)
        token, expires_at = create_access_token(
            subject=str(user.id_user),
            secret_key=settings.SECRET_KEY,
            algorithm=settings.jwt_algorithm,
            expires_delta=expires_delta,
            claims={
                "email": user.email,
                "name": user.nama,
                "no_hp": user.no_hp,
                "roles": roles,
                "permissions": permissions,
            },
        )
        expires_in = int(expires_delta.total_seconds())

    return AuthResponse(
        user=auth_user_to_user_read(user),
        roles=roles,
        permissions=permissions,
        token=token,
        access_token=token,
        token_type="bearer",
        expires_at=expires_at,
        expires_in=expires_in,
        message=message,
    )


def build_user_access(user: User) -> UserAccessRead:
    return UserAccessRead(
        id_user=user.id_user,
        nama=user.nama,
        email=user.email,
        no_hp=user.no_hp,
        roles=_role_names(user),
        permissions=_permission_names(user),
        status="Active",
    )


def register_user(db: Session, payload: UserCreate) -> AuthResponse:
    """Register a user, assign the default user role, and return an access token."""
    existing_user = find_user_by_email(db, payload.email)
    if existing_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email sudah terdaftar")

    user = User(
        nama=payload.nama,
        email=str(payload.email),
        password="",
        no_hp=payload.no_hp,
    )
    user.set_password(payload.password)
    db.add(user)
    db.flush()

    default_role = user_repo.get_role_by_name(db, "user")
    if default_role:
        db.add(UserRole(id_user=user.id_user, id_role=default_role.id_role))

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email sudah terdaftar") from exc

    db.refresh(user)
    registered_user = user_repo.get_user_by_id_with_access(db, user.id_user) or user
    return build_auth_response(registered_user, message="Registrasi berhasil", include_token=True)

def login_user(db: Session, payload: LoginRequest) -> AuthResponse:
    """Authenticate a user and issue a JWT access token."""
    user = find_user_by_email(db, payload.email)
    if user is None or not validate_user_password(db, user, payload.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email atau password tidak valid")

    return build_auth_response(user, message="Login berhasil", include_token=True)


def logout_user() -> LogoutResponse:
    """Acknowledge logout; the client removes its stored JWT."""
    return LogoutResponse(message="Logout berhasil")


def get_user_access(db: Session, user_id: int) -> AuthResponse:
    """Return roles and permissions for a user."""
    user = user_repo.get_user_by_id_with_access(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User tidak ditemukan")
    return build_auth_response(user, message="Akses user berhasil dimuat")


def list_users(
    db: Session,
    *,
    page: int,
    limit: int,
    search: str | None = None,
    role: str | None = None,
    sort_by: str | None = None,
    sort_order: str = "asc",
) -> PaginatedResponse[UserAccessRead]:
    normalized_role = validate_value(role, ROLE_FILTERS, field_name="role")
    users, total_items = user_repo.list_users(
        db,
        page=page,
        limit=limit,
        search=search,
        role=normalized_role,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    return build_paginated_response(
        [build_user_access(user) for user in users],
        page=page,
        limit=limit,
        total_items=total_items,
    )


def update_user(db: Session, user_id: int, payload: UserUpdate) -> UserAccessRead:
    user = user_repo.get_user_by_id_with_access(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User tidak ditemukan")

    update_data = payload.model_dump(exclude_unset=True)
    role_names = update_data.pop("roles", None)
    for key, value in update_data.items():
        setattr(user, key, value)

    if role_names is not None:
        roles = user_repo.list_roles_by_names(db, role_names)
        found_roles = {role.nama_role for role in roles}
        missing_roles = [role_name for role_name in role_names if role_name not in found_roles]
        if missing_roles:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Role tidak ditemukan: {', '.join(missing_roles)}",
            )
        user.roles = roles

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email sudah terdaftar") from exc

    db.refresh(user)
    refreshed_user = user_repo.get_user_by_id_with_access(db, user_id) or user
    return build_user_access(refreshed_user)


def delete_user(db: Session, user_id: int) -> None:
    user = user_repo.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User tidak ditemukan")
    db.delete(user)
    db.commit()

def find_user_by_email(db: Session, email: str) -> User | None:
    """Find a user by email."""
    return user_repo.get_user_by_email(db, email)

def validate_user_password(db: Session, user: User, password: str) -> bool:
    """Validate a user's email and password."""
    if not user:
        return False
    return user.verify_password(password)
