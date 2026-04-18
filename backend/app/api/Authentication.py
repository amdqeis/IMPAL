from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import needs_password_rehash
from app.db.session import get_db
from app.models import Permission, Role, User, UserRole

from .schemas import AuthResponse, LoginRequest, UserCreate, UserRead


router = APIRouter(prefix="/auth", tags=["1. Autentikasi"])


def _build_auth_response(user: User, message: str, token: str | None = None) -> AuthResponse:
    roles = [role.nama_role for role in user.roles]
    permissions = sorted({permission.nama_permission for role in user.roles for permission in role.permissions})
    return AuthResponse(
        user=UserRead.model_validate(user),
        roles=roles,
        permissions=permissions,
        token=token,
        message=message,
    )


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)) -> AuthResponse:
    existing_user = db.scalar(select(User).where(User.email == payload.email))
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email sudah terdaftar")

    user = User(
        nama=payload.nama,
        email=str(payload.email),
        password="",
        no_hp=payload.no_hp,
    )
    user.set_password(payload.password)
    db.add(user)
    db.flush()

    default_role = db.scalar(select(Role).where(Role.nama_role == "user"))
    if default_role:
        db.add(UserRole(id_user=user.id_user, id_role=default_role.id_role))

    db.commit()
    db.refresh(user)
    return _build_auth_response(user, message="Registrasi berhasil")


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    user = db.scalar(select(User).where(User.email == payload.email))
    if not user or not user.verify_password(payload.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email atau password tidak valid")

    if needs_password_rehash(user.password):
        user.set_password(payload.password)
        db.add(user)
        db.commit()
        db.refresh(user)

    token = f"token-{user.id_user}"
    return _build_auth_response(user, message="Login berhasil", token=token)


@router.get("/users/{user_id}/access", response_model=AuthResponse)
def get_user_access(user_id: int, db: Session = Depends(get_db)) -> AuthResponse:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User tidak ditemukan")
    return _build_auth_response(user, message="Akses user berhasil dimuat")


@router.get("/permissions", response_model=list[str])
def list_permissions(db: Session = Depends(get_db)) -> list[str]:
    permissions = db.scalars(select(Permission.nama_permission).order_by(Permission.nama_permission)).all()
    return list(permissions)
