from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class EstadoRotacionML(str, Enum):
    CRITICO = "CRITICO"
    ALERTA_REORDEN = "ALERTA_REORDEN"
    RIESGO_VENCIMIENTO = "RIESGO_VENCIMIENTO"
    OPTIMO = "OPTIMO"


class SugerenciaCompraSKU(BaseModel):
    producto_id: int
    codigo_barras: str
    nombre: str
    laboratorio: Optional[str] = None
    unidades_por_caja: int

    # Features operativas e inventario actual
    stock_actual_unidades: int
    stock_minimo_unidades: int
    ventas_ultimos_7d: int = Field(description="Demanda real en t-7")
    ventas_ultimos_14d: int = Field(description="Demanda real en t-14")
    ventas_ultimos_30d: int = Field(description="Demanda real en t-30")
    dias_para_vencimiento_fefo: Optional[int] = None
    proximo_vencimiento_fefo: Optional[date] = None

    # Predicción del modelo ML para horizonte de 15 días
    demanda_predicha_15d: int = Field(
        description="Unidades mínimas proyectadas a vender en los próximos 15 días"
    )
    dias_cobertura_actual: float = Field(
        description="Días que durará el stock actual según la tasa de demanda predicha"
    )
    estado_rotacion: EstadoRotacionML

    # Orden de compra sugerida a droguería
    cantidad_unidades_sugerida: int
    cajas_sugeridas_compra: int
    inversion_estimada: Decimal


class ReorderSuggestionsResponse(BaseModel):
    fecha_generacion: datetime
    horizonte_dias: int = 15
    modelo_utilizado: str
    total_skus_analizados: int
    total_skus_criticos: int
    inversion_total_sugerida: Decimal
    sugerencias: List[SugerenciaCompraSKU]


class SeedColdStartResponse(BaseModel):
    mensaje: str
    productos_creados: int
    lotes_creados: int
    ventas_simuladas: int
    meses_historia: int
