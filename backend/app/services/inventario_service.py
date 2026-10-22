from datetime import date, timedelta
from typing import List
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import (
    BoticaDomainError,
    CodigoBarrasDuplicadoError,
    LoteDuplicadoError,
    LoteNoEncontradoError,
    ProductoNoEncontradoError,
    StockInsuficienteError,
)
from app.models.enums import TipoMovimientoKardex
from app.models.kardex import Kardex
from app.models.lote import Lote
from app.models.producto import Producto
from app.repositories.lote_repo import LoteRepository
from app.repositories.producto_repo import ProductoRepository
from app.schemas.lote import AjusteLoteCreate, LoteCreate
from app.schemas.producto import ProductoCreate, ProductoPOSRead, ProductoUpdate


class InventarioService:
    """
    Servicio de aplicación para catálogo, lotes e inmutabilidad del Kardex (SOLID: SRP y DIP).
    Garantiza que ningún stock se modifique sin su correspondiente asiento en el Kardex.
    """

    def __init__(self, db: Session) -> None:
        self.db = db
        self.producto_repo = ProductoRepository(db)
        self.lote_repo = LoteRepository(db)

    def crear_producto(self, payload: ProductoCreate) -> Producto:
        existente = self.producto_repo.get_by_codigo_barras(payload.codigo_barras)
        if existente:
            raise CodigoBarrasDuplicadoError(payload.codigo_barras)

        nuevo = Producto(**payload.model_dump())
        try:
            self.producto_repo.add(nuevo)
            self.db.commit()
            self.db.refresh(nuevo)
            return nuevo
        except IntegrityError as exc:
            self.db.rollback()
            raise CodigoBarrasDuplicadoError(payload.codigo_barras) from exc

    def actualizar_producto(
        self, producto_id: int, payload: ProductoUpdate
    ) -> Producto:
        producto = self.producto_repo.get_by_id(producto_id)
        if not producto:
            raise ProductoNoEncontradoError(producto_id)

        datos = payload.model_dump(exclude_unset=True)
        for campo, valor in datos.items():
            setattr(producto, campo, valor)

        self.db.commit()
        self.db.refresh(producto)
        return producto

    def obtener_por_codigo_barras_pos(self, codigo_barras: str) -> ProductoPOSRead:
        """
        Consulta optimizada (< 100ms) para cuando el lector USB HID escanea un medicamento.
        Retorna el producto enriquecido con el stock FEFO vigente y el lote activo más próximo a vencer.
        """
        producto = self.producto_repo.get_by_codigo_barras(codigo_barras)
        if not producto:
            raise ProductoNoEncontradoError(codigo_barras)

        lotes_vigentes = self.lote_repo.obtener_lotes_disponibles_fefo(producto.id)
        stock_total = sum(lote.stock_actual for lote in lotes_vigentes)
        lote_fefo = lotes_vigentes[0] if lotes_vigentes else None

        respuesta = ProductoPOSRead.model_validate(producto)
        respuesta.stock_total_vigente = stock_total
        respuesta.proximo_vencimiento = (
            lote_fefo.fecha_vencimiento if lote_fefo else None
        )
        respuesta.lote_fefo_numero = lote_fefo.numero_lote if lote_fefo else None
        return respuesta

    def listar_productos(
        self, buscar: str | None = None, skip: int = 0, limit: int = 50
    ) -> List[Producto]:
        if buscar:
            return self.producto_repo.buscar_por_termino(buscar, limit=limit)
        return self.producto_repo.list_all(skip=skip, limit=limit)

    def registrar_ingreso_lote(self, payload: LoteCreate) -> Lote:
        """
        Registra la compra/ingreso de un nuevo lote y crea automáticamente
        el asiento inmutable `COMPRA` en el Kardex dentro de la misma transacción.
        """
        producto = self.producto_repo.get_by_id(payload.producto_id)
        if not producto:
            raise ProductoNoEncontradoError(payload.producto_id)

        nuevo_lote = Lote(
            producto_id=payload.producto_id,
            numero_lote=payload.numero_lote,
            fecha_vencimiento=payload.fecha_vencimiento,
            stock_inicial=payload.stock_inicial,
            stock_actual=payload.stock_inicial,
            costo_compra_unitario=payload.costo_compra_unitario,
            activo=True,
        )
        try:
            self.db.add(nuevo_lote)
            self.db.flush()

            asiento_kardex = Kardex(
                lote_id=nuevo_lote.id,
                tipo_movimiento=TipoMovimientoKardex.COMPRA,
                cantidad=payload.stock_inicial,
                stock_resultante=nuevo_lote.stock_actual,
                glosa=payload.glosa or f"Ingreso de lote {payload.numero_lote}",
            )
            self.db.add(asiento_kardex)
            self.db.commit()
            self.db.refresh(nuevo_lote)
            return nuevo_lote
        except IntegrityError as exc:
            self.db.rollback()
            raise LoteDuplicadoError(payload.numero_lote) from exc

    def registrar_merma_o_ajuste(self, payload: AjusteLoteCreate) -> Lote:
        """
        Descuenta stock por vencimiento (`MERMA_VENCIMIENTO`) o ajuste (`AJUSTE_INVENTARIO`)
        generando obligatoriamente su movimiento inmutable en el Kardex.
        """
        if payload.tipo_movimiento not in (
            TipoMovimientoKardex.MERMA_VENCIMIENTO,
            TipoMovimientoKardex.AJUSTE_INVENTARIO,
        ):
            raise BoticaDomainError(
                "El ajuste manual solo permite MERMA_VENCIMIENTO o AJUSTE_INVENTARIO."
            )

        lote = self.lote_repo.get_by_id(payload.lote_id)
        if not lote:
            raise LoteNoEncontradoError(payload.lote_id)

        if lote.stock_actual < payload.cantidad_unidades:
            raise StockInsuficienteError(
                nombre_producto=f"Lote {lote.numero_lote}",
                solicitado=payload.cantidad_unidades,
                disponible=lote.stock_actual,
            )

        lote.stock_actual -= payload.cantidad_unidades
        asiento = Kardex(
            lote_id=lote.id,
            tipo_movimiento=payload.tipo_movimiento,
            cantidad=-payload.cantidad_unidades,
            stock_resultante=lote.stock_actual,
            glosa=payload.glosa,
        )
        self.db.add(asiento)
        self.db.commit()
        self.db.refresh(lote)
        return lote

    def listar_lotes_por_producto(self, producto_id: int) -> List[Lote]:
        return self.lote_repo.obtener_lotes_disponibles_fefo(producto_id)

    def obtener_alertas_vencimiento(self, dias_umbral: int = 60) -> List[Lote]:
        """Devuelve los lotes con stock > 0 que vencen dentro de los próximos `dias_umbral` días."""
        fecha_limite = date.today() + timedelta(days=dias_umbral)
        stmt = (
            select(Lote)
            .where(
                Lote.activo.is_(True),
                Lote.stock_actual > 0,
                Lote.fecha_vencimiento <= fecha_limite,
            )
            .order_by(Lote.fecha_vencimiento.asc())
        )
        return list(self.db.scalars(stmt).all())

    def obtener_kardex_por_lote(self, lote_id: int) -> List[Kardex]:
        stmt = (
            select(Kardex)
            .where(Kardex.lote_id == lote_id)
            .order_by(Kardex.fecha_hora.desc(), Kardex.id.desc())
        )
        return list(self.db.scalars(stmt).all())
