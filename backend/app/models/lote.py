from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING, List
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.kardex import Kardex
    from app.models.producto import Producto
    from app.models.venta import DetalleVenta


class Lote(Base, TimestampMixin):
    """
    Registro de lote farmacéutico con fecha de vencimiento.
    Soporta el estándar estricto FEFO (First Expired, First Out).
    """

    __tablename__ = "lotes"
    __table_args__ = (
        CheckConstraint("stock_actual >= 0", name="ck_lotes_stock_actual_no_negativo"),
        CheckConstraint("stock_inicial > 0", name="ck_lotes_stock_inicial_positivo"),
        CheckConstraint("costo_compra_unitario >= 0", name="ck_lotes_costo_no_negativo"),
        UniqueConstraint("producto_id", "numero_lote", name="uq_lotes_producto_numero"),
        # Índice compuesto especializado para consulta FEFO en < 100ms
        Index("ix_lotes_fefo_lookup", "producto_id", "fecha_vencimiento", "stock_actual"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    producto_id: Mapped[int] = mapped_column(
        ForeignKey("productos.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    numero_lote: Mapped[str] = mapped_column(String(80), nullable=False)
    fecha_vencimiento: Mapped[date] = mapped_column(Date, nullable=False, index=True)

    # Cantidades expresadas siempre en la unidad mínima del producto
    stock_inicial: Mapped[int] = mapped_column(Integer, nullable=False)
    stock_actual: Mapped[int] = mapped_column(Integer, nullable=False)
    costo_compra_unitario: Mapped[Decimal] = mapped_column(Numeric(10, 4), nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relaciones
    producto: Mapped["Producto"] = relationship(back_populates="lotes")
    detalles_venta: Mapped[List["DetalleVenta"]] = relationship(back_populates="lote")
    movimientos_kardex: Mapped[List["Kardex"]] = relationship(
        back_populates="lote",
        order_by="Kardex.fecha_hora.desc()",
    )
