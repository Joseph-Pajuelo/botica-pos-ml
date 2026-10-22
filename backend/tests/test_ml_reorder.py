import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.ml.predictor import ReorderPredictorService
from app.ml.seeder import ColdStartSeeder
from app.models import Base
from app.schemas.ml import EstadoRotacionML


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


def test_cold_start_seeder_y_prediccion_reorden_ml(db_session):
    seeder = ColdStartSeeder(db_session)
    res_seed = seeder.ejecutar_seed(meses_historia=3)
    assert res_seed.productos_creados == 8
    assert res_seed.ventas_simuladas > 100

    predictor = ReorderPredictorService(db_session)
    sugerencias_resp = predictor.generar_sugerencias_reorden()

    assert sugerencias_resp.total_skus_analizados == 8
    assert sugerencias_resp.total_skus_criticos >= 3
    assert sugerencias_resp.inversion_total_sugerida > 0

    estados = {s.nombre: s.estado_rotacion for s in sugerencias_resp.sugerencias}
    assert estados["Paracetamol 500mg Caja x 100 tab"] == EstadoRotacionML.CRITICO
    assert estados["Loratadina 10mg Caja x 100 tab"] == EstadoRotacionML.RIESGO_VENCIMIENTO
