import math
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import List, Tuple
import numpy as np
from sklearn.ensemble import HistGradientBoostingRegressor
from sqlalchemy.orm import Session

from app.ml.feature_builder import FeatureBuilder, SKUFeatureRow
from app.schemas.ml import (
    EstadoRotacionML,
    ReorderSuggestionsResponse,
    SugerenciaCompraSKU,
)

try:
    from lightgbm import LGBMRegressor
    HAS_LIGHTGBM = True
except ImportError:
    HAS_LIGHTGBM = False


class ReorderPredictorService:
    """
    Motor de Machine Learning para predicción de demanda a 15 días y generación
    de órdenes de compra sugeridas a droguerías (SOLID: SRP y OCP).
    """

    HORIZONTE_DIAS = 15

    def __init__(self, db: Session) -> None:
        self.db = db
        self.feature_builder = FeatureBuilder(db)

    def _construir_dataset_ventanas(
        self, filas: List[SKUFeatureRow]
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Genera ventanas deslizantes supervisadas a partir de la serie histórica de 90 días:
        X = [ventas_t_7, ventas_t_14, ventas_t_30, prom_7d, prom_30d, tendencia, unidades_caja]
        y = demanda real acumulada en los siguientes 15 días (t+1 ... t+15).
        """
        X_list: List[List[float]] = []
        y_list: List[float] = []

        for fila in filas:
            serie = fila.serie_diaria_90d
            if sum(serie) == 0:
                continue

            # Desde el día 30 hasta el día 75 tenemos 30 días de historia previa y 15 días de futuro
            for idx in range(30, len(serie) - self.HORIZONTE_DIAS):
                v7 = float(sum(serie[idx - 7 : idx]))
                v14 = float(sum(serie[idx - 14 : idx]))
                v30 = float(sum(serie[idx - 30 : idx]))
                p7 = v7 / 7.0
                p30 = v30 / 30.0
                tend = (p7 / p30) if p30 > 0 else 1.0
                target_15d = float(sum(serie[idx : idx + self.HORIZONTE_DIAS]))

                X_list.append(
                    [
                        v7,
                        v14,
                        v30,
                        p7,
                        p30,
                        tend,
                        float(fila.producto.unidades_por_caja),
                    ]
                )
                y_list.append(target_15d)

        if not X_list:
            return np.empty((0, 7)), np.empty((0,))

        return np.array(X_list, dtype=float), np.array(y_list, dtype=float)

    def generar_sugerencias_reorden(
        self, solo_criticos: bool = False, fecha_referencia: date | None = None
    ) -> ReorderSuggestionsResponse:
        filas = self.feature_builder.construir_features_catalogo(
            fecha_referencia=fecha_referencia
        )

        X_train, y_train = self._construir_dataset_ventanas(filas)
        modelo = None
        nombre_modelo = "Heurística Ponderada Cold-Start (Media Móvil + Estacionalidad)"

        if len(X_train) >= 15:
            if HAS_LIGHTGBM:
                modelo = LGBMRegressor(
                    n_estimators=60,
                    learning_rate=0.08,
                    max_depth=4,
                    num_leaves=15,
                    min_child_samples=5,
                    random_state=42,
                    verbose=-1,
                )
                nombre_modelo = "LightGBM Regressor (Lags t-7, t-14, t-30 + Estacionalidad)"
            else:
                modelo = HistGradientBoostingRegressor(
                    max_iter=60,
                    learning_rate=0.08,
                    max_depth=4,
                    min_samples_leaf=5,
                    random_state=42,
                )
                nombre_modelo = "Scikit-Learn HistGradientBoosting (Lags t-7, t-14, t-30)"
            modelo.fit(X_train, y_train)

        sugerencias: List[SugerenciaCompraSKU] = []

        for fila in filas:
            x_actual = np.array(
                [
                    [
                        float(fila.ventas_7d),
                        float(fila.ventas_14d),
                        float(fila.ventas_30d),
                        fila.promedio_diario_7d,
                        fila.promedio_diario_30d,
                        fila.tendencia_reciente,
                        float(fila.producto.unidades_por_caja),
                    ]
                ],
                dtype=float,
            )

            if modelo is not None and fila.ventas_30d > 0:
                pred_raw = float(modelo.predict(x_actual)[0])
            else:
                # Estimación híbrida ponderando más los últimos 7 días (60%) y 30 días (40%)
                tasa_diaria = (0.6 * fila.promedio_diario_7d) + (
                    0.4 * fila.promedio_diario_30d
                )
                pred_raw = tasa_diaria * self.HORIZONTE_DIAS

            demanda_15d = max(int(round(pred_raw)), 0)
            tasa_diaria_pred = demanda_15d / float(self.HORIZONTE_DIAS)

            if tasa_diaria_pred > 0:
                dias_cobertura = round(
                    fila.stock_actual_unidades / tasa_diaria_pred, 1
                )
            else:
                dias_cobertura = 999.0 if fila.stock_actual_unidades > 0 else 0.0

            # Stock objetivo = Demanda predicha a 15 días + Stock mínimo de seguridad
            stock_objetivo = max(
                demanda_15d + int(fila.producto.stock_minimo * 0.5),
                fila.producto.stock_minimo,
            )

            # Evaluar riesgo de vencimiento FEFO vs quiebre de stock
            if (
                fila.dias_para_vencimiento_fefo is not None
                and fila.dias_para_vencimiento_fefo <= 30
                and fila.stock_actual_unidades > demanda_15d
            ):
                estado = EstadoRotacionML.RIESGO_VENCIMIENTO
                deficit_unidades = 0
            elif (
                fila.stock_actual_unidades <= fila.producto.stock_minimo
                or dias_cobertura <= 5.0
            ):
                estado = EstadoRotacionML.CRITICO
                deficit_unidades = max(stock_objetivo - fila.stock_actual_unidades, 0)
            elif fila.stock_actual_unidades < stock_objetivo or dias_cobertura < 15.0:
                estado = EstadoRotacionML.ALERTA_REORDEN
                deficit_unidades = max(stock_objetivo - fila.stock_actual_unidades, 0)
            else:
                estado = EstadoRotacionML.OPTIMO
                deficit_unidades = 0

            if deficit_unidades > 0:
                cajas_a_pedir = math.ceil(
                    deficit_unidades / max(fila.producto.unidades_por_caja, 1)
                )
                unidades_a_pedir = cajas_a_pedir * fila.producto.unidades_por_caja
            else:
                cajas_a_pedir = 0
                unidades_a_pedir = 0

            inversion = (
                Decimal(unidades_a_pedir) * fila.costo_unitario_referencia
            ).quantize(Decimal("0.01"))

            sugerencia = SugerenciaCompraSKU(
                producto_id=fila.producto.id,
                codigo_barras=fila.producto.codigo_barras,
                nombre=fila.producto.nombre,
                laboratorio=fila.producto.laboratorio,
                unidades_por_caja=fila.producto.unidades_por_caja,
                stock_actual_unidades=fila.stock_actual_unidades,
                stock_minimo_unidades=fila.producto.stock_minimo,
                ventas_ultimos_7d=fila.ventas_7d,
                ventas_ultimos_14d=fila.ventas_14d,
                ventas_ultimos_30d=fila.ventas_30d,
                dias_para_vencimiento_fefo=fila.dias_para_vencimiento_fefo,
                proximo_vencimiento_fefo=fila.proximo_vencimiento_fefo,
                demanda_predicha_15d=demanda_15d,
                dias_cobertura_actual=dias_cobertura,
                estado_rotacion=estado,
                cantidad_unidades_sugerida=unidades_a_pedir,
                cajas_sugeridas_compra=cajas_a_pedir,
                inversion_estimada=inversion,
            )
            sugerencias.append(sugerencia)

        # Priorizar: 1° CRITICO, 2° ALERTA_REORDEN, 3° RIESGO_VENCIMIENTO, 4° OPTIMO
        orden_prioridad = {
            EstadoRotacionML.CRITICO: 0,
            EstadoRotacionML.ALERTA_REORDEN: 1,
            EstadoRotacionML.RIESGO_VENCIMIENTO: 2,
            EstadoRotacionML.OPTIMO: 3,
        }
        sugerencias.sort(
            key=lambda s: (
                orden_prioridad[s.estado_rotacion],
                s.dias_cobertura_actual,
                -s.demanda_predicha_15d,
            )
        )

        if solo_criticos:
            sugerencias = [
                s
                for s in sugerencias
                if s.estado_rotacion
                in (
                    EstadoRotacionML.CRITICO,
                    EstadoRotacionML.ALERTA_REORDEN,
                    EstadoRotacionML.RIESGO_VENCIMIENTO,
                )
            ]

        total_criticos = sum(
            1
            for s in sugerencias
            if s.estado_rotacion
            in (EstadoRotacionML.CRITICO, EstadoRotacionML.ALERTA_REORDEN)
        )
        inversion_total = sum(
            (s.inversion_estimada for s in sugerencias), Decimal("0.00")
        )

        return ReorderSuggestionsResponse(
            fecha_generacion=datetime.now(timezone.utc),
            horizonte_dias=self.HORIZONTE_DIAS,
            modelo_utilizado=nombre_modelo,
            total_skus_analizados=len(filas),
            total_skus_criticos=total_criticos,
            inversion_total_sugerida=inversion_total,
            sugerencias=sugerencias,
        )
