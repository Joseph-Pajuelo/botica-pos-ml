from datetime import date, timedelta
from decimal import Decimal
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models import (
    Base,
    Kardex,
    Lote,
    Producto,
    TipoMovimientoKardex,
)
from app.repositories.lote_repo import LoteRepository
from app.repositories.producto_repo import ProductoRepository


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


def test_fefo_lote_ordering_and_kardex(db_session):
    prod_repo = ProductoRepository(db_session)
    lote_repo = LoteRepository(db_session)

    paracetamol = Producto(
        codigo_barras="7750000000012",
        nombre="Paracetamol 500mg Caja x 100",
        principio_activo="Paracetamol",
        concentracion="500mg",
        laboratorio="Genfar",
        precio_venta_caja=Decimal("20.00"),
        precio_venta_blister=Decimal("2.50"),
        precio_venta_unitario=Decimal("0.30"),
        fraccionable=True,
        unidades_por_caja=100,
        unidades_por_blister=10,
        stock_minimo=20,
    )
    prod_repo.add(paracetamol)

    hoy = date.today()
    # Lote que vence más lejos (en 180 días)
    lote_lejano = Lote(
        producto_id=paracetamol.id,
        numero_lote="LOT-2027-B",
        fecha_vencimiento=hoy + timedelta(days=180),
        stock_inicial=100,
        stock_actual=100,
        costo_compra_unitario=Decimal("0.10"),
    )
    # Lote que vence más pronto (en 30 días) -> Debe salir primero en FEFO
    lote_proximo = Lote(
        producto_id=paracetamol.id,
        numero_lote="LOT-2026-A",
        fecha_vencimiento=hoy + timedelta(days=30),
        stock_inicial=50,
        stock_actual=50,
        costo_compra_unitario=Decimal("0.10"),
    )
    lote_repo.add(lote_lejano)
    lote_repo.add(lote_proximo)

    mov = Kardex(
        lote_id=lote_proximo.id,
        tipo_movimiento=TipoMovimientoKardex.COMPRA,
        cantidad=50,
        stock_resultante=50,
        glosa="Ingreso inicial de lote próximo",
    )
    db_session.add(mov)
    db_session.commit()

    lotes_fefo = lote_repo.obtener_lotes_disponibles_fefo(
        producto_id=paracetamol.id, fecha_referencia=hoy
    )
    assert len(lotes_fefo) == 2
    assert lotes_fefo[0].numero_lote == "LOT-2026-A"
    assert lotes_fefo[1].numero_lote == "LOT-2027-B"
    assert lote_repo.obtener_stock_total_vigente(paracetamol.id, hoy) == 150
