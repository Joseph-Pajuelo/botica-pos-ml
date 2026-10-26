import csv
import io
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import List
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.ml.predictor import ReorderPredictorService
from app.models.kardex import Kardex
from app.models.lote import Lote
from app.models.producto import Producto
from app.models.venta import Venta
from app.schemas.reporte import DesgloseMetodoPago, ResumenEjecutivoResponse


class ReporteService:
    """
    Servicio de analítica gerencial y exportación de reportes CSV (SOLID: SRP).
    """

    def __init__(self, db: Session) -> None:
        self.db = db

    def obtener_resumen_ejecutivo(self) -> ResumenEjecutivoResponse:
        ahora = datetime.now(timezone.utc)
        hoy = date.today()
        inicio_hoy = datetime.combine(hoy, datetime.min.time(), tzinfo=timezone.utc)
        inicio_mes = datetime.combine(
            hoy.replace(day=1), datetime.min.time(), tzinfo=timezone.utc
        )

        # 1. Ventas de hoy (no anuladas)
        stmt_hoy = select(
            func.count(Venta.id),
            func.coalesce(func.sum(Venta.total), 0),
        ).where(Venta.anulada.is_(False), Venta.fecha_hora >= inicio_hoy)
        cant_hoy, monto_hoy = self.db.execute(stmt_hoy).one()

        # 2. Ventas del mes en curso (no anuladas)
        stmt_mes = select(
            func.count(Venta.id),
            func.coalesce(func.sum(Venta.total), 0),
        ).where(Venta.anulada.is_(False), Venta.fecha_hora >= inicio_mes)
        cant_mes, monto_mes = self.db.execute(stmt_mes).one()

        monto_mes_dec = Decimal(str(monto_mes)).quantize(Decimal("0.01"))
        ticket_prom = (
            (monto_mes_dec / Decimal(int(cant_mes))).quantize(Decimal("0.01"))
            if int(cant_mes) > 0
            else Decimal("0.00")
        )

        # 3. Desglose por método de pago (histórico general activo)
        stmt_pagos = (
            select(
                Venta.metodo_pago,
                func.count(Venta.id),
                func.coalesce(func.sum(Venta.total), 0),
            )
            .where(Venta.anulada.is_(False))
            .group_by(Venta.metodo_pago)
        )
        desglose: List[DesgloseMetodoPago] = []
        for metodo, c_ventas, m_total in self.db.execute(stmt_pagos).all():
            nombre_metodo = metodo.value if hasattr(metodo, "value") else str(metodo)
            desglose.append(
                DesgloseMetodoPago(
                    metodo_pago=nombre_metodo,
                    cantidad_ventas=int(c_ventas),
                    monto_total=Decimal(str(m_total)).quantize(Decimal("0.01")),
                )
            )

        # 4. Valorización del inventario vigente (FEFO)
        total_prods = int(
            self.db.scalar(
                select(func.count(Producto.id)).where(Producto.activo.is_(True))
            )
            or 0
        )

        stmt_lotes = (
            select(Lote, Producto)
            .join(Producto, Lote.producto_id == Producto.id)
            .where(
                Lote.activo.is_(True),
                Lote.stock_actual > 0,
                Lote.fecha_vencimiento >= hoy,
            )
        )
        filas_lotes = self.db.execute(stmt_lotes).all()

        valor_costo = Decimal("0.00")
        valor_venta = Decimal("0.00")
        proximos_60d = 0
        limite_60d = hoy + timedelta(days=60)

        for lote, prod in filas_lotes:
            unidades = Decimal(lote.stock_actual)
            valor_costo += unidades * lote.costo_compra_unitario

            precio_u_venta = (
                prod.precio_venta_unitario
                if prod.precio_venta_unitario
                else (
                    prod.precio_venta_caja
                    / Decimal(max(prod.unidades_por_caja, 1))
                )
            )
            valor_venta += unidades * precio_u_venta
            if lote.fecha_vencimiento <= limite_60d:
                proximos_60d += 1

        valor_costo = valor_costo.quantize(Decimal("0.01"))
        valor_venta = valor_venta.quantize(Decimal("0.01"))
        utilidad_potencial = (valor_venta - valor_costo).quantize(Decimal("0.01"))

        return ResumenEjecutivoResponse(
            fecha_corte=ahora,
            ventas_hoy_cantidad=int(cant_hoy),
            ventas_hoy_monto=Decimal(str(monto_hoy)).quantize(Decimal("0.01")),
            ventas_mes_cantidad=int(cant_mes),
            ventas_mes_monto=monto_mes_dec,
            ticket_promedio_mes=ticket_prom,
            desglose_metodos_pago=desglose,
            total_productos_activos=total_prods,
            total_lotes_vigentes=len(filas_lotes),
            lotes_proximos_a_vencer_60d=proximos_60d,
            valor_inventario_costo=valor_costo,
            valor_inventario_venta_estimado=valor_venta,
            utilidad_bruta_potencial_inventario=utilidad_potencial,
        )

    def generar_csv_orden_compra_ml(self, solo_criticos: bool = False) -> str:
        """
        Genera un archivo CSV (con BOM UTF-8 para abrir directo en Microsoft Excel)
        con la orden de compra sugerida por el motor de Machine Learning.
        """
        pred = ReorderPredictorService(self.db).generar_sugerencias_reorden(
            solo_criticos=solo_criticos
        )
        buffer = io.StringIO()
        buffer.write("\ufeff")  # UTF-8 BOM para Excel
        writer = csv.writer(buffer, delimiter=";")

        writer.writerow(
            [
                "CODIGO_BARRAS",
                "MEDICAMENTO",
                "LABORATORIO",
                "ESTADO_ROTACION_ML",
                "STOCK_ACTUAL_UNIDADES",
                "STOCK_MINIMO",
                "DEMANDA_PREDICHA_15_DIAS",
                "DIAS_COBERTURA_ACTUAL",
                "CAJAS_SUGERIDAS_A_PEDIR",
                "UNIDADES_SUGERIDAS_A_PEDIR",
                "INVERSION_ESTIMADA_PEN",
                "PROXIMO_VENCIMIENTO_FEFO",
            ]
        )

        for s in pred.sugerencias:
            writer.writerow(
                [
                    s.codigo_barras,
                    s.nombre,
                    s.laboratorio or "-",
                    s.estado_rotacion.value,
                    s.stock_actual_unidades,
                    s.stock_minimo_unidades,
                    s.demanda_predicha_15d,
                    s.dias_cobertura_actual,
                    s.cajas_sugeridas_compra,
                    s.cantidad_unidades_sugerida,
                    f"{s.inversion_estimada:.2f}",
                    s.proximo_vencimiento_fefo.isoformat()
                    if s.proximo_vencimiento_fefo
                    else "-",
                ]
            )

        return buffer.getvalue()

    def generar_csv_kardex_auditoria(self, limit: int = 500) -> str:
        """
        Genera un archivo CSV auditable con los movimientos inmutables del Kardex.
        """
        stmt = (
            select(Kardex, Lote, Producto)
            .join(Lote, Kardex.lote_id == Lote.id)
            .join(Producto, Lote.producto_id == Producto.id)
            .order_by(Kardex.fecha_hora.desc(), Kardex.id.desc())
            .limit(limit)
        )
        filas = self.db.execute(stmt).all()

        buffer = io.StringIO()
        buffer.write("\ufeff")
        writer = csv.writer(buffer, delimiter=";")

        writer.writerow(
            [
                "ID_MOVIMIENTO",
                "FECHA_HORA",
                "CODIGO_BARRAS",
                "MEDICAMENTO",
                "NUMERO_LOTE",
                "FECHA_VENCIMIENTO_LOTE",
                "TIPO_MOVIMIENTO",
                "CANTIDAD_UNIDADES",
                "STOCK_RESULTANTE_LOTE",
                "GLOSA_AUDITORIA",
            ]
        )

        for kardex, lote, prod in filas:
            tipo = (
                kardex.tipo_movimiento.value
                if hasattr(kardex.tipo_movimiento, "value")
                else str(kardex.tipo_movimiento)
            )
            writer.writerow(
                [
                    kardex.id,
                    kardex.fecha_hora.isoformat(),
                    prod.codigo_barras,
                    prod.nombre,
                    lote.numero_lote,
                    lote.fecha_vencimiento.isoformat(),
                    tipo,
                    kardex.cantidad,
                    kardex.stock_resultante,
                    kardex.glosa or "",
                ]
            )

        return buffer.getvalue()
