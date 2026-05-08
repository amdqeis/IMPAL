from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import CurrentUser, DbSession, has_permission, require_permissions
from app.repositories import users as user_repo
from app.schemas import AuthResponse, COMMON_ERROR_RESPONSES, LoginRequest, LogoutResponse, UserAccessRead, UserCreate, UserUpdate
from app.services import auth as auth_service
from app.services.permissions import MANAGE_ROLES, MANAGE_USERS


router = APIRouter(prefix="/auth", tags=["1. Autentikasi"])


@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register user baru",
    description="Mendaftarkan user baru, meng-hash password, memberi role default user, dan mengembalikan JWT access token.",
    responses=COMMON_ERROR_RESPONSES,
)
def register(payload: UserCreate, db: DbSession) -> AuthResponse:
    """Register a user and return access metadata."""
    return auth_service.register_user(db, payload)


@router.post(
    "/login",
    response_model=AuthResponse,
    summary="Login user",
    description="Memvalidasi email/password dan menghasilkan JWT access token dengan roles dan permissions user.",
    responses=COMMON_ERROR_RESPONSES,
)
def login(payload: LoginRequest, db: DbSession) -> AuthResponse:
    """Authenticate a user and issue a JWT access token."""
    return auth_service.login_user(db, payload)


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
    response_model=list[UserAccessRead],
    summary="List users",
    description="Mengembalikan daftar user beserta role dan permission. Membutuhkan permission manage_users.",
    responses=COMMON_ERROR_RESPONSES,
)
def list_users(
    db: DbSession,
    _current_user=Depends(require_permissions(MANAGE_USERS)),
) -> list[UserAccessRead]:
    """Return all users for admin management."""
    return auth_service.list_users(db)


@router.get(
    "/users/{user_id}/access",
    response_model=AuthResponse,
    summary="Lihat akses user",
    description="Mengembalikan role dan permission user. User boleh melihat miliknya sendiri; manage_users boleh melihat semua user.",
    responses=COMMON_ERROR_RESPONSES,
)
def get_user_access(user_id: int, db: DbSession, current_user: CurrentUser) -> AuthResponse:
    """Return role and permission metadata for a user."""
    if user_id != current_user.id_user and not has_permission(current_user, MANAGE_USERS):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User tidak boleh melihat akses user lain")
    return auth_service.get_user_access(db, user_id)


@router.patch(
    "/users/{user_id}",
    response_model=UserAccessRead,
    summary="Update user",
    description="Memperbarui profil user. User boleh memperbarui dirinya sendiri; manage_users boleh memperbarui semua user.",
    responses=COMMON_ERROR_RESPONSES,
)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: DbSession,
    current_user: CurrentUser,
) -> UserAccessRead:
    """Patch user profile data."""
    if user_id != current_user.id_user and not has_permission(current_user, MANAGE_USERS):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User tidak boleh mengubah user lain")
    return auth_service.update_user(db, user_id, payload)


@router.delete(
    "/users/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete user",
    description="Menghapus user. Membutuhkan permission manage_users.",
    responses=COMMON_ERROR_RESPONSES,
)
def delete_user(
    user_id: int,
    db: DbSession,
    _current_user=Depends(require_permissions(MANAGE_USERS)),
):
    """Delete a user."""
    auth_service.delete_user(db, user_id)


@router.get(
    "/permissions",
    response_model=list[str],
    summary="List permission",
    description="Mengembalikan seluruh nama permission yang tersedia. Endpoint ini membutuhkan permission manage_roles.",
    responses=COMMON_ERROR_RESPONSES,
)
def list_permissions(
    db: DbSession,
    _current_user=Depends(require_permissions(MANAGE_ROLES)),
) -> list[str]:
    """List all configured permission names."""
    return user_repo.list_permission_names(db)
