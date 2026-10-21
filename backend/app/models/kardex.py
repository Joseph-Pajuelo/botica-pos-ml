from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional
from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Enum as SQLEnum,
    ForeignKey,
    Integer,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.enums import TipoMovimientoKardex

if TYPE_CHECKING:
    from app.models.lote import Lote


class Kardex(Base):
    """
    Registro inmutable de movimientos de inventario por lote.
    Regla crítica: Nunca se actualiza ni elimina un registro de Kardex; todo cambio es un INSERT.
    """

    __tablename__ = "kardex"
    __table_args__ = (
        CheckConstraint("cantidad != 0", name="ck_kardex_cantidad_no_cero"),
        CheckConstraint("stock_resultante >= 0", name="ck_kardex_stock_resultante_no_negativo"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    lote_id: Mapped[int] = mapped_column(
        ForeignKey("lotes.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    tipo_movimiento: Mapped[TipoMovimientoKardex] = mapped_column(
        SQLEnum(TipoMovimientoKardex, name="tipo_movimiento_kardex_enum"),
        nullable=False,
        index=True,
    )
    # Cantidad en unidades mínimas (positiva para entradas, negativa o absoluta según convención documentada)
    cantidad: Mapped[int] = mapped_column(Integer, nullable=False)
    stock_resultante: Mapped[int] = mapped_column(Integer, nullable=False)
    fecha_hora: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
        index=True,
    )
    glosa: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    referencia_venta_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("ventas.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Relaciones
    lote: Mapped["Lote"] = relationship(back_populates="movimientos_kardex")
