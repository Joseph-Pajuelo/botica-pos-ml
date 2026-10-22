from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.ml.predictor import ReorderPredictorService
from app.ml.seeder import ColdStartSeeder
from app.schemas.ml import ReorderSuggestionsResponse, SeedColdStartResponse

router = APIRouter(prefix="/ml", tags=["Machine Learning y Sugerencias de Compra"])


@router.get("/reorder-suggestions", response_model=ReorderSuggestionsResponse)
def obtener_sugerencias_reorden(
    solo_criticos: bool = Query(
        default=False,
        description="Si es True, filtra únicamente SKUs en estado CRITICO, ALERTA_REORDEN o RIESGO_VENCIMIENTO",
    ),
    db: Session = Depends(get_db),
):
    """
    Ejecuta el motor de Machine Learning (LightGBM / Scikit-learn) con lags t-7, t-14, t-30
    y devuelve la lista priorizada de SKUs a pedir a droguerías para los próximos 15 días.
    """
    return ReorderPredictorService(db).generar_sugerencias_reorden(
        solo_criticos=solo_criticos
    )


@router.post("/seed-cold-start", response_model=SeedColdStartResponse)
def inyectar_datos_sinteticos_cold_start(
    meses_historia: int = Query(default=12, ge=3, le=12),
    db: Session = Depends(get_db),
):
    """
    Inyecta el catálogo semilla y hasta 12 meses de ventas simuladas (Cold Start)
    para calibrar y demostrar el modelo de Machine Learning inmediatamente.
    """
    return ColdStartSeeder(db).ejecutar_seed(meses_historia=meses_historia)
