from datetime import date, timedelta
from decimal import Decimal
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.exceptions import (
    PresentacionNoPermitidaError,
    StockInsuficienteError,
)
from app.models import Base, MetodoPago, TipoPresentacion
from app.schemas.lote import LoteCreate
from app.schemas.producto import ProductoCreate
from app.schemas.venta import ItemVentaInput, VentaCreate
from app.services.inventario_service import InventarioService
from app.services.pos_service import POSService


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


def test_venta_pos_fefo_particion_multilote_y_kardex(db_session):
    inv_service = InventarioService(db_session)
    pos_service = POSService(db_session)

    # 1. Crear Amoxicilina fraccionable (Caja x 100, Blíster x 10)
    amoxicilina = inv_service.crear_producto(
        ProductoCreate(
            codigo_barras="7751234560001",
            nombre="Amoxicilina 500mg",
            principio_activo="Amoxicilina",
            concentracion="500mg",
            laboratorio="Portugal",
            precio_venta_caja=Decimal("35.00"),
            precio_venta_blister=Decimal("4.00"),
            precio_venta_unitario=Decimal("0.50"),
            fraccionable=True,
            unidades_por_caja=100,
            unidades_por_blister=10,
            stock_minimo=20,
        )
    )

    hoy = date.today()
    # 2. Ingresar Lote A (vence en 15 días, solo quedan 4 pastillas)
    lote_a = inv_service.registrar_ingreso_lote(
        LoteCreate(
            producto_id=amoxicilina.id,
            numero_lote="LOT-PROXIMO-A",
            fecha_vencimiento=hoy + timedelta(days=15),
            stock_inicial=4,
            costo_compra_unitario=Decimal("0.20"),
        )
    )
    # 3. Ingresar Lote B (vence en 120 días, tiene 50 pastillas)
    lote_b = inv_service.registrar_ingreso_lote(
        LoteCreate(
            producto_id=amoxicilina.id,
            numero_lote="LOT-LEJANO-B",
            fecha_vencimiento=hoy + timedelta(days=120),
            stock_inicial=50,
            costo_compra_unitario=Decimal("0.22"),
        )
    )

    # 4. Escanear en POS: debe reportar 54 unidades y que el lote FEFO activo es LOT-PROXIMO-A
    info_pos = inv_service.obtener_por_codigo_barras_pos("7751234560001")
    assert info_pos.stock_total_vigente == 54
    assert info_pos.lote_fefo_numero == "LOT-PROXIMO-A"

    # 5. Vender 1 BLISTER (10 unidades). Debe agotar las 4 de Lote A y tomar 6 de Lote B
    venta = pos_service.procesar_venta_fefo(
        VentaCreate(
            metodo_pago=MetodoPago.EFECTIVO,
            items=[
                ItemVentaInput(
                    producto_id=amoxicilina.id,
                    tipo_presentacion=TipoPresentacion.BLISTER,
                    cantidad_presentacion=1,
                )
            ],
        ),
        fecha_operacion=hoy,
    )

    assert venta.total == Decimal("4.00")
    assert len(venta.detalles) == 2

    db_session.refresh(lote_a)
    db_session.refresh(lote_b)
    assert lote_a.stock_actual == 0
    assert lote_b.stock_actual == 44

    # Verificar Kardex inmutable de Lote A (1 COMPRA + 1 VENTA)
    kardex_a = inv_service.obtener_kardex_por_lote(lote_a.id)
    assert len(kardex_a) == 2
    assert kardex_a[0].stock_resultante == 0


def test_bloqueo_fraccionamiento_en_jarabe_no_fraccionable(db_session):
    inv_service = InventarioService(db_session)
    pos_service = POSService(db_session)

    jarabe = inv_service.crear_producto(
        ProductoCreate(
            codigo_barras="7759999990002",
            nombre="Ambroxol Jarabe 120ml",
            principio_activo="Ambroxol",
            precio_venta_caja=Decimal("12.50"),
            fraccionable=False,
            unidades_por_caja=1,
            stock_minimo=5,
        )
    )

    with pytest.raises(PresentacionNoPermitidaError):
        pos_service.procesar_venta_fefo(
            VentaCreate(
                metodo_pago=MetodoPago.EFECTIVO,
                items=[
                    ItemVentaInput(
                        producto_id=jarabe.id,
                        tipo_presentacion=TipoPresentacion.BLISTER,
                        cantidad_presentacion=1,
                    )
                ],
            )
        )


def test_rechazo_por_stock_insuficiente(db_session):
    inv_service = InventarioService(db_session)
    pos_service = POSService(db_session)

    ibuprofeno = inv_service.crear_producto(
        ProductoCreate(
            codigo_barras="7758888880003",
            nombre="Ibuprofeno 400mg",
            precio_venta_caja=Decimal("15.00"),
            fraccionable=False,
            unidades_por_caja=1,
        )
    )
    inv_service.registrar_ingreso_lote(
        LoteCreate(
            producto_id=ibuprofeno.id,
            numero_lote="LOT-IBU-1",
            fecha_vencimiento=date.today() + timedelta(days=60),
            stock_inicial=2,
            costo_compra_unitario=Decimal("8.00"),
        )
    )

    with pytest.raises(StockInsuficienteError):
        pos_service.procesar_venta_fefo(
            VentaCreate(
                metodo_pago=MetodoPago.TARJETA,
                items=[
                    ItemVentaInput(
                        producto_id=ibuprofeno.id,
                        tipo_presentacion=TipoPresentacion.CAJA,
                        cantidad_presentacion=5,
                    )
                ],
            )
        )
