from typing import List
from fastapi import APIRouter, Depends, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.exceptions import CredencialesInvalidasError
from app.schemas.usuario import (
    LoginRequest,
    TokenResponse,
    UsuarioCreate,
    UsuarioRead,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Seguridad, Login JWT y Usuarios"])
security_scheme = HTTPBearer(auto_error=False)


@router.post("/login", response_model=TokenResponse)
def iniciar_sesion(
    payload: LoginRequest, db: Session = Depends(get_db)
):
    """
    Autentica a un trabajador de la botica (admin, farmaceutico o cajero)
    y devuelve un token JWT firmado junto con su perfil y rol.
    """
    return AuthService(db).autenticar(payload)


@router.get("/me", response_model=UsuarioRead)
def obtener_usuario_actual(
    credentials: HTTPAuthorizationCredentials | None = Depends(security_scheme),
    db: Session = Depends(get_db),
):
    """Valida el token Bearer JWT enviado en la cabecera Authorization y retorna el usuario activo."""
    if not credentials or not credentials.credentials:
        raise CredencialesInvalidasError("No se proporcionó un token Bearer de autorización.")
    return AuthService(db).obtener_usuario_desde_token(credentials.credentials)


@router.get("/usuarios", response_model=List[UsuarioRead])
def listar_usuarios(db: Session = Depends(get_db)):
    """Lista los usuarios registrados en el sistema (asegurando las cuentas semilla por rol)."""
    return AuthService(db).listar_usuarios()


@router.post(
    "/usuarios",
    response_model=UsuarioRead,
    status_code=status.HTTP_201_CREATED,
)
def registrar_usuario(
    payload: UsuarioCreate, db: Session = Depends(get_db)
):
    """Registra un nuevo usuario asignándole su rol (ADMIN, FARMACEUTICO o CAJERO)."""
    return AuthService(db).registrar_usuario(payload)
