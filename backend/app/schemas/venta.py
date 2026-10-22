from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import MetodoPago, TipoPresentacion


class ItemVentaInput(BaseModel):
    producto_id: int
    tipo_presentacion: TipoPresentacion = TipoPresentacion.CAJA
    cantidad_presentacion: int = Field(default=1, gt=0)


class VentaCreate(BaseModel):
    metodo_pago: MetodoPago = MetodoPago.EFECTIVO
    usuario_id: Optional[int] = None
    items: List[ItemVentaInput] = Field(..., min_length=1)


class DetalleVentaRead(BaseModel):
    id: int
    lote_id: int
    producto_id: int
    tipo_presentacion: TipoPresentacion
    cantidad_presentacion: int
    cantidad_unidades: int
    precio_unitario: Decimal
    subtotal: Decimal

    model_config = ConfigDict(from_attributes=True)


class VentaRead(BaseModel):
    id: int
    fecha_hora: datetime
    total: Decimal
    metodo_pago: MetodoPago
    usuario_id: Optional[int]
    anulada: bool
    detalles: List[DetalleVentaRead] = []

    model_config = ConfigDict(from_attributes=True)
