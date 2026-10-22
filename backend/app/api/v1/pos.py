from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.venta import VentaCreate, VentaRead
from app.services.pos_service import POSService

router = APIRouter(prefix="/pos", tags=["Punto de Venta (POS) FEFO"])


@router.post("/ventas", response_model=VentaRead, status_code=status.HTTP_201_CREATED)
def registrar_venta_pos(
    payload: VentaCreate, db: Session = Depends(get_db)
):
    """
    Procesa una venta en mostrador aplicando:
    1. Conversión de presentación (Caja, Blíster, Unidad) a unidades mínimas.
    2. Descuento automático FEFO (incluyendo partición multi-lote si el primero se agota).
    3. Registro inmutable de salida en el Kardex.
    """
    return POSService(db).procesar_venta_fefo(payload)


@router.get("/ventas", response_model=List[VentaRead])
def listar_ventas(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    return POSService(db).listar_ventas(skip=skip, limit=limit)


@router.get("/ventas/{venta_id}", response_model=VentaRead)
def obtener_detalle_venta(
    venta_id: int, db: Session = Depends(get_db)
):
    venta = POSService(db).obtener_venta(venta_id)
    if not venta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Venta #{venta_id} no encontrada.",
        )
    return venta
