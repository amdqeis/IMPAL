from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol

from app.models import User
from app.schemas.auth import UserRead
from app.services.permissions import get_default_permissions_for_roles


AUTH_SESSION_KEYS = ("user_id", "email", "name", "no_hp", "roles", "permissions")


class AuthUserLike(Protocol):
    id_user: int
    email: str
    nama: str
    no_hp: str
    roles: Any
    permissions: list[str]


@dataclass(slots=True)
class AuthenticatedUser:
    id_user: int
    email: str
    nama: str
    no_hp: str
    role_names: list[str] = field(default_factory=list)
    permissions: list[str] = field(default_factory=list)

    @property
    def roles(self) -> list[str]:
        return self.role_names


def role_names_from_user(user: User) -> list[str]:
    return sorted({role.nama_role for role in user.roles})


def permission_names_from_user(user: User) -> list[str]:
    roles = role_names_from_user(user)
    stored_permissions = {permission.nama_permission for role in user.roles for permission in role.permissions}
    return sorted(stored_permissions | get_default_permissions_for_roles(set(roles)))


def extract_auth_claims(user: User) -> dict[str, Any]:
    return {
        "user_id": user.id_user,
        "email": user.email,
        "name": user.nama,
        "no_hp": user.no_hp,
        "roles": role_names_from_user(user),
        "permissions": permission_names_from_user(user),
    }


def claims_from_auth_response(auth_response) -> dict[str, Any]:
    return {
        "user_id": auth_response.user.id_user,
        "email": auth_response.user.email,
        "name": auth_response.user.nama,
        "no_hp": auth_response.user.no_hp,
        "roles": sorted(set(auth_response.roles)),
        "permissions": sorted(set(auth_response.permissions)),
    }


def session_from_claims(claims: dict[str, Any]) -> dict[str, Any]:
    return {key: claims[key] for key in AUTH_SESSION_KEYS if key in claims}


def auth_user_from_claims(claims: dict[str, Any]) -> AuthenticatedUser:
    user_id = claims.get("user_id") if "user_id" in claims else claims.get("sub")
    return AuthenticatedUser(
        id_user=int(user_id),
        email=str(claims.get("email") or ""),
        nama=str(claims.get("name") or claims.get("nama") or ""),
        no_hp=str(claims.get("no_hp") or ""),
        role_names=sorted({str(role) for role in claims.get("roles", [])}),
        permissions=sorted({str(permission) for permission in claims.get("permissions", [])}),
    )


def auth_user_to_user_read(user: AuthUserLike) -> UserRead:
    return UserRead(
        id_user=user.id_user,
        nama=user.nama,
        email=user.email,
        no_hp=user.no_hp,
    )
