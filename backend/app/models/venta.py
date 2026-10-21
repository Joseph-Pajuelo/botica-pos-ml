from datetime import datetime, timezone
from decimal import Decimal
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Enum as SQLEnum,
    ForeignKey,
    Integer,
    Numeric,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.enums import MetodoPago, TipoPresentacion

if TYPE_CHECKING:
    from app.models.lote import Lote
    from app.models.producto import Producto
    from app.models.usuario import Usuario


class Venta(Base):
    """Cabecera de transacción de venta en el Punto de Venta (POS)."""

    __tablename__ = "ventas"
    __table_args__ = (
        CheckConstraint("total >= 0", name="ck_ventas_total_no_negativo"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    fecha_hora: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
        index=True,
    )
    total: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    metodo_pago: Mapped[MetodoPago] = mapped_column(
        SQLEnum(MetodoPago, name="metodo_pago_enum"),
        default=MetodoPago.EFECTIVO,
        nullable=False,
    )
    usuario_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("usuarios.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )
    anulada: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relaciones
    usuario: Mapped[Optional["Usuario"]] = relationship(back_populates="ventas")
    detalles: Mapped[List["DetalleVenta"]] = relationship(
        back_populates="venta",
        cascade="all, delete-orphan",
    )


class DetalleVenta(Base):
    """
    Línea de detalle de una venta vinculada exactamente al Lote descontado (trazabilidad FEFO).
    Si una venta abarca dos lotes distintos de un mismo producto, genera dos registros aquí.
    """

    __tablename__ = "detalle_ventas"
    __table_args__ = (
        CheckConstraint("cantidad_presentacion > 0", name="ck_detalle_cantidad_pres_positiva"),
        CheckConstraint("cantidad_unidades > 0", name="ck_detalle_cantidad_unid_positiva"),
        CheckConstraint("precio_unitario >= 0", name="ck_detalle_precio_no_negativo"),
        CheckConstraint("subtotal >= 0", name="ck_detalle_subtotal_no_negativo"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    venta_id: Mapped[int] = mapped_column(
        ForeignKey("ventas.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    lote_id: Mapped[int] = mapped_column(
        ForeignKey("lotes.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    producto_id: Mapped[int] = mapped_column(
        ForeignKey("productos.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    tipo_presentacion: Mapped[TipoPresentacion] = mapped_column(
        SQLEnum(TipoPresentacion, name="tipo_presentacion_enum"),
        default=TipoPresentacion.CAJA,
        nullable=False,
    )
    cantidad_presentacion: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    cantidad_unidades: Mapped[int] = mapped_column(Integer, nullable=False)
    precio_unitario: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)

    # Relaciones
    venta: Mapped["Venta"] = relationship(back_populates="detalles")
    lote: Mapped["Lote"] = relationship(back_populates="detalles_venta")
    producto: Mapped["Producto"] = relationship(back_populates="detalles_venta")
