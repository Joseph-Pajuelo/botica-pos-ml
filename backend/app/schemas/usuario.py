from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import RolUsuario


class UsuarioBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    nombre_completo: str = Field(..., min_length=3, max_length=150)
    rol: RolUsuario = RolUsuario.CAJERO
    activo: bool = True


class UsuarioCreate(UsuarioBase):
    password: str = Field(..., min_length=4, max_length=128)


class UsuarioRead(UsuarioBase):
    id: int
    creado_en: datetime
    actualizado_en: datetime

    model_config = ConfigDict(from_attributes=True)


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expira_en_minutos: int
    usuario: UsuarioRead
