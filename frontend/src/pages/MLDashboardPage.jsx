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
    label: 'Por Agotarse (Urgente)',
    shortLabel: 'Urgente',
    color: '#dc2626',
    bg: '#fee2e2',
  },
  ALERTA_REORDEN: {
    variant: 'lavender',
    label: 'Conviene Comprar Pronto',
    shortLabel: 'Comprar Pronto',
    color: '#7c3aed',
    bg: '#ede9fe',
  },
  RIESGO_VENCIMIENTO: {
    variant: 'tangerine',
    label: 'Riesgo de Vencimiento',
    shortLabel: 'Por Vencer',
    color: '#d97706',
    bg: '#ffedd5',
  },
  OPTIMO: {
    variant: 'mint',
    label: 'Stock Suficiente',
    shortLabel: 'Bien Abastecido',
    color: '#16a34a',
    bg: '#dcfce7',
  },
}

/**
 * Gráfico amigable de evolución de ventas y proyección para los próximos 15 días.
 */
function DemandTrendChart({ sku }) {
  if (!sku) return null

  const eq30d = Math.round((Number(sku.ventas_ultimos_30d || 0) / 30) * 15)
  const eq14d = Math.round((Number(sku.ventas_ultimos_14d || 0) / 14) * 15)
  const eq7d = Math.round((Number(sku.ventas_ultimos_7d || 0) / 7) * 15)
  const pred15d = Number(sku.demanda_predicha_15d || 0)
  const stockActual = Number(sku.stock_actual_unidades || 0)

  const pointsData = [
    { label: 'Hace 1 mes', sub: `${sku.ventas_ultimos_30d} unds/mes`, val: eq30d },
    { label: 'Hace 2 semanas', sub: `${sku.ventas_ultimos_14d} unds/14d`, val: eq14d },
    { label: 'Última semana', sub: `${sku.ventas_ultimos_7d} unds/7d`, val: eq7d },
    { label: 'Próximos 15 días', sub: 'Venta estimada', val: pred15d, isPrediction: true },
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
          <span className="text-[13.5px] font-bold text-midnight-ink">
            Tendencia de Ventas: {sku.nombre}
          </span>
          <p className="text-[11.5px] text-slate">
            Comparación del ritmo de ventas frente a las unidades que tienes hoy ({stockActual} unds)
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="inline-flex items-center gap-1.5 font-semibold text-[#6d28d9]">
            <span className="h-2.5 w-2.5 rounded-full bg-[#7c3aed]" />
            Ventas estimadas
          </span>
          <span className="inline-flex items-center gap-1.5 font-semibold text-[#0f766e]">
            <span className="h-0.5 w-4 bg-[#0d9488]" />
            Stock hoy ({stockActual} unds)
          </span>
        </div>
      </div>

      <div className="rounded-[10px] border border-[#e5e0d8] bg-[#faf8f5] p-3">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[195px] w-full overflow-visible"
        >
          <defs>
            <linearGradient id="mlAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.02" />
            </linearGradient>
          </defs>

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
                  {labelVal}
                </text>
              </g>
            )
          })}

          <line
            x1={padLeft}
            y1={stockY}
            x2={width - padRight}
            y2={stockY}
            stroke="#0d9488"
            strokeWidth="1.8"
            strokeDasharray="5 4"
          />

          <path d={areaPath} fill="url(#mlAreaGrad)" />

          <path
            d={linePath}
            fill="none"
            stroke="#7c3aed"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {coords.map((c, idx) => (
            <g key={idx}>
              <circle
                cx={c.x}
                cy={c.y}
                r={c.isPrediction ? 6 : 4.5}
                fill={c.isPrediction ? '#0d9488' : '#7c3aed'}
                stroke="#ffffff"
                strokeWidth="2"
              />
              <text
                x={c.x}
                y={c.y - 10}
                textAnchor="middle"
                className="fill-slate-900 font-geist-mono text-[11px] font-bold"
              >
                {c.val} unds
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
                className="fill-slate-400 font-inter text-[9px]"
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
        `¡Datos de demostración actualizados! (${res.productos_creados} medicamentos y ${res.lotes_creados} lotes cargados).`
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
      {/* Encabezado Amigable */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[14px] border border-[#e5e0d8] bg-canvas-white px-6 py-4 shadow-2xs">
        <div>
          <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-[#99f6e4] bg-[#f0fdfa] px-3 py-0.5 text-[12px] font-semibold text-[#0f766e]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Asistente Inteligente de Abastecimiento</span>
          </div>
          <h1 className="font-satoshi text-[28px] font-bold leading-tight text-midnight-ink">
            Compras Sugeridas para la Botica
          </h1>
          <p className="mt-1 text-[14px] text-slate">
            El sistema analiza tus ventas recientes para avisarte qué medicamentos se van a agotar en los próximos 15 días y cuántas cajas pedir.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSeedColdStart}
            disabled={seeding}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-[10px] border border-[#e5e0d8] bg-[#faf8f5] px-3.5 py-2 text-[13.5px] font-semibold text-slate transition hover:bg-[#f0fdfa] hover:text-[#0f766e] disabled:opacity-50"
          >
            <DatabaseZap className="h-4 w-4 text-[#0d9488]" />
            <span>
              {seeding ? 'Cargando ejemplo...' : 'Cargar Datos de Ejemplo'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => ejecutarPrediccionML(soloCriticos)}
            disabled={loading}
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-[10px] bg-[#0d9488] px-4 py-2 text-[14px] font-semibold text-white shadow-2xs hover:bg-[#0f766e] disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar Sugerencias</span>
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
            className="text-[12px] font-semibold underline"
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
            className="text-[12px] font-semibold underline"
          >
            OK
          </button>
        </div>
      )}

      {/* Tarjetas de Resumen */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[12px] border border-[#e5e0d8] border-l-4 border-l-[#0d9488] bg-canvas-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-[12px] font-bold uppercase tracking-wide text-slate">
            <span>Medicamentos Evaluados</span>
            <Activity className="h-4 w-4 text-[#0d9488]" />
          </div>
          <div className="mt-2 font-geist-mono text-[28px] font-bold text-midnight-ink">
            {reporte?.total_skus_analizados ?? 0}
          </div>
          <div className="mt-1 text-[11.5px] font-medium text-slate">
            Revisión automática del almacén
          </div>
        </div>

        <div className="rounded-[12px] border border-[#e5e0d8] border-l-4 border-l-[#d97706] bg-canvas-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-[12px] font-bold uppercase tracking-wide text-slate">
            <span>Requieren Atención</span>
            <AlertTriangle className="h-4 w-4 text-[#d97706]" />
          </div>
          <div className="mt-2 font-geist-mono text-[28px] font-bold text-[#d97706]">
            {reporte?.total_skus_criticos ?? 0}
          </div>
          <div className="mt-1 text-[11.5px] font-medium text-slate">
            Por agotarse o próximos a vencer
          </div>
        </div>

        <div className="rounded-[12px] border border-[#e5e0d8] border-l-4 border-l-[#7c3aed] bg-canvas-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-[12px] font-bold uppercase tracking-wide text-slate">
            <span>Periodo Calculado</span>
            <Calendar className="h-4 w-4 text-[#7c3aed]" />
          </div>
          <div className="mt-2 font-geist-mono text-[28px] font-bold text-midnight-ink">
            {reporte?.horizonte_dias ?? 15} días
          </div>
          <div className="mt-1 text-[11.5px] font-medium text-slate">
            Estimación de ventas para 2 semanas
          </div>
        </div>

        <div className="rounded-[12px] border border-[#e5e0d8] border-l-4 border-l-[#16a34a] bg-canvas-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-[12px] font-bold uppercase tracking-wide text-slate">
            <span>Presupuesto de Compra</span>
            <TrendingUp className="h-4 w-4 text-[#16a34a]" />
          </div>
          <div className="mt-2 whitespace-nowrap font-geist-mono text-[28px] font-bold text-[#15803d]">
            S/ {Number(reporte?.inversion_total_sugerida || 0).toFixed(2)}
          </div>
          <div className="mt-1 text-[11.5px] font-medium text-slate">
            Inversión estimada para reponer stock
          </div>
        </div>
      </div>

      {/* Gráficos Interactivos */}
      {reporte?.sugerencias && reporte.sugerencias.length > 0 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="rounded-[14px] border border-[#e5e0d8] bg-canvas-white p-5 shadow-2xs lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e5e0d8] pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-[#0d9488]" />
                <div>
                  <h2 className="text-[15px] font-bold text-midnight-ink">
                    Stock Disponible Hoy vs. Ventas Estimadas (Próximos 15 días)
                  </h2>
                  <p className="text-[11.5px] text-slate">
                    Selecciona un medicamento para ver su curva de ventas a la derecha
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-[11px] font-semibold">
                <span className="inline-flex items-center gap-1.5 text-[#0f766e]">
                  <span className="h-2.5 w-2.5 rounded-xs bg-[#0d9488]" />
                  Tienes hoy
                </span>
                <span className="inline-flex items-center gap-1.5 text-[#6d28d9]">
                  <span className="h-2.5 w-2.5 rounded-xs bg-[#7c3aed]" />
                  Se venderá en 15 días
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
                        ? 'border-[#0d9488] bg-[#f0fdfa]'
                        : 'border-[#e5e0d8] bg-[#faf8f5] hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[12.5px]">
                      <span className="truncate font-semibold text-midnight-ink">
                        {sug.nombre}
                      </span>
                      <StatusBadge variant={cfg.variant}>
                        {cfg.shortLabel}
                      </StatusBadge>
                    </div>

                    <div className="mt-2 space-y-1.5 text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="w-24 shrink-0 font-medium text-slate">
                          Tienes hoy:
                        </span>
                        <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-[#0d9488] transition-all duration-500"
                            style={{ width: `${Math.max(pctStock, 3)}%` }}
                          />
                        </div>
                        <span className="w-16 shrink-0 text-right font-geist-mono font-bold text-midnight-ink">
                          {sug.stock_actual_unidades} unds
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="w-24 shrink-0 font-medium text-[#6d28d9]">
                          Venta 15 días:
                        </span>
                        <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-[#7c3aed] transition-all duration-500"
                            style={{ width: `${Math.max(pctPred, 3)}%` }}
                          />
                        </div>
                        <span className="w-16 shrink-0 text-right font-geist-mono font-bold text-[#6d28d9]">
                          {sug.demanda_predicha_15d} unds
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="space-y-4 lg:col-span-5">
            <div className="rounded-[14px] border border-[#e5e0d8] bg-canvas-white p-5 shadow-2xs">
              <DemandTrendChart sku={skuSeleccionado} />
            </div>

            <div className="rounded-[14px] border border-[#e5e0d8] bg-canvas-white p-5 shadow-2xs">
              <div className="flex items-center gap-2 border-b border-[#e5e0d8] pb-2.5">
                <PieChart className="h-4 w-4 text-[#0d9488]" />
                <h3 className="text-[14px] font-bold text-midnight-ink">
                  Resumen del Estado de tu Inventario
                </h3>
              </div>

              <div className="mt-3 flex h-4 w-full overflow-hidden rounded-full bg-slate-200">
                {distribucionEstados.map((d) =>
                  d.count > 0 ? (
                    <div
                      key={d.key}
                      style={{
                        width: `${d.pct}%`,
                        backgroundColor: d.color,
                      }}
                      title={`${d.label}: ${d.count} medicamentos (${d.pct}%)`}
                    />
                  ) : null
                )}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {distribucionEstados.map((d) => (
                  <div
                    key={d.key}
                    className="flex items-center justify-between rounded-[8px] border border-[#e5e0d8] bg-[#faf8f5] px-2.5 py-1.5 text-[11.5px]"
                  >
                    <span className="flex items-center gap-1.5 font-semibold text-midnight-ink">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: d.color }}
                      />
                      <span className="truncate">{d.shortLabel}</span>
                    </span>
                    <span className="whitespace-nowrap font-geist-mono font-bold text-slate">
                      {d.count} ({d.pct}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabla de Sugerencias de Compra */}
      <div className="rounded-[14px] border border-[#e5e0d8] bg-canvas-white p-5 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5e0d8] pb-3">
          <div>
            <h2 className="text-[16px] font-bold text-midnight-ink">
              Lista Detallada de Compras Recomendadas
            </h2>
            <p className="text-[12px] text-slate">
              Ordenada empezando por los medicamentos más urgentes de reponer
            </p>
          </div>

          <button
            type="button"
            onClick={() => setSoloCriticos((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition ${
              soloCriticos
                ? 'border-[#0d9488] bg-[#0d9488] text-white shadow-2xs'
                : 'border-[#e5e0d8] bg-[#faf8f5] text-midnight-ink hover:bg-[#f0fdfa]'
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            <span>
              {soloCriticos
                ? 'Mostrando: Solo los que requieren compra'
                : 'Ver solo los que requieren compra'}
            </span>
          </button>
        </div>

        <div className="mt-4 overflow-x-auto rounded-[10px] border border-[#e5e0d8]">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[#e5e0d8] bg-[#faf8f5] text-[11px] font-bold uppercase tracking-wider text-slate">
                <th className="px-3.5 py-2.5">Medicamento / Laboratorio</th>
                <th className="whitespace-nowrap px-3.5 py-2.5">Situación Actual</th>
                <th className="whitespace-nowrap px-3.5 py-2.5 text-right">Ventas (7d / 14d / 30d)</th>
                <th className="whitespace-nowrap px-3.5 py-2.5 text-right">Venta Estimada (15d)</th>
                <th className="whitespace-nowrap px-3.5 py-2.5 text-right">Stock y Duración</th>
                <th className="whitespace-nowrap px-3.5 py-2.5 text-right">Próximo Vencimiento</th>
                <th className="whitespace-nowrap px-3.5 py-2.5 text-right">Compra Sugerida</th>
                <th className="whitespace-nowrap px-3.5 py-2.5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e0d8] text-[13px]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center font-medium text-slate">
                    Calculando sugerencias de compra...
                  </td>
                </tr>
              ) : !reporte?.sugerencias || reporte.sugerencias.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate">
                    No hay historial cargado aún. Haz clic en{' '}
                    <strong className="text-midnight-ink">Cargar Datos de Ejemplo</strong> arriba.
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
                      className="cursor-pointer transition hover:bg-[#f0fdfa]/60"
                    >
                      <td className="px-3.5 py-3">
                        <div className="font-bold text-midnight-ink">{sug.nombre}</div>
                        <div className="mt-0.5 text-[11.5px] font-medium text-slate">
                          {sug.laboratorio || 'Laboratorio'} · Caja de {sug.unidades_por_caja} unds
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-3.5 py-3">
                        <StatusBadge variant={cfgEstado.variant}>
                          {cfgEstado.label}
                        </StatusBadge>
                      </td>

                      <td className="whitespace-nowrap px-3.5 py-3 text-right font-geist-mono text-[12px]">
                        <span className="font-bold text-midnight-ink">
                          {sug.ventas_ultimos_7d}
                        </span>{' '}
                        <span className="font-medium text-slate">/ {sug.ventas_ultimos_14d}</span>{' '}
                        <span className="text-steel">/ {sug.ventas_ultimos_30d} unds</span>
                      </td>

                      <td className="whitespace-nowrap px-3.5 py-3 text-right">
                        <div className="font-geist-mono text-[14px] font-bold text-[#6d28d9]">
                          {sug.demanda_predicha_15d} unds
                        </div>
                        <div className="text-[10.5px] font-medium text-slate">
                          En los próx. 15 días
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-3.5 py-3 text-right">
                        <div className="font-geist-mono font-bold text-midnight-ink">
                          {sug.stock_actual_unidades} unds{' '}
                          <span className="font-inter text-[11px] font-normal text-slate">
                            (mín. {sug.stock_minimo_unidades})
                          </span>
                        </div>
                        <div
                          className={`text-[11px] font-bold ${
                            sug.dias_cobertura_actual <= 7
                              ? 'text-[#dc2626]'
                              : sug.dias_cobertura_actual <= 15
                                ? 'text-[#d97706]'
                                : 'text-[#15803d]'
                          }`}
                        >
                          Alcanza para {Number(sug.dias_cobertura_actual).toFixed(0)} días
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-3.5 py-3 text-right text-[12px]">
                        {sug.proximo_vencimiento_fefo ? (
                          <div>
                            <div className="font-geist-mono font-semibold text-midnight-ink">
                              {sug.proximo_vencimiento_fefo}
                            </div>
                            <div
                              className={`text-[11px] ${
                                (sug.dias_para_vencimiento_fefo ?? 999) <= 45
                                  ? 'font-bold text-[#d97706]'
                                  : 'font-medium text-slate'
                              }`}
                            >
                              En {sug.dias_para_vencimiento_fefo} días
                            </div>
                          </div>
                        ) : (
                          <span className="text-steel">Sin lote</span>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-3.5 py-3 text-right">
                        {sug.cajas_sugeridas_compra > 0 ? (
                          <div>
                            <div className="text-[13.5px] font-bold text-[#0f766e]">
                              Comprar {sug.cajas_sugeridas_compra} caja(s)
                            </div>
                            <div className="whitespace-nowrap font-geist-mono text-[11px] font-semibold text-slate">
                              ({sug.cantidad_unidades_sugerida} unds) · S/{' '}
                              {Number(sug.inversion_estimada).toFixed(2)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[12px] font-medium text-steel">
                            No requiere compra
                          </span>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-3.5 py-3 text-right">
                        {sug.cajas_sugeridas_compra > 0 ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              irAAbastecerSKU(sug)
                            }}
                            className="inline-flex items-center gap-1 whitespace-nowrap rounded-[8px] border border-[#99f6e4] bg-[#f0fdfa] px-3 py-1.5 text-[12px] font-semibold text-[#0f766e] transition hover:bg-[#0d9488] hover:text-white"
                          >
                            <ShoppingBag className="h-3.5 w-3.5" />
                            Registrar Compra
                          </button>
                        ) : (
                          <span className="text-[11.5px] font-semibold text-[#15803d]">
                            Abastecido
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
