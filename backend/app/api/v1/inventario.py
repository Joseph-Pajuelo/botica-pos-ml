from typing import List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.kardex import KardexRead
from app.schemas.lote import AjusteLoteCreate, LoteCreate, LoteRead
from app.services.inventario_service import InventarioService

router = APIRouter(prefix="/inventario", tags=["Inventario, Lotes FEFO y Kardex"])


@router.post("/lotes", response_model=LoteRead, status_code=status.HTTP_201_CREATED)
def registrar_ingreso_lote(
    payload: LoteCreate, db: Session = Depends(get_db)
):
    """Registra compra de lote e inserta movimiento COMPRA en el Kardex inmutable."""
    return InventarioService(db).registrar_ingreso_lote(payload)


@router.get("/lotes/producto/{producto_id}", response_model=List[LoteRead])
def listar_lotes_fefo_producto(
    producto_id: int, db: Session = Depends(get_db)
):
    """Lista los lotes vigentes de un producto ordenados estrictamente por FEFO."""
    return InventarioService(db).listar_lotes_por_producto(producto_id)


@router.get("/alertas-vencimiento", response_model=List[LoteRead])
def obtener_alertas_vencimiento(
    dias: int = Query(default=60, ge=1, le=365),
    db: Session = Depends(get_db),
):
    """Devuelve lotes activos con stock > 0 próximos a vencer en los siguientes N días."""
    return InventarioService(db).obtener_alertas_vencimiento(dias_umbral=dias)


@router.post("/ajustes", response_model=LoteRead)
def registrar_merma_o_ajuste(
    payload: AjusteLoteCreate, db: Session = Depends(get_db)
):
    """Descuenta stock por MERMA_VENCIMIENTO o AJUSTE_INVENTARIO auditado en Kardex."""
    return InventarioService(db).registrar_merma_o_ajuste(payload)


@router.get("/kardex/lote/{lote_id}", response_model=List[KardexRead])
def consultar_kardex_lote(
    lote_id: int, db: Session = Depends(get_db)
):
    """Devuelve el historial inmutable de movimientos de un lote específico."""
    return InventarioService(db).obtener_kardex_por_lote(lote_id)
