from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import CurrentUser, require_permissions, run_db
from app.models import User
from app.repositories import users as user_repo
from app.schemas import (
    AuthResponse,
    COMMON_ERROR_RESPONSES,
    LoginRequest,
    LogoutResponse,
    PaginatedResponse,
    UserAccessRead,
    UserCreate,
    UserUpdate,
)
from app.services import auth as auth_service
from app.services.permissions import MANAGE_ROLES


router = APIRouter(prefix="/auth", tags=["1. Autentikasi"])


def _role_names(user: User) -> set[str]:
    return {role.nama_role.lower() for role in user.roles}


def _can_manage_users(user: User) -> bool:
    roles = _role_names(user)
    return "admin" in roles and "owner" not in roles


def require_admin_user_manager(current_user: CurrentUser) -> User:
    if _can_manage_users(current_user):
        return current_user
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Hanya admin yang dapat mengelola data user",
    )


@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register user baru",
    description="Mendaftarkan user baru, meng-hash password, memberi role default user, dan mengembalikan JWT access token.",
    responses=COMMON_ERROR_RESPONSES,
)
async def register(payload: UserCreate) -> AuthResponse:
    """Register a user and return access metadata."""
    return await run_db(auth_service.register_user, payload)


@router.post(
    "/login",
    response_model=AuthResponse,
    summary="Login user",
    description="Memvalidasi email/password dan menghasilkan JWT access token dengan roles dan permissions user.",
    responses=COMMON_ERROR_RESPONSES,
)
async def login(payload: LoginRequest) -> AuthResponse:
    """Authenticate a user and issue a JWT access token."""
    return await run_db(auth_service.login_user, payload)


@router.post(
    "/logout",
    response_model=LogoutResponse,
    summary="Logout user",
    description="Logout stateless. Client menghapus JWT dari localStorage/sessionStorage.",
    responses=COMMON_ERROR_RESPONSES,
)
def logout(_current_user: CurrentUser) -> LogoutResponse:
    """Acknowledge logout; the client discards the stored JWT."""
    return auth_service.logout_user()


@router.get(
    "/me",
    response_model=AuthResponse,
    summary="Lihat user login",
    description="Mengembalikan metadata akses untuk user yang sedang login.",
    responses=COMMON_ERROR_RESPONSES,
)
def get_me(current_user: CurrentUser) -> AuthResponse:
    """Return current user access metadata."""
    return auth_service.build_auth_response(current_user, message="User berhasil dimuat")


@router.get(
    "/users",
    response_model=PaginatedResponse[UserAccessRead],
    summary="List users",
    description="Mengembalikan daftar user beserta role dan permission. Membutuhkan permission manage_users.",
    responses=COMMON_ERROR_RESPONSES,
)
async def list_users(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None, min_length=1, max_length=255),
    role: str | None = Query(default=None),
    sort_by: str | None = Query(default=None),
    sort_order: Literal["asc", "desc"] = "asc",
    _current_user=Depends(require_admin_user_manager),
) -> PaginatedResponse[UserAccessRead]:
    """Return all users for admin management."""
    return await run_db(
        auth_service.list_users,
        page=page,
        limit=limit,
        search=search,
        role=role,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.get(
    "/users/{user_id}/access",
    response_model=AuthResponse,
    summary="Lihat akses user",
    description="Mengembalikan role dan permission user. User boleh melihat miliknya sendiri; manage_users boleh melihat semua user.",
    responses=COMMON_ERROR_RESPONSES,
)
async def get_user_access(user_id: int, current_user: CurrentUser) -> AuthResponse:
    """Return role and permission metadata for a user."""
    if user_id != current_user.id_user and not _can_manage_users(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User tidak boleh melihat akses user lain")
    return await run_db(auth_service.get_user_access, user_id)


@router.patch(
    "/users/{user_id}",
    response_model=UserAccessRead,
    summary="Update user",
    description="Memperbarui profil user. User boleh memperbarui dirinya sendiri; manage_users boleh memperbarui semua user.",
    responses=COMMON_ERROR_RESPONSES,
)
async def update_user(
    user_id: int,
    payload: UserUpdate,
    current_user: CurrentUser,
) -> UserAccessRead:
    """Patch user profile data."""
    if user_id != current_user.id_user and not _can_manage_users(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User tidak boleh mengubah user lain")
    return await run_db(auth_service.update_user, user_id, payload)


@router.delete(
    "/users/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete user",
    description="Menghapus user. Membutuhkan permission manage_users.",
    responses=COMMON_ERROR_RESPONSES,
)
async def delete_user(
    user_id: int,
    _current_user=Depends(require_admin_user_manager),
):
    """Delete a user."""
    await run_db(auth_service.delete_user, user_id)


@router.get(
    "/permissions",
    response_model=list[str],
    summary="List permission",
    description="Mengembalikan seluruh nama permission yang tersedia. Endpoint ini membutuhkan permission manage_roles.",
    responses=COMMON_ERROR_RESPONSES,
)
async def list_permissions(
    _current_user=Depends(require_permissions(MANAGE_ROLES)),
) -> list[str]:
    """List all configured permission names."""
    return await run_db(user_repo.list_permission_names)
