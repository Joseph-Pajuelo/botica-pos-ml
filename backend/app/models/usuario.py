from typing import TYPE_CHECKING, List
from sqlalchemy import Boolean, Enum as SQLEnum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin
from app.models.enums import RolUsuario

if TYPE_CHECKING:
    from app.models.venta import Venta


class Usuario(Base, TimestampMixin):
    """Entidad de usuario del sistema (Cajero, Farmacéutico, Administrador)."""

    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    nombre_completo: Mapped[str] = mapped_column(String(150), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    rol: Mapped[RolUsuario] = mapped_column(
        SQLEnum(RolUsuario, name="rol_usuario_enum"),
        default=RolUsuario.CAJERO,
        nullable=False,
    )
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relaciones
    ventas: Mapped[List["Venta"]] = relationship(back_populates="usuario")
