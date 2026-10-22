import { useState, useEffect, useCallback, useMemo } from 'react'
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
  BarChart3,
  PieChart,
} from 'lucide-react'
import { mlApi, getErrorMessage } from '../services/api'
import { StatusBadge } from '../components'

const ESTADO_BADGE_MAP = {
  CRITICO: {
    variant: 'danger',
    label: 'QUIEBRE CRÍTICO',
    color: '#dc2626',
    bg: '#fee2e2',
  },
  ALERTA_REORDEN: {
    variant: 'lavender',
    label: 'SUGERENCIA ML REORDEN',
    color: '#7c3aed',
    bg: '#ede9fe',
  },
  RIESGO_VENCIMIENTO: {
    variant: 'tangerine',
    label: 'SOBRESTOCK / RIESGO VENC.',
    color: '#ea580c',
    bg: '#ffedd5',
  },
  OPTIMO: {
    variant: 'mint',
    label: 'STOCK ÓPTIMO',
    color: '#16a34a',
    bg: '#dcfce7',
  },
}

/**
 * Gráfico SVG de Área y Línea para la Curva de Tendencia de Demanda (Lags t-30, t-14, t-7 -> Predicción +15d)
 */
function DemandTrendChart({ sku }) {
  if (!sku) return null

  // Normalizamos a demanda quincenal equivalente (15 días) para comparar la aceleración real vs predicción ML
  const eq30d = Math.round((Number(sku.ventas_ultimos_30d || 0) / 30) * 15)
  const eq14d = Math.round((Number(sku.ventas_ultimos_14d || 0) / 14) * 15)
  const eq7d = Math.round((Number(sku.ventas_ultimos_7d || 0) / 7) * 15)
  const pred15d = Number(sku.demanda_predicha_15d || 0)
  const stockActual = Number(sku.stock_actual_unidades || 0)

  const pointsData = [
    { label: 'Ritmo t-30d', sub: `${sku.ventas_ultimos_30d}u / 30d`, val: eq30d },
    { label: 'Ritmo t-14d', sub: `${sku.ventas_ultimos_14d}u / 14d`, val: eq14d },
    { label: 'Ritmo t-7d', sub: `${sku.ventas_ultimos_7d}u / 7d`, val: eq7d },
    { label: 'Proyección ML (+15d)', sub: 'Horizonte 15d', val: pred15d, isPrediction: true },
  ]

  const maxVal = Math.max(...pointsData.map((p) => p.val), stockActual, 20) * 1.18
  const width = 520
  const height = 200
  const padLeft = 44
  const padRight = 32
  const padTop = 26
  const padBottom = 38
  const innerW = width - padLeft - padRight
  const innerH = height - padTop - padBottom

  const coords = pointsData.map((p, idx) => {
    const x = padLeft + (idx / (pointsData.length - 1)) * innerW
    const y = padTop + innerH - (p.val / maxVal) * innerH
    return { ...p, x, y }
  })

  const linePath = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(' ')

  const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${
    padTop + innerH
  } L ${coords[0].x.toFixed(1)} ${padTop + innerH} Z`

  const stockY = padTop + innerH - (stockActual / maxVal) * innerH

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-[13px] font-bold text-midnight-ink">
            Curva de Velocidad de Demanda Quincenal: {sku.nombre}
          </span>
          <p className="font-geist-mono text-[11px] text-slate">
            Evolución de tasa de salida (normalizada a 15 días) vs. Stock disponible ({stockActual} u.mín)
          </p>
        </div>
        <div className="flex items-center gap-3 font-geist-mono text-[11px]">
          <span className="inline-flex items-center gap-1.5 text-[#6d28d9] font-semibold">
            <span className="h-2.5 w-2.5 rounded-full bg-[#7c3aed]" />
            Demanda / Predicción ML
          </span>
          <span className="inline-flex items-center gap-1.5 text-[#15803d] font-semibold">
            <span className="h-0.5 w-4 bg-[#16a34a]" />
            Nivel Stock Actual ({stockActual}u)
          </span>
        </div>
      </div>

      <div className="rounded-[10px] border border-ash bg-[#f8fafc] p-3">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[195px] w-full overflow-visible"
        >
          <defs>
            <linearGradient id="mlAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Líneas guía horizontales */}
          {[0, 0.5, 1].map((t, idx) => {
            const y = padTop + innerH - t * innerH
            const labelVal = Math.round(t * maxVal)
            return (
              <g key={idx}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray="3 3"
                />
                <text
                  x={padLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-400 font-geist-mono text-[10px]"
                >
                  {labelVal}u
                </text>
              </g>
            )
          })}

          {/* Línea punteada de Stock Actual */}
          <line
            x1={padLeft}
            y1={stockY}
            x2={width - padRight}
            y2={stockY}
            stroke="#16a34a"
            strokeWidth="1.8"
            strokeDasharray="5 4"
          />

          {/* Área bajo la curva */}
          <path d={areaPath} fill="url(#mlAreaGrad)" />

          {/* Línea de tendencia */}
          <path
            d={linePath}
            fill="none"
            stroke="#7c3aed"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Puntos y etiquetas */}
          {coords.map((c, idx) => (
            <g key={idx}>
              <circle
                cx={c.x}
                cy={c.y}
                r={c.isPrediction ? 6 : 4.5}
                fill={c.isPrediction ? '#2563eb' : '#7c3aed'}
                stroke="#ffffff"
                strokeWidth="2"
              />
              <text
                x={c.x}
                y={c.y - 10}
                textAnchor="middle"
                className="fill-slate-900 font-geist-mono text-[11px] font-bold"
              >
                {c.val}u
              </text>
              <text
                x={c.x}
                y={padTop + innerH + 16}
                textAnchor="middle"
                className="fill-slate-700 font-inter text-[10px] font-semibold"
              >
                {c.label}
              </text>
              <text
                x={c.x}
                y={padTop + innerH + 29}
                textAnchor="middle"
                className="fill-slate-400 font-geist-mono text-[9px]"
              >
                {c.sub}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}

export function MLDashboardPage() {
  const navigate = useNavigate()
  const [reporte, setReporte] = useState(null)
  const [soloCriticos, setSoloCriticos] = useState(false)
  const [selectedSkuId, setSelectedSkuId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [error, setError] = useState(null)
  const [seedInfo, setSeedInfo] = useState(null)

  const ejecutarPrediccionML = useCallback(
    async (filtrarCriticos = soloCriticos) => {
      setLoading(true)
      setError(null)
      try {
        const data = await mlApi.obtenerSugerenciasReorden(filtrarCriticos)
        setReporte(data)
        if (data?.sugerencias?.length > 0) {
          setSelectedSkuId((prev) =>
            prev && data.sugerencias.some((s) => s.producto_id === prev)
              ? prev
              : data.sugerencias[0].producto_id
          )
        }
      } catch (err) {
        setError(getErrorMessage(err))
      } finally {
        setLoading(false)
      }
    },
    [soloCriticos]
  )

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
    const unidades = Math.max(
      sug.cantidad_unidades_sugerida || 100,
      sug.unidades_por_caja || 100
    )
    navigate(`/lotes-kardex?producto_id=${sug.producto_id}&unidades=${unidades}`)
  }

  // Distribución de estados de rotación para el gráfico de anillo
  const distribucionEstados = useMemo(() => {
    const sugs = reporte?.sugerencias || []
    const conteo = {
      CRITICO: 0,
      ALERTA_REORDEN: 0,
      RIESGO_VENCIMIENTO: 0,
      OPTIMO: 0,
    }
    sugs.forEach((s) => {
      conteo[s.estado_rotacion] = (conteo[s.estado_rotacion] || 0) + 1
    })
    const total = Math.max(sugs.length, 1)
    return Object.entries(conteo).map(([key, count]) => ({
      key,
      count,
      pct: Math.round((count / total) * 100),
      ...ESTADO_BADGE_MAP[key],
    }))
  }, [reporte])

  const skuSeleccionado = useMemo(() => {
    const sugs = reporte?.sugerencias || []
    return (
      sugs.find((s) => s.producto_id === selectedSkuId) || sugs[0] || null
    )
  }, [reporte, selectedSkuId])

  const maxEscalaBarras = useMemo(() => {
    const sugs = reporte?.sugerencias || []
    let max = 50
    sugs.forEach((s) => {
      max = Math.max(
        max,
        Number(s.stock_actual_unidades || 0),
        Number(s.demanda_predicha_15d || 0),
        Number(s.ventas_ultimos_14d || 0)
      )
    })
    return max
  }, [reporte])

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

      {/* SECCIÓN DE GRÁFICOS VISUALES INTERACTIVOS */}
      {reporte?.sugerencias && reporte.sugerencias.length > 0 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Gráfico 1 (7 cols): Comparativa de Barras Stock Actual vs Demanda Predicha ML 15d */}
          <div className="rounded-[12px] border border-ash bg-canvas-white p-4 shadow-xs lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ash pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-electric-blue" />
                <div>
                  <h2 className="text-[15px] font-bold text-midnight-ink">
                    Comparativa Visual: Stock Actual vs. Demanda Predicha ML (15d)
                  </h2>
                  <p className="text-[11px] text-slate">
                    Haz clic en cualquier medicamento para inspeccionar su curva de lags a la derecha
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 font-geist-mono text-[11px] font-semibold">
                <span className="inline-flex items-center gap-1.5 text-electric-blue">
                  <span className="h-2.5 w-2.5 rounded-xs bg-electric-blue" />
                  Stock FEFO
                </span>
                <span className="inline-flex items-center gap-1.5 text-[#6d28d9]">
                  <span className="h-2.5 w-2.5 rounded-xs bg-[#7c3aed]" />
                  Predicción 15d
                </span>
              </div>
            </div>

            <div className="mt-3 max-h-[340px] space-y-2.5 overflow-y-auto pr-1">
              {reporte.sugerencias.map((sug) => {
                const pctStock = Math.min(
                  100,
                  Math.round((sug.stock_actual_unidades / maxEscalaBarras) * 100)
                )
                const pctPred = Math.min(
                  100,
                  Math.round((sug.demanda_predicha_15d / maxEscalaBarras) * 100)
                )
                const isSelected = skuSeleccionado?.producto_id === sug.producto_id
                const cfg =
                  ESTADO_BADGE_MAP[sug.estado_rotacion] || ESTADO_BADGE_MAP.OPTIMO

                return (
                  <div
                    key={sug.producto_id}
                    onClick={() => setSelectedSkuId(sug.producto_id)}
                    className={`cursor-pointer rounded-[10px] border p-2.5 transition ${
                      isSelected
                        ? 'border-electric-blue bg-[#eff6ff]'
                        : 'border-ash bg-[#f8fafc] hover:bg-paper-mist'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[12px]">
                      <span className="truncate font-semibold text-midnight-ink">
                        {sug.nombre}
                      </span>
                      <StatusBadge variant={cfg.variant} mono>
                        {sug.estado_rotacion}
                      </StatusBadge>
                    </div>

                    <div className="mt-2 space-y-1.5 font-geist-mono text-[11px]">
                      {/* Barra Stock Actual */}
                      <div className="flex items-center gap-2">
                        <span className="w-20 shrink-0 text-slate">Stock FEFO:</span>
                        <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-electric-blue transition-all duration-500"
                            style={{ width: `${Math.max(pctStock, 3)}%` }}
                          />
                        </div>
                        <span className="w-14 shrink-0 text-right font-bold text-midnight-ink">
                          {sug.stock_actual_unidades}u
                        </span>
                      </div>

                      {/* Barra Demanda Predicha 15d */}
                      <div className="flex items-center gap-2">
                        <span className="w-20 shrink-0 text-[#6d28d9]">
                          Pred. 15d:
                        </span>
                        <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-[#7c3aed] transition-all duration-500"
                            style={{ width: `${Math.max(pctPred, 3)}%` }}
                          />
                        </div>
                        <span className="w-14 shrink-0 text-right font-bold text-[#6d28d9]">
                          {sug.demanda_predicha_15d}u
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Gráfico 2 (5 cols): Curva de Lags Temporales + Distribución del Inventario */}
          <div className="space-y-4 lg:col-span-5">
            <div className="rounded-[12px] border border-ash bg-canvas-white p-4 shadow-xs">
              <DemandTrendChart sku={skuSeleccionado} />
            </div>

            {/* Distribución de Estados de Rotación del Catálogo */}
            <div className="rounded-[12px] border border-ash bg-canvas-white p-4 shadow-xs">
              <div className="flex items-center gap-2 border-b border-ash pb-2.5">
                <PieChart className="h-4 w-4 text-[#7c3aed]" />
                <h3 className="text-[14px] font-bold text-midnight-ink">
                  Distribución de Salud del Inventario (Clasificación ML)
                </h3>
              </div>

              {/* Barra apilada multicapa */}
              <div className="mt-3 flex h-4 w-full overflow-hidden rounded-full bg-slate-200">
                {distribucionEstados.map((d) =>
                  d.count > 0 ? (
                    <div
                      key={d.key}
                      style={{
                        width: `${d.pct}%`,
                        backgroundColor: d.color,
                      }}
                      title={`${d.label}: ${d.count} SKUs (${d.pct}%)`}
                    />
                  ) : null
                )}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {distribucionEstados.map((d) => (
                  <div
                    key={d.key}
                    className="flex items-center justify-between rounded-[8px] border border-ash bg-[#f8fafc] px-2.5 py-1.5 font-geist-mono text-[11px]"
                  >
                    <span className="flex items-center gap-1.5 font-semibold text-midnight-ink">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: d.color }}
                      />
                      <span className="truncate">{d.key}</span>
                    </span>
                    <span className="whitespace-nowrap font-bold text-slate">
                      {d.count} ({d.pct}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

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
                    <tr
                      key={sug.producto_id}
                      onClick={() => setSelectedSkuId(sug.producto_id)}
                      className="cursor-pointer transition hover:bg-[#eff6ff]/60"
                    >
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
                            onClick={(e) => {
                              e.stopPropagation()
                              irAAbastecerSKU(sug)
                            }}
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
