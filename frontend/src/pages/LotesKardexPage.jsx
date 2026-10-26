import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Layers,
  AlertTriangle,
  CheckCircle2,
  Plus,
  FileText,
  SlidersHorizontal,
  CalendarClock,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { productosApi, inventarioApi, getErrorMessage } from '../services/api'
import { StatusBadge, Modal } from '../components'

const MOVIMIENTO_AMIGABLE = {
  COMPRA: 'Ingreso de Compra',
  VENTA: 'Venta en Mostrador',
  MERMA_VENCIMIENTO: 'Retiro por Vencimiento / Deterioro',
  AJUSTE_INVENTARIO: 'Ajuste de Conteo Físico',
}

export function LotesKardexPage() {
  const [searchParams] = useSearchParams()
  const preselectedProdId = searchParams.get('producto_id')
  const preselectedUnits = searchParams.get('unidades')

  const [productos, setProductos] = useState([])
  const [productoSeleccionadoId, setProductoSeleccionadoId] = useState('')
  const [lotesProducto, setLotesProducto] = useState([])
  const [alertasVencimiento, setAlertasVencimiento] = useState([])
  const [diasUmbral, setDiasUmbral] = useState(90)

  const [loteKardexActivo, setLoteKardexActivo] = useState(null)
  const [movimientosKardex, setMovimientosKardex] = useState([])
  const [loadingKardex, setLoadingKardex] = useState(false)

  const [modalIngresoOpen, setModalIngresoOpen] = useState(false)
  const [modalAjusteOpen, setModalAjusteOpen] = useState(false)
  const [loteParaAjuste, setLoteParaAjuste] = useState(null)

  const [formLote, setFormLote] = useState({
    producto_id: '',
    numero_lote: '',
    fecha_vencimiento: '',
    stock_inicial: 100,
    costo_compra_unitario: '0.15',
    glosa: 'Ingreso por compra a proveedor',
  })

  const [formAjuste, setFormAjuste] = useState({
    tipo_movimiento: 'MERMA_VENCIMIENTO',
    cantidad_unidades: 1,
    glosa: '',
  })

  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)
  const [procesando, setProcesando] = useState(false)

  const productosMap = useMemo(() => {
    const map = {}
    productos.forEach((p) => {
      map[p.id] = p
    })
    return map
  }, [productos])

  const cargarDatosBase = useCallback(async () => {
    setError(null)
    try {
      const [prods, alertas] = await Promise.all([
        productosApi.listar({ limit: 100 }),
        inventarioApi.obtenerAlertasVencimiento(diasUmbral),
      ])
      setProductos(prods)
      setAlertasVencimiento(alertas)

      if (prods.length > 0) {
        const idInicial =
          preselectedProdId && prods.some((p) => String(p.id) === String(preselectedProdId))
            ? String(preselectedProdId)
            : String(prods[0].id)
        setProductoSeleccionadoId((prev) => prev || idInicial)
      }
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }, [diasUmbral, preselectedProdId])

  useEffect(() => {
    cargarDatosBase()
  }, [cargarDatosBase])

  const cargarLotesDelProducto = useCallback(async (prodId) => {
    if (!prodId) return
    try {
      const lotes = await inventarioApi.listarLotesProducto(prodId)
      setLotesProducto(lotes)
      if (lotes.length > 0) {
        verKardexDeLote(lotes[0])
      } else {
        setLoteKardexActivo(null)
        setMovimientosKardex([])
      }
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }, [])

  useEffect(() => {
    if (productoSeleccionadoId) {
      cargarLotesDelProducto(productoSeleccionadoId)
    }
  }, [productoSeleccionadoId, cargarLotesDelProducto])

  useEffect(() => {
    if (preselectedProdId && preselectedUnits && productos.length > 0) {
      const fechaSugerida = new Date()
      fechaSugerida.setFullYear(fechaSugerida.getFullYear() + 1)
      setFormLote({
        producto_id: String(preselectedProdId),
        numero_lote: `LOT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        fecha_vencimiento: fechaSugerida.toISOString().slice(0, 10),
        stock_inicial: Number(preselectedUnits) || 100,
        costo_compra_unitario: '0.20',
        glosa: 'Reposición de stock sugerida por el sistema',
      })
      setModalIngresoOpen(true)
    }
  }, [preselectedProdId, preselectedUnits, productos.length])

  const verKardexDeLote = async (lote) => {
    setLoteKardexActivo(lote)
    setLoadingKardex(true)
    try {
      const movs = await inventarioApi.consultarKardexLote(lote.id)
      setMovimientosKardex(movs)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoadingKardex(false)
    }
  }

  const abrirModalIngreso = () => {
    const manana = new Date()
    manana.setMonth(manana.getMonth() + 12)
    setFormLote({
      producto_id: productoSeleccionadoId || (productos[0]?.id ? String(productos[0].id) : ''),
      numero_lote: `LOT-2026-${Math.floor(100 + Math.random() * 900)}`,
      fecha_vencimiento: manana.toISOString().slice(0, 10),
      stock_inicial: 100,
      costo_compra_unitario: '0.18',
      glosa: 'Ingreso por factura de compra a droguería',
    })
    setModalIngresoOpen(true)
  }

  const handleRegistrarLote = async (e) => {
    e.preventDefault()
    setProcesando(true)
    setError(null)
    setSuccessMsg(null)

    try {
      const nuevo = await inventarioApi.registrarLote({
        producto_id: Number(formLote.producto_id),
        numero_lote: formLote.numero_lote.trim(),
        fecha_vencimiento: formLote.fecha_vencimiento,
        stock_inicial: Number(formLote.stock_inicial),
        costo_compra_unitario: Number(formLote.costo_compra_unitario),
        glosa: formLote.glosa.trim() || 'Ingreso por compra de lote',
      })
      setSuccessMsg(
        `Se registró el lote ${nuevo.numero_lote} con ${nuevo.stock_inicial} unidades disponibles.`
      )
      setModalIngresoOpen(false)
      setProductoSeleccionadoId(String(nuevo.producto_id))
      await cargarLotesDelProducto(nuevo.producto_id)
      await cargarDatosBase()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setProcesando(false)
    }
  }

  const abrirModalAjuste = (lote) => {
    setLoteParaAjuste(lote)
    setFormAjuste({
      tipo_movimiento: 'MERMA_VENCIMIENTO',
      cantidad_unidades: 1,
      glosa: `Retiro de unidades del lote ${lote.numero_lote}`,
    })
    setModalAjusteOpen(true)
  }

  const handleRegistrarAjuste = async (e) => {
    e.preventDefault()
    if (!loteParaAjuste) return
    setProcesando(true)
    setError(null)
    setSuccessMsg(null)

    try {
      const actualizado = await inventarioApi.registrarAjuste({
        lote_id: loteParaAjuste.id,
        tipo_movimiento: formAjuste.tipo_movimiento,
        cantidad_unidades: Number(formAjuste.cantidad_unidades),
        glosa: formAjuste.glosa.trim(),
      })
      setSuccessMsg(
        `Se actualizó el lote ${actualizado.numero_lote}. Quedan ${actualizado.stock_actual} unidades.`
      )
      setModalAjusteOpen(false)
      await cargarLotesDelProducto(productoSeleccionadoId)
      await verKardexDeLote(actualizado)
      await cargarDatosBase()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setProcesando(false)
    }
  }

  const calcularDiasParaVencer = (fechaStr) => {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const vence = new Date(`${fechaStr}T00:00:00`)
    return Math.ceil((vence - hoy) / (1000 * 60 * 60 * 24))
  }

  return (
    <div className="space-y-6">
      {/* Encabezado Amigable */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[14px] border border-[#e5e0d8] bg-canvas-white px-6 py-4 shadow-2xs">
        <div>
          <h1 className="font-satoshi text-[28px] font-bold leading-tight text-midnight-ink">
            Control de Lotes y Fechas de Vencimiento
          </h1>
          <p className="mt-1 text-[14px] text-slate">
            Revisa qué lotes están próximos a vencer, registra nuevas compras de mercadería y consulta el historial de entradas y salidas.
          </p>
        </div>

        <button
          type="button"
          onClick={abrirModalIngreso}
          className="inline-flex items-center gap-2 whitespace-nowrap rounded-[10px] bg-[#0d9488] px-4 py-2 text-[14px] font-semibold text-white shadow-2xs hover:bg-[#0f766e]"
        >
          <Plus className="h-4 w-4" />
          Registrar Lote Recibido
        </button>
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

      {successMsg && (
        <div className="flex items-center justify-between rounded-[12px] border border-[#86efac] bg-[#dcfce7] px-4 py-3 text-[14px] font-medium text-[#15803d]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="text-[12px] font-semibold underline"
          >
            OK
          </button>
        </div>
      )}

      {/* Avisos de Vencimiento Próximo */}
      <div className="rounded-[14px] border border-[#e5e0d8] border-l-4 border-l-[#d97706] bg-canvas-white p-5 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5e0d8] pb-3">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-[#d97706]" />
            <div>
              <h2 className="text-[16px] font-bold text-midnight-ink">
                Medicamentos Próximos a Vencer
              </h2>
              <p className="text-[12px] text-slate">
                Lotes con unidades disponibles que vencen dentro de los próximos {diasUmbral} días
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {[
              { d: 30, label: '1 mes' },
              { d: 60, label: '2 meses' },
              { d: 90, label: '3 meses' },
              { d: 180, label: '6 meses' },
              { d: 365, label: '1 año' },
            ].map((item) => (
              <button
                key={item.d}
                type="button"
                onClick={() => setDiasUmbral(item.d)}
                className={`rounded-full px-3 py-1 text-[12px] font-semibold transition ${
                  diasUmbral === item.d
                    ? 'bg-[#0d9488] text-white shadow-2xs'
                    : 'border border-[#e5e0d8] bg-[#faf8f5] text-slate hover:text-midnight-ink'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {alertasVencimiento.length === 0 ? (
            <div className="col-span-full py-4 text-center text-[13px] text-slate">
              No hay medicamentos próximos a vencer en este periodo.
            </div>
          ) : (
            alertasVencimiento.map((lote) => {
              const prod = productosMap[lote.producto_id]
              const diasRestantes = calcularDiasParaVencer(lote.fecha_vencimiento)
              return (
                <div
                  key={lote.id}
                  onClick={() => {
                    setProductoSeleccionadoId(String(lote.producto_id))
                    verKardexDeLote(lote)
                  }}
                  className="cursor-pointer rounded-[12px] border border-[#e5e0d8] bg-[#faf8f5] p-3 transition hover:border-[#d97706] hover:bg-[#fffbeb]"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-geist-mono text-[12px] font-bold text-midnight-ink">
                      Lote {lote.numero_lote}
                    </span>
                    <StatusBadge
                      variant={diasRestantes <= 30 ? 'danger' : 'tangerine'}
                    >
                      Vence en {diasRestantes} días
                    </StatusBadge>
                  </div>
                  <div className="mt-1 truncate text-[13px] font-semibold text-midnight-ink">
                    {prod?.nombre || `Medicamento #${lote.producto_id}`}
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[11.5px] text-slate">
                    <span>Fecha: {lote.fecha_vencimiento}</span>
                    <span className="font-bold text-midnight-ink">
                      Quedan {lote.stock_actual} unds
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Grilla: Lotes por Medicamento (Izquierda) e Historial de Entradas y Salidas (Derecha) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-[14px] border border-[#e5e0d8] bg-canvas-white p-5 shadow-2xs lg:col-span-6">
          <div className="border-b border-[#e5e0d8] pb-3">
            <label className="block text-[12px] font-bold uppercase tracking-wider text-slate">
              1. Elige un medicamento para ver sus lotes disponibles
            </label>
            <select
              value={productoSeleccionadoId}
              onChange={(e) => setProductoSeleccionadoId(e.target.value)}
              className="mt-1.5 w-full rounded-[10px] border-2 border-[#cbd5e1] bg-[#faf8f5] px-3 py-2 text-[14px] font-semibold text-midnight-ink focus:border-[#0d9488] focus:bg-white focus:outline-none"
            >
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[14px] font-bold text-midnight-ink">
              <Layers className="h-4 w-4 text-[#0d9488]" />
              Orden de Salida en Mostrador
            </span>
            <span className="text-[11.5px] font-semibold text-slate">
              {lotesProducto.length} lote(s) activos
            </span>
          </div>

          <div className="mt-3 space-y-2.5">
            {lotesProducto.length === 0 ? (
              <div className="rounded-[12px] border border-dashed border-[#e5e0d8] py-8 text-center text-[13px] text-slate">
                Este medicamento no tiene lotes con stock en este momento.
              </div>
            ) : (
              lotesProducto.map((lote, index) => {
                const esPrimero = index === 0
                const seleccionado = loteKardexActivo?.id === lote.id
                return (
                  <div
                    key={lote.id}
                    onClick={() => verKardexDeLote(lote)}
                    className={`cursor-pointer rounded-[12px] border-2 p-3.5 transition ${
                      seleccionado
                        ? 'border-[#0d9488] bg-[#f0fdfa]'
                        : 'border-[#e5e0d8] bg-canvas-white hover:bg-[#faf8f5]'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-geist-mono text-[14px] font-bold text-midnight-ink">
                          {lote.numero_lote}
                        </span>
                        {esPrimero ? (
                          <StatusBadge variant="mint">
                            Sale primero (vence antes)
                          </StatusBadge>
                        ) : (
                          <StatusBadge variant="neutral" withDot={false}>
                            Lote de respaldo #{index + 1}
                          </StatusBadge>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          abrirModalAjuste(lote)
                        }}
                        className="inline-flex items-center gap-1 whitespace-nowrap rounded-[8px] border border-[#fdba74] bg-[#fff7ed] px-2.5 py-1 text-[11px] font-semibold text-[#c2410c] hover:bg-[#ffedd5]"
                      >
                        <SlidersHorizontal className="h-3 w-3" />
                        Dar de baja / Ajustar
                      </button>
                    </div>

                    <div className="mt-2 grid grid-cols-3 gap-2 text-[12px]">
                      <div>
                        <span className="block text-[10px] font-bold text-slate">
                          FECHA VENCIMIENTO
                        </span>
                        <span className="font-geist-mono font-semibold text-midnight-ink">
                          {lote.fecha_vencimiento}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold text-slate">
                          CANTIDAD DISPONIBLE
                        </span>
                        <span className="font-geist-mono font-bold text-[#0f766e]">
                          {lote.stock_actual} de {lote.stock_inicial} unds
                        </span>
                      </div>
                      <div className="whitespace-nowrap text-right">
                        <span className="block text-[10px] font-bold text-slate">
                          COSTO COMPRA
                        </span>
                        <span className="font-geist-mono font-bold text-midnight-ink">
                          S/ {Number(lote.costo_compra_unitario).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Historial de Entradas y Salidas (Derecha) */}
        <div className="rounded-[14px] border border-[#e5e0d8] bg-canvas-white p-5 shadow-2xs lg:col-span-6">
          <div className="flex items-center justify-between border-b border-[#e5e0d8] pb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#0d9488]" />
              <div>
                <h2 className="text-[16px] font-bold text-midnight-ink">
                  2. Historial de Entradas y Salidas
                </h2>
                <p className="text-[12px] text-slate">
                  {loteKardexActivo
                    ? `Movimientos registrados del Lote ${loteKardexActivo.numero_lote}`
                    : 'Selecciona un lote a la izquierda para ver su historial'}
                </p>
              </div>
            </div>
            {loteKardexActivo && (
              <StatusBadge variant="mint">
                Quedan: {loteKardexActivo.stock_actual} unds
              </StatusBadge>
            )}
          </div>

          <div className="mt-3 max-h-[420px] overflow-x-auto overflow-y-auto rounded-[10px] border border-[#e5e0d8]">
            {loadingKardex ? (
              <p className="py-10 text-center text-[13px] font-medium text-slate">
                Cargando historial del lote...
              </p>
            ) : movimientosKardex.length === 0 ? (
              <p className="py-10 text-center text-[13px] text-slate">
                Selecciona un lote a la izquierda para revisar sus entradas y salidas.
              </p>
            ) : (
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#e5e0d8] bg-[#faf8f5] text-[11px] font-bold uppercase tracking-wider text-slate">
                    <th className="whitespace-nowrap px-3 py-2.5">Fecha y Hora</th>
                    <th className="whitespace-nowrap px-3 py-2.5">Tipo de Operación</th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-right">Cantidad</th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-right">Quedaron</th>
                    <th className="px-3 py-2.5">Detalle / Motivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e0d8] text-[12px]">
                  {movimientosKardex.map((mov) => {
                    const esIngreso = mov.cantidad > 0
                    return (
                      <tr key={mov.id} className="hover:bg-[#f0fdfa]/60">
                        <td className="whitespace-nowrap px-3 py-2.5 text-[11px] font-medium text-slate">
                          {new Date(mov.fecha_hora).toLocaleString('es-PE', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5">
                          <StatusBadge
                            variant={
                              mov.tipo_movimiento === 'COMPRA'
                                ? 'mint'
                                : mov.tipo_movimiento === 'VENTA'
                                  ? 'blue'
                                  : 'tangerine'
                            }
                            withDot={false}
                          >
                            {MOVIMIENTO_AMIGABLE[mov.tipo_movimiento] || mov.tipo_movimiento}
                          </StatusBadge>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right font-geist-mono font-bold">
                          <span
                            className={`inline-flex items-center ${
                              esIngreso ? 'text-[#15803d]' : 'text-[#c2410c]'
                            }`}
                          >
                            {esIngreso ? (
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            ) : (
                              <ArrowDownRight className="h-3.5 w-3.5" />
                            )}
                            {esIngreso ? `+${mov.cantidad}` : mov.cantidad}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right font-geist-mono font-bold text-midnight-ink">
                          {mov.stock_resultante} unds
                        </td>
                        <td className="px-3 py-2.5 text-[12px] font-medium text-slate">
                          {mov.glosa || '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Ingreso de Compra de Lote */}
      <Modal
        isOpen={modalIngresoOpen}
        onClose={() => setModalIngresoOpen(false)}
        title="Registrar Nuevo Lote Recibido"
        subtitle="Ingresa los datos de la mercadería recibida del proveedor o droguería."
      >
        <form onSubmit={handleRegistrarLote} className="space-y-3.5">
          <div>
            <label className="block text-[12px] font-semibold text-midnight-ink">
              Medicamento *
            </label>
            <select
              required
              value={formLote.producto_id}
              onChange={(e) =>
                setFormLote({ ...formLote, producto_id: e.target.value })
              }
              className="mt-1 w-full rounded-[8px] border-2 border-slate-300 bg-canvas-white px-3 py-2 text-[13px]"
            >
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} (Caja de {p.unidades_por_caja} unds)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-midnight-ink">
                Código del Lote *
              </label>
              <input
                type="text"
                required
                value={formLote.numero_lote}
                onChange={(e) =>
                  setFormLote({ ...formLote, numero_lote: e.target.value })
                }
                placeholder="LOT-2026-09A"
                className="mt-1 w-full rounded-[8px] border-2 border-slate-300 bg-canvas-white px-3 py-1.5 font-geist-mono text-[13px]"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-midnight-ink">
                Fecha de Vencimiento *
              </label>
              <input
                type="date"
                required
                value={formLote.fecha_vencimiento}
                onChange={(e) =>
                  setFormLote({ ...formLote, fecha_vencimiento: e.target.value })
                }
                className="mt-1 w-full rounded-[8px] border-2 border-slate-300 bg-canvas-white px-3 py-1.5 font-geist-mono text-[13px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-midnight-ink">
                Cantidad Total de Unidades *
              </label>
              <input
                type="number"
                min={1}
                required
                value={formLote.stock_inicial}
                onChange={(e) =>
                  setFormLote({ ...formLote, stock_inicial: e.target.value })
                }
                className="mt-1 w-full rounded-[8px] border-2 border-slate-300 bg-canvas-white px-3 py-1.5 font-geist-mono text-[13px]"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-midnight-ink">
                Costo de Compra por Unidad (S/) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formLote.costo_compra_unitario}
                onChange={(e) =>
                  setFormLote({
                    ...formLote,
                    costo_compra_unitario: e.target.value,
                  })
                }
                className="mt-1 w-full rounded-[8px] border-2 border-slate-300 bg-canvas-white px-3 py-1.5 font-geist-mono text-[13px]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-midnight-ink">
              Nota o Número de Factura
            </label>
            <input
              type="text"
              value={formLote.glosa}
              onChange={(e) =>
                setFormLote({ ...formLote, glosa: e.target.value })
              }
              className="mt-1 w-full rounded-[8px] border-2 border-slate-300 bg-canvas-white px-3 py-1.5 text-[13px]"
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-[#e5e0d8] pt-3">
            <button
              type="button"
              onClick={() => setModalIngresoOpen(false)}
              className="rounded-[8px] border border-[#e5e0d8] bg-canvas-white px-4 py-2 text-[13px] font-semibold text-midnight-ink hover:bg-[#faf8f5]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={procesando}
              className="rounded-[8px] bg-[#0d9488] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#0f766e] disabled:opacity-50"
            >
              {procesando ? 'Guardando...' : 'Guardar Lote'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Retiro o Ajuste */}
      <Modal
        isOpen={modalAjusteOpen}
        onClose={() => setModalAjusteOpen(false)}
        title={`Retirar o Ajustar Unidades · Lote ${loteParaAjuste?.numero_lote || ''}`}
        subtitle="Registra el motivo por el cual se descuentan unidades de este lote."
      >
        <form onSubmit={handleRegistrarAjuste} className="space-y-3.5">
          <div>
            <label className="block text-[12px] font-semibold text-midnight-ink">
              Motivo del Descuento *
            </label>
            <select
              value={formAjuste.tipo_movimiento}
              onChange={(e) =>
                setFormAjuste({ ...formAjuste, tipo_movimiento: e.target.value })
              }
              className="mt-1 w-full rounded-[8px] border-2 border-slate-300 bg-canvas-white px-3 py-2 text-[13px]"
            >
              <option value="MERMA_VENCIMIENTO">
                Retiro por vencimiento próximo o deterioro
              </option>
              <option value="AJUSTE_INVENTARIO">
                Corrección por conteo físico en estante
              </option>
            </select>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-midnight-ink">
              Cantidad de Unidades a Retirar (Disponibles: {loteParaAjuste?.stock_actual || 0}) *
            </label>
            <input
              type="number"
              min={1}
              max={loteParaAjuste?.stock_actual || 1}
              required
              value={formAjuste.cantidad_unidades}
              onChange={(e) =>
                setFormAjuste({ ...formAjuste, cantidad_unidades: e.target.value })
              }
              className="mt-1 w-full rounded-[8px] border-2 border-slate-300 bg-canvas-white px-3 py-1.5 font-geist-mono text-[13px]"
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-midnight-ink">
              Explicación o Detalle *
            </label>
            <input
              type="text"
              required
              minLength={3}
              value={formAjuste.glosa}
              onChange={(e) =>
                setFormAjuste({ ...formAjuste, glosa: e.target.value })
              }
              placeholder="Ej. Caja dañada o retiro preventivo de mostrador"
              className="mt-1 w-full rounded-[8px] border-2 border-slate-300 bg-canvas-white px-3 py-1.5 text-[13px]"
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-[#e5e0d8] pt-3">
            <button
              type="button"
              onClick={() => setModalAjusteOpen(false)}
              className="rounded-[8px] border border-[#e5e0d8] bg-canvas-white px-4 py-2 text-[13px] font-semibold text-midnight-ink hover:bg-[#faf8f5]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={procesando}
              className="rounded-[8px] bg-[#0d9488] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#0f766e] disabled:opacity-50"
            >
              {procesando ? 'Guardando...' : 'Confirmar Retiro'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
