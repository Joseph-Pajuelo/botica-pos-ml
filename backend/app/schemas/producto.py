from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class ProductoBase(BaseModel):
    codigo_barras: str = Field(..., min_length=3, max_length=64, description="Código EAN/UPC o interno")
    nombre: str = Field(..., min_length=2, max_length=200)
    principio_activo: Optional[str] = Field(default=None, max_length=200)
    concentracion: Optional[str] = Field(default=None, max_length=100)
    laboratorio: Optional[str] = Field(default=None, max_length=150)
    precio_venta_caja: Decimal = Field(..., gt=0)
    precio_venta_blister: Optional[Decimal] = Field(default=None, gt=0)
    precio_venta_unitario: Optional[Decimal] = Field(default=None, gt=0)
    fraccionable: bool = Field(default=False)
    unidades_por_caja: int = Field(default=1, ge=1)
    unidades_por_blister: Optional[int] = Field(default=None, ge=1)
    stock_minimo: int = Field(default=10, ge=0)
    activo: bool = Field(default=True)


class ProductoCreate(ProductoBase):
    pass


class ProductoUpdate(BaseModel):
    nombre: Optional[str] = Field(default=None, min_length=2, max_length=200)
    principio_activo: Optional[str] = Field(default=None, max_length=200)
    concentracion: Optional[str] = Field(default=None, max_length=100)
    laboratorio: Optional[str] = Field(default=None, max_length=150)
    precio_venta_caja: Optional[Decimal] = Field(default=None, gt=0)
    precio_venta_blister: Optional[Decimal] = Field(default=None, gt=0)
    precio_venta_unitario: Optional[Decimal] = Field(default=None, gt=0)
    fraccionable: Optional[bool] = None
    unidades_por_caja: Optional[int] = Field(default=None, ge=1)
    unidades_por_blister: Optional[int] = Field(default=None, ge=1)
    stock_minimo: Optional[int] = Field(default=None, ge=0)
    activo: Optional[bool] = None


class ProductoRead(ProductoBase):
    id: int
    creado_en: datetime
    actualizado_en: datetime

    model_config = ConfigDict(from_attributes=True)


class ProductoPOSRead(ProductoRead):
    """Respuesta enriquecida para lectura rápida de código de barras en el POS (< 100ms)."""

    stock_total_vigente: int = Field(
        default=0, description="Suma de unidades mínimas en lotes no vencidos"
    )
    proximo_vencimiento: Optional[date] = Field(
        default=None, description="Fecha de vencimiento del lote FEFO activo más próximo"
    )
    lote_fefo_numero: Optional[str] = Field(
        default=None, description="Número del lote que se descontará primero bajo regla FEFO"
    )
