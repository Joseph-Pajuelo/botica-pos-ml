from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

from app.models.enums import TipoMovimientoKardex


class KardexRead(BaseModel):
    id: int
    lote_id: int
    tipo_movimiento: TipoMovimientoKardex
    cantidad: int
    stock_resultante: int
    fecha_hora: datetime
    glosa: Optional[str] = None
    referencia_venta_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)
