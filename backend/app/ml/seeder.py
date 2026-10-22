import random
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from typing import Dict, List, Tuple
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.enums import MetodoPago, TipoMovimientoKardex, TipoPresentacion
from app.models.kardex import Kardex
from app.models.lote import Lote
from app.models.producto import Producto
from app.models.venta import DetalleVenta, Venta
from app.schemas.ml import SeedColdStartResponse


CATALOGO_SEMILLA: List[Dict] = [
    {
        "codigo_barras": "7750100000011",
        "nombre": "Paracetamol 500mg Caja x 100 tab",
        "principio_activo": "Paracetamol",
        "concentracion": "500mg",
        "laboratorio": "Portugal",
        "precio_venta_caja": Decimal("18.00"),
        "precio_venta_blister": Decimal("2.00"),
        "precio_venta_unitario": Decimal("0.25"),
        "fraccionable": True,
        "unidades_por_caja": 100,
        "unidades_por_blister": 10,
        "stock_minimo": 120,
        "demanda_base_diaria": 28,
        "stock_actual_lote_a": 25,
        "stock_actual_lote_b": 40,  # Total 65 -> CRITICO (alta rotación)
        "dias_vencimiento_lote": 45,
        "costo_unitario": Decimal("0.09"),
    },
    {
        "codigo_barras": "7750100000028",
        "nombre": "Amoxicilina 500mg Caja x 100 cap",
        "principio_activo": "Amoxicilina",
        "concentracion": "500mg",
        "laboratorio": "Genfar",
        "precio_venta_caja": Decimal("35.00"),
        "precio_venta_blister": Decimal("4.00"),
        "precio_venta_unitario": Decimal("0.50"),
        "fraccionable": True,
        "unidades_por_caja": 100,
        "unidades_por_blister": 10,
        "stock_minimo": 100,
        "demanda_base_diaria": 22,
        "stock_actual_lote_a": 30,
        "stock_actual_lote_b": 50,  # Total 80 -> CRITICO
        "dias_vencimiento_lote": 90,
        "costo_unitario": Decimal("0.21"),
    },
    {
        "codigo_barras": "7750100000035",
        "nombre": "Ibuprofeno 400mg Caja x 100 tab",
        "principio_activo": "Ibuprofeno",
        "concentracion": "400mg",
        "laboratorio": "Farmindustria",
        "precio_venta_caja": Decimal("22.00"),
        "precio_venta_blister": Decimal("2.50"),
        "precio_venta_unitario": Decimal("0.30"),
        "fraccionable": True,
        "unidades_por_caja": 100,
        "unidades_por_blister": 10,
        "stock_minimo": 80,
        "demanda_base_diaria": 18,
        "stock_actual_lote_a": 90,
        "stock_actual_lote_b": 100,  # Total 190 -> ALERTA_REORDEN
        "dias_vencimiento_lote": 180,
        "costo_unitario": Decimal("0.12"),
    },
    {
        "codigo_barras": "7750100000042",
        "nombre": "Panadol Antigripal NF Caja x 100 tab",
        "principio_activo": "Paracetamol + Fenilefrina + Clorfenamina",
        "concentracion": "500mg/5mg/2mg",
        "laboratorio": "GSK",
        "precio_venta_caja": Decimal("85.00"),
        "precio_venta_blister": Decimal("9.00"),
        "precio_venta_unitario": Decimal("1.00"),
        "fraccionable": True,
        "unidades_por_caja": 100,
        "unidades_por_blister": 10,
        "stock_minimo": 60,
        "demanda_base_diaria": 16,
        "stock_actual_lote_a": 40,
        "stock_actual_lote_b": 0,  # Total 40 -> CRITICO
        "dias_vencimiento_lote": 210,
        "costo_unitario": Decimal("0.55"),
    },
    {
        "codigo_barras": "7750100000059",
        "nombre": "Omeprazol 20mg Caja x 100 cap",
        "principio_activo": "Omeprazol",
        "concentracion": "20mg",
        "laboratorio": "IQFarma",
        "precio_venta_caja": Decimal("28.00"),
        "precio_venta_blister": Decimal("3.00"),
        "precio_venta_unitario": Decimal("0.35"),
        "fraccionable": True,
        "unidades_por_caja": 100,
        "unidades_por_blister": 10,
        "stock_minimo": 70,
        "demanda_base_diaria": 14,
        "stock_actual_lote_a": 150,
        "stock_actual_lote_b": 0,  # Total 150 -> ALERTA_REORDEN
        "dias_vencimiento_lote": 300,
        "costo_unitario": Decimal("0.15"),
    },
    {
        "codigo_barras": "7750100000066",
        "nombre": "Loratadina 10mg Caja x 100 tab",
        "principio_activo": "Loratadina",
        "concentracion": "10mg",
        "laboratorio": "Medrock",
        "precio_venta_caja": Decimal("20.00"),
        "precio_venta_blister": Decimal("2.50"),
        "precio_venta_unitario": Decimal("0.30"),
        "fraccionable": True,
        "unidades_por_caja": 100,
        "unidades_por_blister": 10,
        "stock_minimo": 50,
        "demanda_base_diaria": 3,
        "stock_actual_lote_a": 180,
        "stock_actual_lote_b": 0,  # RIESGO_VENCIMIENTO (vence en 20 días y rota lento)
        "dias_vencimiento_lote": 20,
        "costo_unitario": Decimal("0.10"),
    },
    {
        "codigo_barras": "7750100000073",
        "nombre": "Losartán Potásico 50mg Caja x 100 tab",
        "principio_activo": "Losartán",
        "concentracion": "50mg",
        "laboratorio": "AC Farma",
        "precio_venta_caja": Decimal("32.00"),
        "precio_venta_blister": Decimal("3.50"),
        "precio_venta_unitario": Decimal("0.40"),
        "fraccionable": True,
        "unidades_por_caja": 100,
        "unidades_por_blister": 10,
        "stock_minimo": 90,
        "demanda_base_diaria": 10,
        "stock_actual_lote_a": 220,
        "stock_actual_lote_b": 200,  # Total 420 -> OPTIMO
        "dias_vencimiento_lote": 365,
        "costo_unitario": Decimal("0.18"),
    },
    {
        "codigo_barras": "7750100000080",
        "nombre": "Ambroxol Jarabe Pediátrico 15mg/5ml Fco 120ml",
        "principio_activo": "Ambroxol",
        "concentracion": "15mg/5ml",
        "laboratorio": "Hersil",
        "precio_venta_caja": Decimal("14.50"),
        "precio_venta_blister": None,
        "precio_venta_unitario": None,
        "fraccionable": False,
        "unidades_por_caja": 1,
        "unidades_por_blister": None,
        "stock_minimo": 8,
        "demanda_base_diaria": 2,
        "stock_actual_lote_a": 4,
        "stock_actual_lote_b": 0,  # Total 4 -> CRITICO (no fraccionable)
        "dias_vencimiento_lote": 190,
        "costo_unitario": Decimal("8.20"),
    },
]


