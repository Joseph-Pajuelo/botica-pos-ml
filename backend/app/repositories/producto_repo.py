from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.producto import Producto
from app.repositories.base import BaseRepository


class ProductoRepository(BaseRepository[Producto]):
    """Repositorio especializado para consultas rápidas de catálogo y lector HID (< 100ms)."""

    def __init__(self, db: Session) -> None:
        super().__init__(db, Producto)

    def get_by_codigo_barras(self, codigo_barras: str) -> Optional[Producto]:
        stmt = (
            select(Producto)
            .options(selectinload(Producto.lotes))
            .where(Producto.codigo_barras == codigo_barras, Producto.activo.is_(True))
        )
        return self.db.scalars(stmt).first()

    def buscar_por_termino(self, termino: str, limit: int = 20) -> List[Producto]:
        patron = f"%{termino}%"
        stmt = (
            select(Producto)
            .options(selectinload(Producto.lotes))
            .where(
                Producto.activo.is_(True),
                (Producto.nombre.ilike(patron))
                | (Producto.principio_activo.ilike(patron))
                | (Producto.codigo_barras.ilike(patron)),
            )
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all())
