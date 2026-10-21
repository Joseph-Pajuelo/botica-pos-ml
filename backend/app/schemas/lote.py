from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field


class LoteBase(BaseModel):
    producto_id: int
    numero_lote: str = Field(..., min_length=1, max_length=80)
    fecha_vencimiento: date
    costo_compra_unitario: Decimal = Field(..., ge=0)


class LoteCreate(LoteBase):
    stock_inicial: int = Field(..., gt=0, description="Cantidad inicial en unidades mínimas")


class LoteRead(LoteBase):
    id: int
    stock_inicial: int
    stock_actual: int
    activo: bool
    creado_en: datetime
    actualizado_en: datetime

    model_config = ConfigDict(from_attributes=True)
