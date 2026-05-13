from collections.abc import Callable, Generator
from functools import partial
from typing import Annotated, Any, TypeVar

from anyio import to_thread
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import ExpiredSignatureError, JWTError
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.core.security import decode_access_token
from app.db.session import SessionLocal, get_db
from app.models import Role, User
from app.services.permissions import get_default_permissions_for_roles


bearer_scheme = HTTPBearer(auto_error=False)
T = TypeVar("T")


def get_db_session() -> Generator[Session, None, None]:
    yield from get_db()


DbSession = Annotated[Session, Depends(get_db_session)]


def _run_with_db(
    func: Callable[..., T],
    serializer: type[BaseModel] | None,
    *args: Any,
    **kwargs: Any,
) -> T | BaseModel | None:
    db = SessionLocal()
    try:
        result = func(db, *args, **kwargs)
        if serializer is not None and result is not None:
            return serializer.model_validate(result)
        return result
    finally:
        db.close()


async def run_db(
    func: Callable[..., T],
    *args: Any,
    serializer: type[BaseModel] | None = None,
    **kwargs: Any,
) -> T | BaseModel | None:
    """Run blocking SQLAlchemy work outside the event loop."""
    return await to_thread.run_sync(partial(_run_with_db, func, serializer, *args, **kwargs))


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: DbSession,
) -> User:
    """Return the authenticated user from a Bearer JWT."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token autentikasi wajib dikirim",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decode_access_token(
            credentials.credentials,
            secret_key=settings.SECRET_KEY,
            algorithms=[settings.jwt_algorithm],
        )
    except ExpiredSignatureError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token sudah expired",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token tidak valid",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    subject = payload.get("sub")
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token tidak memiliki subject",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_id = int(subject)
    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Subject token tidak valid",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    user = db.scalar(
        select(User)
        .options(selectinload(User.roles).selectinload(Role.permissions))
        .where(User.id_user == user_id)
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User token tidak ditemukan",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def _get_current_user_with_db(
    db: Session,
    credentials: HTTPAuthorizationCredentials | None,
) -> User:
    return get_current_user(credentials, db)


async def get_current_user_async(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> User:
    return await run_db(_get_current_user_with_db, credentials)


CurrentUser = Annotated[User, Depends(get_current_user_async)]


def get_user_permissions(user: User) -> set[str]:
    role_names = {role.nama_role for role in user.roles}
    stored_permissions = {permission.nama_permission for role in user.roles for permission in role.permissions}
    return stored_permissions | get_default_permissions_for_roles(role_names)


def has_permission(user: User, permission: str) -> bool:
    return permission in get_user_permissions(user)


def has_any_permission(user: User, permissions: set[str]) -> bool:
    return bool(get_user_permissions(user).intersection(permissions))


def require_permissions(*permissions: str) -> Callable[[CurrentUser], User]:
    """Build a dependency that requires at least one of the given permissions."""

    def dependency(current_user: CurrentUser) -> User:
        if not permissions or has_any_permission(current_user, set(permissions)):
            return current_user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User tidak memiliki permission yang diperlukan",
        )

    return dependency
