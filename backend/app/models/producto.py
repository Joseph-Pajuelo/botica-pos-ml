from decimal import Decimal
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import Boolean, CheckConstraint, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.lote import Lote
    from app.models.venta import DetalleVenta


class Producto(Base, TimestampMixin):
    """
    Catálogo maestro de medicamentos y productos de botica.
    Maneja factor de conversión a unidad mínima (tableta/cápsula/ml) para fraccionamiento exacto.
    """

    __tablename__ = "productos"
    __table_args__ = (
        CheckConstraint("unidades_por_caja >= 1", name="ck_productos_unidades_caja_positiva"),
        CheckConstraint(
            "unidades_por_blister IS NULL OR unidades_por_blister >= 1",
            name="ck_productos_unidades_blister_positiva",
        ),
        CheckConstraint("stock_minimo >= 0", name="ck_productos_stock_minimo_no_negativo"),
        CheckConstraint("precio_venta_caja > 0", name="ck_productos_precio_caja_positivo"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    codigo_barras: Mapped[str] = mapped_column(
        String(64), unique=True, index=True, nullable=False
    )
    nombre: Mapped[str] = mapped_column(String(200), index=True, nullable=False)
    principio_activo: Mapped[Optional[str]] = mapped_column(String(200), index=True, nullable=True)
    concentracion: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    laboratorio: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)

    # Precios por presentación
    precio_venta_caja: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    precio_venta_blister: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    precio_venta_unitario: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)

    # Reglas de fraccionamiento (unidad mínima de control en Kardex)
    fraccionable: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    unidades_por_caja: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    unidades_por_blister: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Parámetros de control de inventario y alertas ML
    stock_minimo: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relaciones
    lotes: Mapped[List["Lote"]] = relationship(
        back_populates="producto",
        order_by="Lote.fecha_vencimiento.asc()",
    )
    detalles_venta: Mapped[List["DetalleVenta"]] = relationship(back_populates="producto")
