from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import TipoMovimientoKardex


class LoteBase(BaseModel):
    producto_id: int
    numero_lote: str = Field(..., min_length=1, max_length=80)
    fecha_vencimiento: date
    costo_compra_unitario: Decimal = Field(..., ge=0)


class LoteCreate(LoteBase):
    stock_inicial: int = Field(..., gt=0, description="Cantidad inicial en unidades mínimas")
    glosa: Optional[str] = Field(
        default="Ingreso por compra de lote", max_length=255
    )


class AjusteLoteCreate(BaseModel):
    lote_id: int
    tipo_movimiento: TipoMovimientoKardex = Field(
        default=TipoMovimientoKardex.MERMA_VENCIMIENTO,
        description="MERMA_VENCIMIENTO o AJUSTE_INVENTARIO",
    )
    cantidad_unidades: int = Field(
        ...,
        gt=0,
        description="Cantidad de unidades mínimas a descontar del lote",
    )
    glosa: str = Field(..., min_length=3, max_length=255)


class LoteRead(LoteBase):
    id: int
    stock_inicial: int
    stock_actual: int
    activo: bool
    creado_en: datetime
    actualizado_en: datetime

    model_config = ConfigDict(from_attributes=True)
