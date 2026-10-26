from typing import List
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import (
    CredencialesInvalidasError,
    UsuarioDuplicadoError,
)
from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from app.models.enums import RolUsuario
from app.models.usuario import Usuario
from app.schemas.usuario import (
    LoginRequest,
    TokenResponse,
    UsuarioCreate,
    UsuarioRead,
)


USUARIOS_SEMILLA = [
    {
        "username": "admin",
        "nombre_completo": "Administrador General Botica",
        "password": "admin123",
        "rol": RolUsuario.ADMIN,
    },
    {
        "username": "farmaceutico",
        "nombre_completo": "Q.F. Director Técnico",
        "password": "farma123",
        "rol": RolUsuario.FARMACEUTICO,
    },
    {
        "username": "cajero",
        "nombre_completo": "Cajero de Mostrador Principal",
        "password": "caja123",
        "rol": RolUsuario.CAJERO,
    },
]


class AuthService:
    """
    Servicio de autenticación JWT y gestión de usuarios por rol (SOLID: SRP).
    """

    def __init__(self, db: Session) -> None:
        self.db = db

    def asegurar_usuarios_por_defecto(self) -> None:
        """Crea las cuentas por defecto (admin, farmaceutico, cajero) si la tabla está vacía."""
        for item in USUARIOS_SEMILLA:
            stmt = select(Usuario).where(Usuario.username == item["username"])
            existente = self.db.scalars(stmt).first()
            if not existente:
                nuevo = Usuario(
                    username=item["username"],
                    nombre_completo=item["nombre_completo"],
                    password_hash=hash_password(item["password"]),
                    rol=item["rol"],
                    activo=True,
                )
                self.db.add(nuevo)
        self.db.commit()

    def registrar_usuario(self, payload: UsuarioCreate) -> Usuario:
        stmt = select(Usuario).where(Usuario.username == payload.username)
        if self.db.scalars(stmt).first():
            raise UsuarioDuplicadoError(payload.username)

        nuevo = Usuario(
            username=payload.username,
            nombre_completo=payload.nombre_completo,
            password_hash=hash_password(payload.password),
            rol=payload.rol,
            activo=payload.activo,
        )
        try:
            self.db.add(nuevo)
            self.db.commit()
            self.db.refresh(nuevo)
            return nuevo
        except IntegrityError as exc:
            self.db.rollback()
            raise UsuarioDuplicadoError(payload.username) from exc

    def autenticar(self, payload: LoginRequest) -> TokenResponse:
        self.asegurar_usuarios_por_defecto()
        stmt = select(Usuario).where(
            Usuario.username == payload.username,
            Usuario.activo.is_(True),
        )
        usuario = self.db.scalars(stmt).first()
        if not usuario or not verify_password(payload.password, usuario.password_hash):
            raise CredencialesInvalidasError()

        token = create_access_token(
            subject=usuario.username,
            rol=usuario.rol.value,
        )
        return TokenResponse(
            access_token=token,
            token_type="bearer",
            expira_en_minutos=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
            usuario=UsuarioRead.model_validate(usuario),
        )

    def obtener_usuario_desde_token(self, token: str) -> Usuario:
        datos = decode_access_token(token)
        if not datos or "sub" not in datos:
            raise CredencialesInvalidasError("Token JWT inválido o expirado.")

        stmt = select(Usuario).where(
            Usuario.username == datos["sub"],
            Usuario.activo.is_(True),
        )
        usuario = self.db.scalars(stmt).first()
        if not usuario:
            raise CredencialesInvalidasError("El usuario asociado al token no existe o está inactivo.")
        return usuario

    def listar_usuarios(self) -> List[Usuario]:
        self.asegurar_usuarios_por_defecto()
        stmt = select(Usuario).order_by(Usuario.id.asc())
        return list(self.db.scalars(stmt).all())