class ColdStartSeeder:
    """
    Generador de datos sintéticos para resolver el problema de Arranque en Frío (Cold Start).
    Inyecta medicamentos reales, lotes FEFO y hasta 12 meses de ventas simuladas con estacionalidad.
    """

    def __init__(self, db: Session) -> None:
        self.db = db

    def ejecutar_seed(self, meses_historia: int = 12) -> SeedColdStartResponse:
        existentes = int(
            self.db.scalar(select(func.count()).select_from(Producto)) or 0
        )
        if existentes > 0:
            total_lotes = int(
                self.db.scalar(select(func.count()).select_from(Lote)) or 0
            )
            total_ventas = int(
                self.db.scalar(select(func.count()).select_from(Venta)) or 0
            )
            return SeedColdStartResponse(
                mensaje="El catálogo ya cuenta con datos cargados.",
                productos_creados=existentes,
                lotes_creados=total_lotes,
                ventas_simuladas=total_ventas,
                meses_historia=meses_historia,
            )

        rng = random.Random(42)
        hoy = date.today()
        dias_totales = meses_historia * 30

        productos_creados = 0
        lotes_creados = 0
        ventas_creadas = 0

        for idx, cfg in enumerate(CATALOGO_SEMILLA, start=1):
            prod = Producto(
                codigo_barras=cfg["codigo_barras"],
                nombre=cfg["nombre"],
                principio_activo=cfg["principio_activo"],
                concentracion=cfg["concentracion"],
                laboratorio=cfg["laboratorio"],
                precio_venta_caja=cfg["precio_venta_caja"],
                precio_venta_blister=cfg["precio_venta_blister"],
                precio_venta_unitario=cfg["precio_venta_unitario"],
                fraccionable=cfg["fraccionable"],
                unidades_por_caja=cfg["unidades_por_caja"],
                unidades_por_blister=cfg["unidades_por_blister"],
                stock_minimo=cfg["stock_minimo"],
                activo=True,
            )
            self.db.add(prod)
            self.db.flush()
            productos_creados += 1

            demanda_base = cfg["demanda_base_diaria"]
            historial_diario: List[Tuple[date, int]] = []
            unidades_vendidas_totales = 0

            for d_offset in range(dias_totales, 0, -1):
                dia_sim = hoy - timedelta(days=d_offset)
                factor_mes = (
                    1.25
                    if dia_sim.month in (5, 6, 7, 8)
                    else (0.90 if dia_sim.month in (1, 2) else 1.0)
                )
                factor_dia = 1.15 if dia_sim.weekday() in (0, 5) else 0.95
                ruido = rng.uniform(0.75, 1.25)

                cant_dia = max(
                    int(round(demanda_base * factor_mes * factor_dia * ruido)), 0
                )
                if cant_dia > 0:
                    historial_diario.append((dia_sim, cant_dia))
                    unidades_vendidas_totales += cant_dia

            stock_lote_a = cfg["stock_actual_lote_a"]
            stock_inicial_lote_a = unidades_vendidas_totales + stock_lote_a

            lote_principal = Lote(
                producto_id=prod.id,
                numero_lote=f"LOT-2026-0{idx}A",
                fecha_vencimiento=hoy + timedelta(days=cfg["dias_vencimiento_lote"]),
                stock_inicial=stock_inicial_lote_a,
                stock_actual=stock_lote_a,
                costo_compra_unitario=cfg["costo_unitario"],
                activo=True,
            )
            self.db.add(lote_principal)
            self.db.flush()
            lotes_creados += 1

            self.db.add(
                Kardex(
                    lote_id=lote_principal.id,
                    tipo_movimiento=TipoMovimientoKardex.COMPRA,
                    cantidad=stock_inicial_lote_a,
                    stock_resultante=stock_inicial_lote_a,
                    fecha_hora=datetime.combine(
                        hoy - timedelta(days=dias_totales),
                        time(8, 0),
                        tzinfo=timezone.utc,
                    ),
                    glosa=f"Stock inicial de arranque Cold-Start ({meses_historia}m)",
                )
            )

            stock_lote_b = cfg["stock_actual_lote_b"]
            if stock_lote_b > 0:
                lote_respaldo = Lote(
                    producto_id=prod.id,
                    numero_lote=f"LOT-2027-0{idx}B",
                    fecha_vencimiento=hoy
                    + timedelta(days=cfg["dias_vencimiento_lote"] + 180),
                    stock_inicial=stock_lote_b,
                    stock_actual=stock_lote_b,
                    costo_compra_unitario=cfg["costo_unitario"],
                    activo=True,
                )
                self.db.add(lote_respaldo)
                self.db.flush()
                lotes_creados += 1
                self.db.add(
                    Kardex(
                        lote_id=lote_respaldo.id,
                        tipo_movimiento=TipoMovimientoKardex.COMPRA,
                        cantidad=stock_lote_b,
                        stock_resultante=stock_lote_b,
                        fecha_hora=datetime.combine(
                            hoy - timedelta(days=15),
                            time(9, 0),
                            tzinfo=timezone.utc,
                        ),
                        glosa="Ingreso de lote de respaldo FEFO",
                    )
                )

            precio_unit_min = (
                prod.precio_venta_unitario
                if prod.precio_venta_unitario
                else prod.precio_venta_caja
            )
            metodos = [
                MetodoPago.EFECTIVO,
                MetodoPago.BILLETERA_DIGITAL,
                MetodoPago.TARJETA,
            ]

            for dia_sim, unidades_dia in historial_diario:
                subtotal = (Decimal(unidades_dia) * precio_unit_min).quantize(
                    Decimal("0.01")
                )
                fecha_venta = datetime.combine(
                    dia_sim,
                    time(rng.randint(9, 20), rng.randint(0, 59)),
                    tzinfo=timezone.utc,
                )
                venta = Venta(
                    fecha_hora=fecha_venta,
                    total=subtotal,
                    metodo_pago=rng.choice(metodos),
                    anulada=False,
                )
                self.db.add(venta)
                self.db.flush()

                detalle = DetalleVenta(
                    venta_id=venta.id,
                    lote_id=lote_principal.id,
                    producto_id=prod.id,
                    tipo_presentacion=(
                        TipoPresentacion.UNIDAD
                        if prod.fraccionable
                        else TipoPresentacion.CAJA
                    ),
                    cantidad_presentacion=unidades_dia,
                    cantidad_unidades=unidades_dia,
                    precio_unitario=precio_unit_min,
                    subtotal=subtotal,
                )
                self.db.add(detalle)
                ventas_creadas += 1

        self.db.commit()
        return SeedColdStartResponse(
            mensaje=f"Datos sintéticos generados exitosamente ({meses_historia} meses de historial).",
            productos_creados=productos_creados,
            lotes_creados=lotes_creados,
            ventas_simuladas=ventas_creadas,
            meses_historia=meses_historia,
        )
