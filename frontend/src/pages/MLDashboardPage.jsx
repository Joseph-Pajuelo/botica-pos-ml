import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  DatabaseZap,
  RefreshCw,
  ShoppingBag,
  Activity,
  Calendar,
  Filter,
} from 'lucide-react'
import { mlApi, getErrorMessage } from '../services/api'
import { StatusBadge } from '../components'

const ESTADO_BADGE_MAP = {
  CRITICO: {
    variant: 'danger',
    label: 'QUIEBRE CRÍTICO',
  },
  ALERTA_REORDEN: {
    variant: 'lavender',
    label: 'SUGERENCIA ML REORDEN',
  },
  RIESGO_VENCIMIENTO: {
    variant: 'tangerine',
    label: 'SOBRESTOCK / RIESGO VENC.',
  },
  OPTIMO: {
    variant: 'mint',
    label: 'STOCK ÓPTIMO',
  },
}

export function MLDashboardPage() {
  const navigate = useNavigate()
  const [reporte, setReporte] = useState(null)
  const [soloCriticos, setSoloCriticos] = useState(false)
  const [loading, setLoading] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [error, setError] = useState(null)
  const [seedInfo, setSeedInfo] = useState(null)

  const ejecutarPrediccionML = useCallback(async (filtrarCriticos = soloCriticos) => {
    setLoading(true)
    setError(null)
    try {
      const data = await mlApi.obtenerSugerenciasReorden(filtrarCriticos)
      setReporte(data)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [soloCriticos])

  useEffect(() => {
    ejecutarPrediccionML(soloCriticos)
  }, [ejecutarPrediccionML, soloCriticos])

  const handleSeedColdStart = async () => {
    setSeeding(true)
    setError(null)
    setSeedInfo(null)
    try {
      const res = await mlApi.seedColdStart(12)
      setSeedInfo(
        `${res.mensaje} (${res.productos_creados} SKUs, ${res.lotes_creados} lotes FEFO, ${res.ventas_simuladas} ventas históricas).`
      )
      await ejecutarPrediccionML(soloCriticos)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSeeding(false)
    }
  }

  const irAAbastecerSKU = (sug) => {
    const unidades = Math.max(sug.cantidad_unidades_sugerida || 100, sug.unidades_por_caja || 100)
    navigate(`/lotes-kardex?producto_id=${sug.producto_id}&unidades=${unidades}`)
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[12px] border border-ash bg-canvas-white px-5 py-4 shadow-xs">
        <div>
          <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-[#c4b5fd] bg-[#ede9fe] px-3 py-0.5 text-[12px] font-semibold text-[#6d28d9]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Motor Predictivo LightGBM / Scikit-learn</span>
          </div>
          <h1 className="font-satoshi text-[30px] font-bold leading-[1.15] text-midnight-ink">
            Predicción de Demanda y Órdenes de Compra ML
          </h1>
          <p className="mt-1 text-[14px] text-slate">
            Clasificación inteligente de rotación con lags temporales ($t-7, t-14, t-30$), cobertura de stock y prevención de vencimientos FEFO.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSeedColdStart}
            disabled={seeding}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-[8px] border border-[#c4b5fd] bg-[#f5f3ff] px-3.5 py-2 text-[14px] font-semibold text-[#6d28d9] transition hover:bg-[#ede9fe] disabled:opacity-50"
          >
            <DatabaseZap className="h-4 w-4 text-[#7c3aed]" />
            <span>
              {seeding ? 'Simulando 12m...' : 'Calibrar Cold-Start (12m)'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => ejecutarPrediccionML(soloCriticos)}
            disabled={loading}
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-[8px] bg-electric-blue px-4 py-2 text-[14px] font-semibold text-canvas-white shadow-xs hover:bg-deep-sapphire disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Recalcular Modelo ML</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-[12px] border border-[#fca5a5] bg-[#fee2e2] px-4 py-3 text-[14px] font-medium text-[#b91c1c]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="font-geist-mono text-[12px] font-semibold underline"
          >
            Cerrar
          </button>
        </div>
      )}

      {seedInfo && (
        <div className="flex items-center justify-between rounded-[12px] border border-[#86efac] bg-[#dcfce7] px-4 py-3 text-[14px] font-medium text-[#15803d]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{seedInfo}</span>
          </div>
          <button
            type="button"
            onClick={() => setSeedInfo(null)}
            className="font-geist-mono text-[12px] font-semibold underline"
          >
            OK
          </button>
        </div>
      )}

      {/* KPIs del Modelo ML */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[12px] border border-ash border-l-4 border-l-electric-blue bg-canvas-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-[12px] font-bold uppercase tracking-wide text-slate">
            <span>SKUs Analizados</span>
            <Activity className="h-4 w-4 text-electric-blue" />
          </div>
          <div className="mt-2 font-geist-mono text-[28px] font-bold text-midnight-ink">
            {reporte?.total_skus_analizados ?? 0}
          </div>
          <div className="mt-1 font-geist-mono text-[11px] font-medium text-slate">
            Algoritmo: {reporte?.modelo_utilizado || 'LightGBM / RF Regressor'}
          </div>
        </div>

        <div className="rounded-[12px] border border-ash border-l-4 border-l-tangerine bg-canvas-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-[12px] font-bold uppercase tracking-wide text-slate">
            <span>SKUs Críticos / En Alerta</span>
            <AlertTriangle className="h-4 w-4 text-tangerine" />
          </div>
          <div className="mt-2 font-geist-mono text-[28px] font-bold text-tangerine">
            {reporte?.total_skus_criticos ?? 0}
          </div>
          <div className="mt-1 text-[11px] font-medium text-slate">
            Requieren reposición o acción comercial inmediata
          </div>
        </div>

        <div className="rounded-[12px] border border-ash border-l-4 border-l-[#7c3aed] bg-canvas-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-[12px] font-bold uppercase tracking-wide text-slate">
            <span>Horizonte de Predicción</span>
            <Calendar className="h-4 w-4 text-[#7c3aed]" />
          </div>
          <div className="mt-2 font-geist-mono text-[28px] font-bold text-midnight-ink">
            {reporte?.horizonte_dias ?? 15} días
          </div>
          <div className="mt-1 text-[11px] font-medium text-slate">
            Basado en estacionalidad y lags $t-7, t-14, t-30$
          </div>
        </div>

        <div className="rounded-[12px] border border-ash border-l-4 border-l-[#16a34a] bg-canvas-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-[12px] font-bold uppercase tracking-wide text-slate">
            <span>Inversión Total Sugerida</span>
            <TrendingUp className="h-4 w-4 text-[#16a34a]" />
          </div>
          <div className="mt-2 whitespace-nowrap font-geist-mono text-[28px] font-bold text-[#15803d]">
            S/ {Number(reporte?.inversion_total_sugerida || 0).toFixed(2)}
          </div>
          <div className="mt-1 text-[11px] font-medium text-slate">
            Orden de compra óptima a droguerías
          </div>
        </div>
      </div>

      {/* Tabla de Sugerencias de Reorden por SKU */}
      <div className="rounded-[12px] border border-ash bg-canvas-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ash pb-3">
          <div>
            <h2 className="text-[16px] font-bold text-midnight-ink">
              Matriz de Predicción de Demanda y Sugerencias de Compra
            </h2>
            <p className="text-[12px] text-slate">
              Priorizada automáticamente: Quiebre Crítico → Alerta Reorden → Riesgo Vencimiento → Óptimo
            </p>
          </div>

          <button
            type="button"
            onClick={() => setSoloCriticos((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition ${
              soloCriticos
                ? 'border-electric-blue bg-electric-blue text-canvas-white shadow-2xs'
                : 'border-ash bg-paper-mist text-midnight-ink hover:bg-ash/50'
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            <span>
              {soloCriticos
                ? 'Mostrando: Solo Críticos y Alertas'
                : 'Filtrar Solo Críticos y Alertas'}
            </span>
          </button>
        </div>

        <div className="mt-4 overflow-x-auto rounded-[8px] border border-ash">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-ash bg-paper-mist text-[11px] font-bold uppercase tracking-wider text-slate">
                <th className="px-3 py-2.5">Medicamento / SKU</th>
                <th className="whitespace-nowrap px-3 py-2.5">Estado Rotación ML</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">Lags (7d / 14d / 30d)</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">Predicción 15d</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">Stock & Cobertura</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">Vencimiento FEFO</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">Orden Sugerida</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ash text-[13px]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center font-medium text-slate">
                    Ejecutando inferencia del modelo de Machine Learning...
                  </td>
                </tr>
              ) : !reporte?.sugerencias || reporte.sugerencias.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate">
                    No hay datos suficientes en la base de datos. Haz clic en{' '}
                    <strong className="text-midnight-ink">Calibrar Cold-Start (12m)</strong> para inyectar el historial sintético.
                  </td>
                </tr>
              ) : (
                reporte.sugerencias.map((sug) => {
                  const cfgEstado =
                    ESTADO_BADGE_MAP[sug.estado_rotacion] || ESTADO_BADGE_MAP.OPTIMO

                  return (
                    <tr key={sug.producto_id} className="transition hover:bg-[#eff6ff]/60">
                      <td className="px-3 py-3">
                        <div className="font-bold text-midnight-ink">{sug.nombre}</div>
                        <div className="mt-0.5 font-geist-mono text-[11px] font-medium text-slate">
                          {sug.codigo_barras} · {sug.laboratorio || 'Lab'} · Caja x {sug.unidades_por_caja}u
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-3 py-3">
                        <StatusBadge variant={cfgEstado.variant} mono>
                          {cfgEstado.label}
                        </StatusBadge>
                      </td>

                      <td className="whitespace-nowrap px-3 py-3 text-right font-geist-mono text-[12px]">
                        <span className="font-bold text-midnight-ink">
                          {sug.ventas_ultimos_7d}u
                        </span>{' '}
                        <span className="font-medium text-slate">/ {sug.ventas_ultimos_14d}u</span>{' '}
                        <span className="text-fog">/ {sug.ventas_ultimos_30d}u</span>
                      </td>

                      <td className="whitespace-nowrap px-3 py-3 text-right font-geist-mono">
                        <div className="text-[14px] font-bold text-[#6d28d9]">
                          {sug.demanda_predicha_15d} u.mín
                        </div>
                        <div className="text-[10px] font-medium text-slate">
                          Próx. 15 días
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-3 py-3 text-right font-geist-mono">
                        <div className="font-bold text-midnight-ink">
                          {sug.stock_actual_unidades}u{' '}
                          <span className="text-[11px] font-normal text-slate">
                            (mín {sug.stock_minimo_unidades}u)
                          </span>
                        </div>
                        <div
                          className={`text-[11px] font-bold ${
                            sug.dias_cobertura_actual <= 7
                              ? 'text-[#dc2626]'
                              : sug.dias_cobertura_actual <= 15
                                ? 'text-tangerine'
                                : 'text-[#15803d]'
                          }`}
                        >
                          Cobertura: {Number(sug.dias_cobertura_actual).toFixed(1)} días
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-3 py-3 text-right font-geist-mono text-[12px]">
                        {sug.proximo_vencimiento_fefo ? (
                          <div>
                            <div className="font-semibold text-midnight-ink">
                              {sug.proximo_vencimiento_fefo}
                            </div>
                            <div
                              className={`text-[11px] ${
                                (sug.dias_para_vencimiento_fefo ?? 999) <= 45
                                  ? 'font-bold text-tangerine'
                                  : 'font-medium text-slate'
                              }`}
                            >
                              En {sug.dias_para_vencimiento_fefo} días
                            </div>
                          </div>
                        ) : (
                          <span className="text-fog">Sin lote</span>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-3 py-3 text-right font-geist-mono">
                        {sug.cajas_sugeridas_compra > 0 ? (
                          <div>
                            <div className="text-[14px] font-bold text-electric-blue">
                              Pedir {sug.cajas_sugeridas_compra} cajas
                            </div>
                            <div className="whitespace-nowrap text-[11px] font-semibold text-slate">
                              ({sug.cantidad_unidades_sugerida}u) · S/{' '}
                              {Number(sug.inversion_estimada).toFixed(2)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[12px] font-medium text-fog">
                            No pedir (S/ 0.00)
                          </span>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-3 py-3 text-right">
                        {sug.cajas_sugeridas_compra > 0 ? (
                          <button
                            type="button"
                            onClick={() => irAAbastecerSKU(sug)}
                            className="inline-flex items-center gap-1 whitespace-nowrap rounded-[8px] border border-[#93c5fd] bg-[#eff6ff] px-3 py-1.5 text-[12px] font-semibold text-electric-blue transition hover:bg-electric-blue hover:text-canvas-white"
                          >
                            <ShoppingBag className="h-3.5 w-3.5" />
                            Abastecer
                          </button>
                        ) : (
                          <span className="font-geist-mono text-[11px] font-semibold text-[#15803d]">
                            Cubierto
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
