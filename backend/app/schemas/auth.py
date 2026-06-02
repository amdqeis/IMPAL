from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.security import validate_password_strength


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class RoleRead(ORMModel):
    id_role: int
    nama_role: str


class PermissionRead(ORMModel):
    id_permission: int
    id_role: int
    nama_permission: str


class UserCreate(BaseModel):
    nama: str = Field(..., min_length=1, max_length=255)
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=8)
    no_hp: str = Field(..., min_length=11, max_length=12)

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        return validate_password_strength(value)


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=1)


class LogoutResponse(BaseModel):
    message: str


class UserRead(ORMModel):
    id_user: int
    nama: str
    email: str
    no_hp: str


class UserUpdate(BaseModel):
    nama: str | None = Field(default=None, min_length=1, max_length=255)
    email: str | None = Field(default=None, min_length=3, max_length=255)
    no_hp: str | None = Field(default=None, min_length=11, max_length=12)
    roles: list[str] | None = Field(default=None, min_length=1)

    @field_validator("roles")
    @classmethod
    def validate_roles(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return value

        normalized: list[str] = []
        seen: set[str] = set()
        for role in value:
            role_name = role.strip().lower()
            if not role_name:
                raise ValueError("Role tidak boleh kosong")
            if role_name not in {"user", "admin", "owner"}:
                raise ValueError("Role tidak valid")
            if role_name not in seen:
                seen.add(role_name)
                normalized.append(role_name)

        if not normalized:
            raise ValueError("Role minimal satu")
        return normalized


class UserAccessRead(UserRead):
    roles: list[str] = Field(default_factory=list)
    permissions: list[str] = Field(default_factory=list)
    status: str = "Active"


class AuthResponse(BaseModel):
    user: UserRead
    roles: list[str]
    permissions: list[str]
    token: str | None = Field(default=None, description="Field kompatibilitas lama; berisi JWT access token.")
    access_token: str | None = Field(default=None, description="JWT access token untuk header Authorization Bearer.")
    token_type: str = "bearer"
    expires_at: datetime | None = None
    expires_in: int | None = Field(default=None, description="Masa berlaku token dalam detik.")
    message: str
