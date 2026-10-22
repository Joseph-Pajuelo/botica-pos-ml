from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Dict, List, Optional
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.lote import Lote
from app.models.producto import Producto
from app.models.venta import DetalleVenta, Venta


@dataclass
class SKUFeatureRow:
    """Vector de características operativas de un SKU para inferencia y entrenamiento ML."""

    producto: Producto
    stock_actual_unidades: int
    costo_unitario_referencia: Decimal
    proximo_vencimiento_fefo: Optional[date]
    dias_para_vencimiento_fefo: Optional[int]
    ventas_7d: int
    ventas_14d: int
    ventas_30d: int
    promedio_diario_7d: float
    promedio_diario_30d: float
    tendencia_reciente: float
    dia_semana: int
    mes_actual: int
    serie_diaria_90d: List[int]


class FeatureBuilder:
    """
    Constructor de variables predictivas (SOLID: SRP).
    Extrae lags temporales (t-7, t-14, t-30), estacionalidad y métricas FEFO desde PostgreSQL.
    """

    def __init__(self, db: Session) -> None:
        self.db = db

    def construir_features_catalogo(
        self, fecha_referencia: Optional[date] = None
    ) -> List[SKUFeatureRow]:
        hoy = fecha_referencia or date.today()
        ahora_dt = datetime.combine(hoy, datetime.max.time(), tzinfo=timezone.utc)
        hace_90d = ahora_dt - timedelta(days=90)

        productos = list(
            self.db.scalars(
                select(Producto).where(Producto.activo.is_(True)).order_by(Producto.id.asc())
            ).all()
        )
        if not productos:
            return []

        # 1. Consultar lotes vigentes agrupados por producto
        lotes_vigentes = list(
            self.db.scalars(
                select(Lote)
                .where(
                    Lote.activo.is_(True),
                    Lote.stock_actual > 0,
                    Lote.fecha_vencimiento >= hoy,
                )
                .order_by(Lote.fecha_vencimiento.asc())
            ).all()
        )

        stock_por_prod: Dict[int, int] = {}
        vencimiento_por_prod: Dict[int, date] = {}
        costo_por_prod: Dict[int, Decimal] = {}

        for lote in lotes_vigentes:
            pid = lote.producto_id
            stock_por_prod[pid] = stock_por_prod.get(pid, 0) + lote.stock_actual
            if pid not in vencimiento_por_prod:
                vencimiento_por_prod[pid] = lote.fecha_vencimiento
                costo_por_prod[pid] = lote.costo_compra_unitario

        # 2. Consultar ventas diarias de los últimos 90 días para calcular lags t-7, t-14, t-30
        stmt_ventas = (
            select(
                DetalleVenta.producto_id,
                func.date(Venta.fecha_hora).label("dia"),
                func.sum(DetalleVenta.cantidad_unidades).label("unidades"),
            )
            .join(Venta, DetalleVenta.venta_id == Venta.id)
            .where(
                Venta.anulada.is_(False),
                Venta.fecha_hora >= hace_90d,
            )
            .group_by(DetalleVenta.producto_id, func.date(Venta.fecha_hora))
        )
        filas_ventas = self.db.execute(stmt_ventas).all()

        mapa_ventas_diarias: Dict[int, Dict[date, int]] = {p.id: {} for p in productos}
        for pid, dia_raw, unidades in filas_ventas:
            if pid not in mapa_ventas_diarias:
                continue
            dia_obj = (
                date.fromisoformat(dia_raw)
                if isinstance(dia_raw, str)
                else dia_raw
            )
            mapa_ventas_diarias[pid][dia_obj] = int(unidades or 0)

        resultados: List[SKUFeatureRow] = []
        for prod in productos:
            ventas_prod = mapa_ventas_diarias.get(prod.id, {})
            serie_90d = [
                ventas_prod.get(hoy - timedelta(days=offset), 0)
                for offset in range(89, -1, -1)
            ]

            ventas_7d = sum(serie_90d[-7:])
            ventas_14d = sum(serie_90d[-14:])
            ventas_30d = sum(serie_90d[-30:])

            prom_7d = ventas_7d / 7.0
            prom_30d = ventas_30d / 30.0
            tendencia = (prom_7d / prom_30d) if prom_30d > 0 else 1.0

            prox_venc = vencimiento_por_prod.get(prod.id)
            dias_venc = (prox_venc - hoy).days if prox_venc else None

            # Costo unitario de referencia (si no hay lote activo, estima 60% del precio de venta por unidad)
            costo_ref = costo_por_prod.get(prod.id)
            if costo_ref is None:
                costo_ref = (
                    prod.precio_venta_caja / Decimal(max(prod.unidades_por_caja, 1))
                ) * Decimal("0.60")

            resultados.append(
                SKUFeatureRow(
                    producto=prod,
                    stock_actual_unidades=stock_por_prod.get(prod.id, 0),
                    costo_unitario_referencia=costo_ref,
                    proximo_vencimiento_fefo=prox_venc,
                    dias_para_vencimiento_fefo=dias_venc,
                    ventas_7d=ventas_7d,
                    ventas_14d=ventas_14d,
                    ventas_30d=ventas_30d,
                    promedio_diario_7d=round(prom_7d, 3),
                    promedio_diario_30d=round(prom_30d, 3),
                    tendencia_reciente=round(tendencia, 3),
                    dia_semana=hoy.weekday(),
                    mes_actual=hoy.month,
                    serie_diaria_90d=serie_90d,
                )
            )

        return resultados
