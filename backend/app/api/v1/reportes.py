from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.reporte import ResumenEjecutivoResponse
from app.services.reporte_service import ReporteService

router = APIRouter(prefix="/reportes", tags=["Reportes Gerenciales y Exportación CSV"])


@router.get("/resumen-ejecutivo", response_model=ResumenEjecutivoResponse)
def obtener_resumen_ejecutivo(db: Session = Depends(get_db)):
    """
    Devuelve los indicadores gerenciales en tiempo real: ventas del día y del mes,
    ticket promedio, desglose por método de pago y valorización financiera del inventario FEFO.
    """
    return ReporteService(db).obtener_resumen_ejecutivo()


@router.get("/exportar/orden-compra-ml.csv")
def descargar_orden_compra_ml_csv(
    solo_criticos: bool = Query(default=False),
    db: Session = Depends(get_db),
):
    """
    Descarga en formato CSV (compatible con Microsoft Excel) la Orden de Compra sugerida
    por el motor de Machine Learning para enviar a las droguerías.
    """
    contenido_csv = ReporteService(db).generar_csv_orden_compra_ml(
        solo_criticos=solo_criticos
    )
    return Response(
        content=contenido_csv.encode("utf-8"),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": 'attachment; filename="orden_compra_sugerida_ml.csv"'
        },
    )


@router.get("/exportar/kardex.csv")
def descargar_kardex_auditoria_csv(
    limit: int = Query(default=500, ge=10, le=5000),
    db: Session = Depends(get_db),
):
    """
    Descarga en formato CSV el libro auditable de movimientos inmutables del Kardex.
    """
    contenido_csv = ReporteService(db).generar_csv_kardex_auditoria(limit=limit)
    return Response(
        content=contenido_csv.encode("utf-8"),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": 'attachment; filename="auditoria_kardex_fefo.csv"'
        },
    )
