from datetime import date, timedelta
from decimal import Decimal
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models import Base, MetodoPago, TipoPresentacion
from app.schemas.lote import LoteCreate
from app.schemas.producto import ProductoCreate
from app.schemas.usuario import LoginRequest
from app.schemas.venta import ItemVentaInput, VentaCreate
from app.services.auth_service import AuthService
from app.services.inventario_service import InventarioService
from app.services.pos_service import POSService
from app.services.reporte_service import ReporteService


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


def test_login_jwt_y_verificacion_token(db_session):
    auth = AuthService(db_session)
    token_resp = auth.autenticar(
        LoginRequest(username="admin", password="admin123")
    )
    assert token_resp.access_token
    assert token_resp.usuario.username == "admin"
    assert token_resp.usuario.rol.value == "ADMIN"

    usuario_verificado = auth.obtener_usuario_desde_token(
        token_resp.access_token
    )
    assert usuario_verificado.id == token_resp.usuario.id


def test_sustitutos_bioequivalentes_y_anulacion_venta(db_session):
    inv = InventarioService(db_session)
    pos = POSService(db_session)
    rep = ReporteService(db_session)

    # Producto A (sin stock) y Producto B (genérico con mismo principio activo y con stock)
    panadol = inv.crear_producto(
        ProductoCreate(
            codigo_barras="7750000999001",
            nombre="Panadol Forte 500mg",
            principio_activo="Paracetamol",
            precio_venta_caja=Decimal("25.00"),
            fraccionable=False,
            unidades_por_caja=1,
        )
    )
    paracetamol_gen = inv.crear_producto(
        ProductoCreate(
            codigo_barras="7750000999002",
            nombre="Paracetamol Genérico 500mg",
            principio_activo="Paracetamol",
            precio_venta_caja=Decimal("10.00"),
            fraccionable=False,
            unidades_por_caja=1,
        )
    )
    lote_gen = inv.registrar_ingreso_lote(
        LoteCreate(
            producto_id=paracetamol_gen.id,
            numero_lote="LOT-GEN-01",
            fecha_vencimiento=date.today() + timedelta(days=90),
            stock_inicial=10,
            costo_compra_unitario=Decimal("5.00"),
        )
    )

    # 1. Buscar sustitutos de Panadol (debe sugerir Paracetamol Genérico con 10 en stock)
    sustitutos = inv.buscar_sustitutos_bioequivalentes(panadol.id)
    assert len(sustitutos) == 1
    assert sustitutos[0].id == paracetamol_gen.id
    assert sustitutos[0].stock_total_vigente == 10

    # 2. Vender 3 cajas de Paracetamol Genérico (quedan 7)
    venta = pos.procesar_venta_fefo(
        VentaCreate(
            metodo_pago=MetodoPago.EFECTIVO,
            items=[
                ItemVentaInput(
                    producto_id=paracetamol_gen.id,
                    tipo_presentacion=TipoPresentacion.CAJA,
                    cantidad_presentacion=3,
                )
            ],
        )
    )
    db_session.refresh(lote_gen)
    assert lote_gen.stock_actual == 7

    # 3. Anular la venta -> el stock del lote debe regresar a 10 y escribir asiento en Kardex
    venta_anulada = pos.anular_venta_y_revertir_kardex(
        venta.id, motivo="Cliente solicitó cambio de comprobante"
    )
    assert venta_anulada.anulada is True
    db_session.refresh(lote_gen)
    assert lote_gen.stock_actual == 10

    kardex = inv.obtener_kardex_por_lote(lote_gen.id)
    assert len(kardex) == 3  # COMPRA (+10), VENTA (-3), AJUSTE_INVENTARIO (+3)

    # 4. Probar reportes ejecutivos y exportación CSV
    resumen = rep.obtener_resumen_ejecutivo()
    assert resumen.total_productos_activos == 2
    assert resumen.valor_inventario_costo == Decimal("50.00")

    csv_kardex = rep.generar_csv_kardex_auditoria()
    assert "LOT-GEN-01" in csv_kardex
