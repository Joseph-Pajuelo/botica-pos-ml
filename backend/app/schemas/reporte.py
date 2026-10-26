from datetime import datetime
from decimal import Decimal
from typing import List
from pydantic import BaseModel


class DesgloseMetodoPago(BaseModel):
    metodo_pago: str
    cantidad_ventas: int
    monto_total: Decimal


class ResumenEjecutivoResponse(BaseModel):
    fecha_corte: datetime
    ventas_hoy_cantidad: int
    ventas_hoy_monto: Decimal
    ventas_mes_cantidad: int
    ventas_mes_monto: Decimal
    ticket_promedio_mes: Decimal
    desglose_metodos_pago: List[DesgloseMetodoPago]
    total_productos_activos: int
    total_lotes_vigentes: int
    lotes_proximos_a_vencer_60d: int
    valor_inventario_costo: Decimal
    valor_inventario_venta_estimado: Decimal
    utilidad_bruta_potencial_inventario: Decimal
