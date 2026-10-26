from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.producto import (
    ProductoCreate,
    ProductoPOSRead,
    ProductoRead,
    ProductoUpdate,
)
from app.services.inventario_service import InventarioService

router = APIRouter(prefix="/productos", tags=["Productos, Sustitutos y Lector HID"])


@router.post("", response_model=ProductoRead, status_code=status.HTTP_201_CREATED)
def crear_producto(
    payload: ProductoCreate, db: Session = Depends(get_db)
):
    return InventarioService(db).crear_producto(payload)


@router.get("", response_model=List[ProductoRead])
def listar_productos(
    buscar: Optional[str] = Query(
        default=None,
        description="Buscar por nombre, principio activo o código de barras",
    ),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    return InventarioService(db).listar_productos(
        buscar=buscar, skip=skip, limit=limit
    )


@router.get("/barcode/{codigo_barras}", response_model=ProductoPOSRead)
def escanear_codigo_barras(
    codigo_barras: str, db: Session = Depends(get_db)
):
    """
    Endpoint de respuesta rápida (< 100ms) para el lector de código de barras USB (HID).
    Devuelve el medicamento junto con su stock vigente FEFO y lote próximo a vencer.
    """
    return InventarioService(db).obtener_por_codigo_barras_pos(codigo_barras)


@router.get("/{producto_id}/sustitutos", response_model=List[ProductoPOSRead])
def buscar_sustitutos_bioequivalentes(
    producto_id: int, db: Session = Depends(get_db)
):
    """
    Sugiere medicamentos alternativos con el mismo principio activo que cuenten
    con stock FEFO disponible (> 0), ordenados por menor precio.
    """
    return InventarioService(db).buscar_sustitutos_bioequivalentes(producto_id)


@router.patch("/{producto_id}", response_model=ProductoRead)
def actualizar_producto(
    producto_id: int,
    payload: ProductoUpdate,
    db: Session = Depends(get_db),
):
    return InventarioService(db).actualizar_producto(producto_id, payload)
