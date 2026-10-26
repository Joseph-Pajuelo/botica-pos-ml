from datetime import date
from decimal import Decimal
from typing import List
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.exceptions import (
    ProductoNoEncontradoError,
    StockInsuficienteError,
    VentaNoEncontradaError,
    VentaYaAnuladaError,
)
from app.models.enums import TipoMovimientoKardex
from app.models.kardex import Kardex
from app.models.venta import DetalleVenta, Venta
from app.repositories.lote_repo import LoteRepository
from app.repositories.producto_repo import ProductoRepository
from app.schemas.venta import VentaCreate
from app.services.fraccionamiento_service import FraccionamientoService


class POSService:
    """
    Motor transaccional de Punto de Venta (POS) bajo estándar estricto FEFO.
    - Descuenta automáticamente del lote vigente con fecha de vencimiento más próxima.
    - Si un lote próximo a vencer no cubre toda la cantidad pedida, hace partición
      automática (multi-lote) tomando el saldo del siguiente lote vigente.
    - Registra cada salida y reversión por anulación en el Kardex inmutable.
    """

    def __init__(self, db: Session) -> None:
        self.db = db
        self.producto_repo = ProductoRepository(db)
        self.lote_repo = LoteRepository(db)

    def procesar_venta_fefo(
        self, payload: VentaCreate, fecha_operacion: date | None = None
    ) -> Venta:
        hoy = fecha_operacion or date.today()
        nueva_venta = Venta(
            total=Decimal("0.00"),
            metodo_pago=payload.metodo_pago,
            usuario_id=payload.usuario_id,
            anulada=False,
        )
        self.db.add(nueva_venta)
        self.db.flush()

        total_acumulado = Decimal("0.00")

        for item in payload.items:
            producto = self.producto_repo.get_by_id(item.producto_id)
            if not producto or not producto.activo:
                raise ProductoNoEncontradoError(item.producto_id)

            calculo = FraccionamientoService.calcular(
                producto=producto,
                tipo_presentacion=item.tipo_presentacion,
                cantidad_presentacion=item.cantidad_presentacion,
            )

            lotes_fefo = self.lote_repo.obtener_lotes_disponibles_fefo(
                producto_id=producto.id,
                fecha_referencia=hoy,
                bloquear_filas=True,
            )
            stock_disponible = sum(lote.stock_actual for lote in lotes_fefo)

            if stock_disponible < calculo.unidades_minimas:
                self.db.rollback()
                raise StockInsuficienteError(
                    nombre_producto=producto.nombre,
                    solicitado=calculo.unidades_minimas,
                    disponible=stock_disponible,
                )

            unidades_pendientes = calculo.unidades_minimas
            precio_por_unidad_minima = calculo.subtotal / Decimal(
                calculo.unidades_minimas
            )

            for lote in lotes_fefo:
                if unidades_pendientes == 0:
                    break

                unidades_a_tomar = min(lote.stock_actual, unidades_pendientes)
                lote.stock_actual -= unidades_a_tomar
                unidades_pendientes -= unidades_a_tomar

                subtotal_lote = (
                    calculo.subtotal
                    if unidades_a_tomar == calculo.unidades_minimas
                    else (precio_por_unidad_minima * Decimal(unidades_a_tomar)).quantize(
                        Decimal("0.01")
                    )
                )

                detalle = DetalleVenta(
                    venta_id=nueva_venta.id,
                    lote_id=lote.id,
                    producto_id=producto.id,
                    tipo_presentacion=item.tipo_presentacion,
                    cantidad_presentacion=item.cantidad_presentacion,
                    cantidad_unidades=unidades_a_tomar,
                    precio_unitario=calculo.precio_unitario_presentacion,
                    subtotal=subtotal_lote,
                )
                self.db.add(detalle)

                movimiento = Kardex(
                    lote_id=lote.id,
                    tipo_movimiento=TipoMovimientoKardex.VENTA,
                    cantidad=-unidades_a_tomar,
                    stock_resultante=lote.stock_actual,
                    glosa=f"Venta POS #{nueva_venta.id} ({item.tipo_presentacion.value})",
                    referencia_venta_id=nueva_venta.id,
                )
                self.db.add(movimiento)

            total_acumulado += calculo.subtotal

        nueva_venta.total = total_acumulado.quantize(Decimal("0.01"))
        self.db.commit()
        self.db.refresh(nueva_venta)
        return nueva_venta

    def anular_venta_y_revertir_kardex(
        self, venta_id: int, motivo: str
    ) -> Venta:
        """
        Anula una venta sin borrar registros históricos:
        1. Marca `venta.anulada = True`.
        2. Restaura exactamente las unidades mínimas al `lote_id` original de cada línea.
        3. Inserta un movimiento inmutable compensatorio (`AJUSTE_INVENTARIO`) en el Kardex.
        """
        venta = self.obtener_venta(venta_id)
        if not venta:
            raise VentaNoEncontradaError(venta_id)
        if venta.anulada:
            raise VentaYaAnuladaError(venta_id)

        venta.anulada = True

        for detalle in venta.detalles:
            lote = self.lote_repo.get_by_id(detalle.lote_id)
            if lote:
                lote.stock_actual += detalle.cantidad_unidades
                reversion = Kardex(
                    lote_id=lote.id,
                    tipo_movimiento=TipoMovimientoKardex.AJUSTE_INVENTARIO,
                    cantidad=detalle.cantidad_unidades,
                    stock_resultante=lote.stock_actual,
                    glosa=f"Reversión por anulación de Venta #{venta.id}: {motivo}",
                    referencia_venta_id=venta.id,
                )
                self.db.add(reversion)

        self.db.commit()
        self.db.refresh(venta)
        return venta

    def obtener_venta(self, venta_id: int) -> Venta | None:
        stmt = (
            select(Venta)
            .options(selectinload(Venta.detalles))
            .where(Venta.id == venta_id)
        )
        return self.db.scalars(stmt).first()

    def listar_ventas(self, skip: int = 0, limit: int = 50) -> List[Venta]:
        stmt = (
            select(Venta)
            .options(selectinload(Venta.detalles))
            .order_by(Venta.fecha_hora.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all())
