from collections.abc import Callable, Generator
from functools import partial
from typing import Annotated, Any, TypeVar

from anyio import to_thread
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import ExpiredSignatureError, JWTError
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import decode_access_token
from app.db.session import SessionLocal, get_db
from app.repositories import users as user_repo
from app.services.auth_claims import (
    AuthenticatedUser,
    AuthUserLike,
    auth_user_from_claims,
    extract_auth_claims,
)
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


def _decode_bearer_token(credentials: HTTPAuthorizationCredentials | None) -> dict[str, Any]:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token autentikasi wajib dikirim",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        return decode_access_token(
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


def _subject_to_user_id(subject: Any) -> int:
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token tidak memiliki subject",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        return int(subject)
    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Subject token tidak valid",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


def _load_user_claims(db: Session, user_id: int) -> dict[str, Any]:
    user = user_repo.get_user_by_id_with_access(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User token tidak ditemukan",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return extract_auth_claims(user)


def _auth_user_from_jwt_payload(db: Session, payload: dict[str, Any]) -> AuthenticatedUser:
    subject = payload.get("sub")
    user_id = _subject_to_user_id(subject)
    if payload.get("roles") is not None and payload.get("permissions") is not None:
        return auth_user_from_claims(
            {
                "user_id": user_id,
                "email": payload.get("email") or "",
                "name": payload.get("name") or payload.get("nama") or "",
                "no_hp": payload.get("no_hp") or "",
                "roles": payload.get("roles", []),
                "permissions": payload.get("permissions", []),
            }
        )
    return auth_user_from_claims(_load_user_claims(db, user_id))


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: DbSession,
) -> AuthenticatedUser:
    """Return the authenticated user from a Bearer JWT without querying role relations when claims exist."""
    payload = _decode_bearer_token(credentials)
    return _auth_user_from_jwt_payload(db, payload)


def get_current_session_user(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)] = None,
    db: DbSession = Depends(get_db_session),
) -> AuthenticatedUser:
    """Return authenticated user from signed session first, then Bearer JWT fallback."""
    session_user_id = request.session.get("user_id")
    if session_user_id:
        return auth_user_from_claims(
            {
                "user_id": session_user_id,
                "email": request.session.get("email") or "",
                "name": request.session.get("name") or "",
                "no_hp": request.session.get("no_hp") or "",
                "roles": request.session.get("roles", []),
                "permissions": request.session.get("permissions", []),
            }
        )

    payload = _decode_bearer_token(credentials)
    return _auth_user_from_jwt_payload(db, payload)


def _get_current_user_with_db(
    db: Session,
    credentials: HTTPAuthorizationCredentials | None,
) -> AuthenticatedUser:
    return get_current_user(credentials, db)


async def get_current_user_async(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> AuthenticatedUser:
    session_user_id = request.session.get("user_id")
    if session_user_id:
        return auth_user_from_claims(
            {
                "user_id": session_user_id,
                "email": request.session.get("email") or "",
                "name": request.session.get("name") or "",
                "no_hp": request.session.get("no_hp") or "",
                "roles": request.session.get("roles", []),
                "permissions": request.session.get("permissions", []),
            }
        )
    return await run_db(_get_current_user_with_db, credentials)


CurrentUser = Annotated[AuthenticatedUser, Depends(get_current_user_async)]


def get_user_role_names(user: AuthUserLike) -> set[str]:
    role_values = getattr(user, "roles", [])
    role_names: set[str] = set()
    for role in role_values:
        role_names.add(getattr(role, "nama_role", str(role)))
    return role_names


def get_user_permissions(user: AuthUserLike) -> set[str]:
    role_names = get_user_role_names(user)
    permission_values = getattr(user, "permissions", [])
    stored_permissions: set[str] = set()
    for permission in permission_values:
        stored_permissions.add(getattr(permission, "nama_permission", str(permission)))
    if not stored_permissions:
        for role in getattr(user, "roles", []):
            role_permissions = getattr(role, "permissions", [])
            stored_permissions.update(
                getattr(permission, "nama_permission", str(permission))
                for permission in role_permissions
            )
    return stored_permissions | get_default_permissions_for_roles(role_names)


def has_permission(user: AuthUserLike, permission: str) -> bool:
    return permission in get_user_permissions(user)


def has_any_permission(user: AuthUserLike, permissions: set[str]) -> bool:
    return bool(get_user_permissions(user).intersection(permissions))


def require_permissions(*permissions: str) -> Callable[[CurrentUser], AuthenticatedUser]:
    """Build a dependency that requires at least one of the given permissions."""

    def dependency(current_user: CurrentUser) -> AuthenticatedUser:
        if not permissions or has_any_permission(current_user, set(permissions)):
            return current_user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User tidak memiliki permission yang diperlukan",
        )

    return dependency
