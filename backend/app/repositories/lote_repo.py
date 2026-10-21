from datetime import date
from typing import List
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.lote import Lote
from app.repositories.base import BaseRepository


class LoteRepository(BaseRepository[Lote]):
    """
    Repositorio especializado en gestión de Lotes bajo el estándar FEFO (First Expired, First Out).
    """

    def __init__(self, db: Session) -> None:
        super().__init__(db, Lote)

    def obtener_lotes_disponibles_fefo(
        self,
        producto_id: int,
        fecha_referencia: date | None = None,
        bloquear_filas: bool = False,
    ) -> List[Lote]:
        """
        Retorna los lotes vigentes con stock > 0 ordenados estrictamente por fecha de vencimiento más próxima (FEFO).
        Si `bloquear_filas=True`, aplica `SELECT ... FOR UPDATE` para evitar condiciones de carrera en el POS.
        """
        hoy = fecha_referencia or date.today()
        stmt = (
            select(Lote)
            .where(
                Lote.producto_id == producto_id,
                Lote.activo.is_(True),
                Lote.stock_actual > 0,
                Lote.fecha_vencimiento >= hoy,
            )
            .order_by(Lote.fecha_vencimiento.asc(), Lote.id.asc())
        )
        if bloquear_filas:
            stmt = stmt.with_for_update()
        return list(self.db.scalars(stmt).all())

    def obtener_stock_total_vigente(
        self, producto_id: int, fecha_referencia: date | None = None
    ) -> int:
        """Suma el stock en unidades mínimas de todos los lotes no vencidos de un producto."""
        hoy = fecha_referencia or date.today()
        stmt = select(func.coalesce(func.sum(Lote.stock_actual), 0)).where(
            Lote.producto_id == producto_id,
            Lote.activo.is_(True),
            Lote.stock_actual > 0,
            Lote.fecha_vencimiento >= hoy,
        )
        return int(self.db.scalar(stmt) or 0)
