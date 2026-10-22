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

export function LotesKardexPage() {
  const [searchParams] = useSearchParams()
  const preselectedProdId = searchParams.get('producto_id')
  const preselectedUnits = searchParams.get('unidades')

  const [productos, setProductos] = useState([])
  const [productoSeleccionadoId, setProductoSeleccionadoId] = useState('')
  const [lotesProducto, setLotesProducto] = useState([])
  const [alertasVencimiento, setAlertasVencimiento] = useState([])
  const [diasUmbral, setDiasUmbral] = useState(90)

  // Kardex del lote seleccionado
  const [loteKardexActivo, setLoteKardexActivo] = useState(null)
  const [movimientosKardex, setMovimientosKardex] = useState([])
  const [loadingKardex, setLoadingKardex] = useState(false)

  // Modales: Ingreso de Compra de Lote y Ajuste/Merma
  const [modalIngresoOpen, setModalIngresoOpen] = useState(false)
  const [modalAjusteOpen, setModalAjusteOpen] = useState(false)
  const [loteParaAjuste, setLoteParaAjuste] = useState(null)

  const [formLote, setFormLote] = useState({
    producto_id: '',
    numero_lote: '',
    fecha_vencimiento: '',
    stock_inicial: 100,
    costo_compra_unitario: '0.15',
    glosa: 'Ingreso por compra a droguería',
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
        glosa: 'Orden de reposición sugerida por Motor ML (15d)',
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
        `Lote ${nuevo.numero_lote} ingresado (+${nuevo.stock_inicial} u.mín) con asiento COMPRA en el Kardex.`
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
      glosa: `Retiro de mostrador del lote ${lote.numero_lote}`,
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
        `Movimiento ${formAjuste.tipo_movimiento} registrado en el Lote ${actualizado.numero_lote}. Stock resultante: ${actualizado.stock_actual} u.mín.`
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
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[12px] border border-ash bg-canvas-white px-5 py-4 shadow-xs">
        <div>
          <h1 className="font-satoshi text-[30px] font-bold leading-[1.15] text-midnight-ink">
            Control de Lotes FEFO y Kardex Inmutable
          </h1>
          <p className="mt-1 text-[14px] text-slate">
            Trazabilidad por lote y fecha de vencimiento. Ningún stock se modifica sin asiento auditable en el Kardex.
          </p>
        </div>

        <button
          type="button"
          onClick={abrirModalIngreso}
          className="inline-flex items-center gap-2 whitespace-nowrap rounded-[8px] bg-electric-blue px-4 py-2 text-[14px] font-semibold text-canvas-white shadow-xs hover:bg-deep-sapphire"
        >
          <Plus className="h-4 w-4" />
          Registrar Compra de Lote
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
            className="font-geist-mono text-[12px] font-semibold underline"
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
            className="font-geist-mono text-[12px] font-semibold underline"
          >
            OK
          </button>
        </div>
      )}

      {/* Tarjeta de Alertas de Vencimiento Próximo */}
      <div className="rounded-[12px] border border-ash border-l-4 border-l-tangerine bg-canvas-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ash pb-3">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-tangerine" />
            <div>
              <h2 className="text-[16px] font-bold text-midnight-ink">
                Semáforo de Alertas de Vencimiento FEFO
              </h2>
              <p className="text-[12px] text-slate">
                Lotes activos con stock disponible que vencen en los próximos {diasUmbral} días
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {[30, 60, 90, 180, 365].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDiasUmbral(d)}
                className={`rounded-full px-3 py-1 font-geist-mono text-[12px] font-semibold transition ${
                  diasUmbral === d
                    ? 'bg-electric-blue text-canvas-white shadow-2xs'
                    : 'border border-ash bg-paper-mist text-slate hover:text-midnight-ink'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {alertasVencimiento.length === 0 ? (
            <div className="col-span-full py-4 text-center text-[13px] text-slate">
              No hay lotes en riesgo de vencimiento dentro del umbral de {diasUmbral} días.
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
                  className="cursor-pointer rounded-[12px] border border-ash bg-[#f8fafc] p-3 transition hover:border-tangerine hover:bg-[#fff7ed]"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-geist-mono text-[12px] font-bold text-midnight-ink">
                      {lote.numero_lote}
                    </span>
                    <StatusBadge
                      variant={diasRestantes <= 30 ? 'danger' : 'tangerine'}
                      mono
                    >
                      {diasRestantes} días
                    </StatusBadge>
                  </div>
                  <div className="mt-1 truncate text-[13px] font-semibold text-midnight-ink">
                    {prod?.nombre || `Producto #${lote.producto_id}`}
                  </div>
                  <div className="mt-1.5 flex items-center justify-between font-geist-mono text-[11px] text-slate">
                    <span>Vence: {lote.fecha_vencimiento}</span>
                    <span className="font-bold text-midnight-ink">
                      Stock: {lote.stock_actual}u
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Grilla: Cola de Lotes FEFO por Producto (Izquierda) y Auditoría Kardex Inmutable (Derecha) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Cola FEFO del Medicamento (6 cols) */}
        <div className="rounded-[12px] border border-ash bg-canvas-white p-4 shadow-xs lg:col-span-6">
          <div className="border-b border-ash pb-3">
            <label className="block text-[12px] font-bold uppercase tracking-wider text-slate">
              Seleccionar Medicamento para Inspección FEFO
            </label>
            <select
              value={productoSeleccionadoId}
              onChange={(e) => setProductoSeleccionadoId(e.target.value)}
              className="mt-1.5 w-full rounded-[8px] border-2 border-slate-300 bg-canvas-white px-3 py-2 text-[14px] font-semibold text-midnight-ink focus:border-electric-blue focus:outline-none"
            >
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} ({p.codigo_barras})
                </option>
              ))}
            </select>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[14px] font-bold text-midnight-ink">
              <Layers className="h-4 w-4 text-electric-blue" />
              Cola de Despacho FEFO (Orden de Vencimiento)
            </span>
            <span className="font-geist-mono text-[11px] font-semibold text-slate">
              {lotesProducto.length} lotes vigentes
            </span>
          </div>

          <div className="mt-3 space-y-2.5">
            {lotesProducto.length === 0 ? (
              <div className="rounded-[12px] border border-dashed border-ash py-8 text-center text-[13px] text-slate">
                Este medicamento no tiene lotes vigentes con stock.
              </div>
            ) : (
              lotesProducto.map((lote, index) => {
                const esPrioridadFefo = index === 0
                const seleccionado = loteKardexActivo?.id === lote.id
                return (
                  <div
                    key={lote.id}
                    onClick={() => verKardexDeLote(lote)}
                    className={`cursor-pointer rounded-[12px] border-2 p-3.5 transition ${
                      seleccionado
                        ? 'border-electric-blue bg-[#eff6ff]'
                        : 'border-ash bg-canvas-white hover:bg-paper-mist'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-geist-mono text-[14px] font-bold text-midnight-ink">
                          {lote.numero_lote}
                        </span>
                        {esPrioridadFefo ? (
                          <StatusBadge variant="mint" mono>
                            1° EN SALIR (FEFO ACTIVO)
                          </StatusBadge>
                        ) : (
                          <StatusBadge variant="neutral" mono withDot={false}>
                            #{index + 1} En Cola
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
                        Merma / Ajuste
                      </button>
                    </div>

                    <div className="mt-2 grid grid-cols-3 gap-2 font-geist-mono text-[12px]">
                      <div>
                        <span className="block text-[10px] font-bold text-slate">VENCIMIENTO</span>
                        <span className="font-semibold text-midnight-ink">
                          {lote.fecha_vencimiento}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold text-slate">STOCK ACTUAL</span>
                        <span className="font-bold text-electric-blue">
                          {lote.stock_actual} / {lote.stock_inicial} u.mín
                        </span>
                      </div>
                      <div className="whitespace-nowrap text-right">
                        <span className="block text-[10px] font-bold text-slate">COSTO UNIT.</span>
                        <span className="font-bold text-midnight-ink">
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

        {/* Visor de Kardex Inmutable por Lote (6 cols) */}
        <div className="rounded-[12px] border border-ash bg-canvas-white p-4 shadow-xs lg:col-span-6">
          <div className="flex items-center justify-between border-b border-ash pb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-electric-blue" />
              <div>
                <h2 className="text-[16px] font-bold text-midnight-ink">
                  Libro Kardex Inmutable
                </h2>
                <p className="font-geist-mono text-[12px] text-slate">
                  {loteKardexActivo
                    ? `Auditoría de movimientos · Lote ${loteKardexActivo.numero_lote}`
                    : 'Seleccione un lote para inspeccionar su Kardex'}
                </p>
              </div>
            </div>
            {loteKardexActivo && (
              <StatusBadge variant="blue" mono>
                Saldo: {loteKardexActivo.stock_actual} u.mín
              </StatusBadge>
            )}
          </div>

          <div className="mt-3 max-h-[420px] overflow-x-auto overflow-y-auto rounded-[8px] border border-ash">
            {loadingKardex ? (
              <p className="py-10 text-center text-[13px] font-medium text-slate">
                Cargando asientos del Kardex...
              </p>
            ) : movimientosKardex.length === 0 ? (
              <p className="py-10 text-center text-[13px] text-slate">
                Seleccione un lote activo a la izquierda para auditar sus movimientos.
              </p>
            ) : (
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-ash bg-paper-mist text-[11px] font-bold uppercase tracking-wider text-slate">
                    <th className="whitespace-nowrap px-3 py-2">Fecha / Hora</th>
                    <th className="whitespace-nowrap px-3 py-2">Movimiento</th>
                    <th className="whitespace-nowrap px-3 py-2 text-right">Cant.</th>
                    <th className="whitespace-nowrap px-3 py-2 text-right">Saldo</th>
                    <th className="px-3 py-2">Glosa / Referencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ash text-[12px]">
                  {movimientosKardex.map((mov) => {
                    const esIngreso = mov.cantidad > 0
                    return (
                      <tr key={mov.id} className="hover:bg-[#eff6ff]/60">
                        <td className="whitespace-nowrap px-3 py-2.5 font-geist-mono text-[11px] font-medium text-slate">
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
                            mono
                            withDot={false}
                          >
                            {mov.tipo_movimiento}
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
                          {mov.stock_resultante}
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
        title="Registrar Ingreso de Lote (Compra)"
        subtitle="Inserta un nuevo lote con fecha de vencimiento y genera automáticamente el asiento COMPRA en el Kardex."
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
              className="mt-1 w-full rounded-[6px] border-2 border-slate-300 bg-canvas-white px-3 py-2 text-[13px]"
            >
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} ({p.unidades_por_caja} u/caja)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-midnight-ink">
                Número de Lote *
              </label>
              <input
                type="text"
                required
                value={formLote.numero_lote}
                onChange={(e) =>
                  setFormLote({ ...formLote, numero_lote: e.target.value })
                }
                placeholder="LOT-2026-09A"
                className="mt-1 w-full rounded-[6px] border-2 border-slate-300 bg-canvas-white px-3 py-1.5 font-geist-mono text-[13px]"
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
                className="mt-1 w-full rounded-[6px] border-2 border-slate-300 bg-canvas-white px-3 py-1.5 font-geist-mono text-[13px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-midnight-ink">
                Stock Inicial (en Unidades Mínimas) *
              </label>
              <input
                type="number"
                min={1}
                required
                value={formLote.stock_inicial}
                onChange={(e) =>
                  setFormLote({ ...formLote, stock_inicial: e.target.value })
                }
                className="mt-1 w-full rounded-[6px] border-2 border-slate-300 bg-canvas-white px-3 py-1.5 font-geist-mono text-[13px]"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-midnight-ink">
                Costo Compra Unitario (S/) *
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
                className="mt-1 w-full rounded-[6px] border-2 border-slate-300 bg-canvas-white px-3 py-1.5 font-geist-mono text-[13px]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-midnight-ink">
              Glosa de Auditoría Kardex
            </label>
            <input
              type="text"
              value={formLote.glosa}
              onChange={(e) =>
                setFormLote({ ...formLote, glosa: e.target.value })
              }
              className="mt-1 w-full rounded-[6px] border-2 border-slate-300 bg-canvas-white px-3 py-1.5 text-[13px]"
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-ash pt-3">
            <button
              type="button"
              onClick={() => setModalIngresoOpen(false)}
              className="rounded-[8px] border border-ash bg-canvas-white px-4 py-2 text-[13px] font-semibold text-midnight-ink hover:bg-paper-mist"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={procesando}
              className="rounded-[8px] bg-electric-blue px-4 py-2 text-[13px] font-semibold text-canvas-white hover:bg-deep-sapphire disabled:opacity-50"
            >
              {procesando ? 'Registrando...' : 'Ingresar Lote al Kardex'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Merma por Vencimiento o Ajuste de Inventario */}
      <Modal
        isOpen={modalAjusteOpen}
        onClose={() => setModalAjusteOpen(false)}
        title={`Ajustar Stock · Lote ${loteParaAjuste?.numero_lote || ''}`}
        subtitle="Todo descuento por merma o ajuste genera un asiento auditable e inmutable en el Kardex."
      >
        <form onSubmit={handleRegistrarAjuste} className="space-y-3.5">
          <div>
            <label className="block text-[12px] font-semibold text-midnight-ink">
              Tipo de Movimiento Kardex *
            </label>
            <select
              value={formAjuste.tipo_movimiento}
              onChange={(e) =>
                setFormAjuste({ ...formAjuste, tipo_movimiento: e.target.value })
              }
              className="mt-1 w-full rounded-[6px] border-2 border-slate-300 bg-canvas-white px-3 py-2 font-geist-mono text-[13px]"
            >
              <option value="MERMA_VENCIMIENTO">
                MERMA_VENCIMIENTO (Baja por deterioro o vencimiento próximo)
              </option>
              <option value="AJUSTE_INVENTARIO">
                AJUSTE_INVENTARIO (Cuadre de arqueo físico)
              </option>
            </select>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-midnight-ink">
              Unidades Mínimas a Descontar (Disponible: {loteParaAjuste?.stock_actual || 0}) *
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
              className="mt-1 w-full rounded-[6px] border-2 border-slate-300 bg-canvas-white px-3 py-1.5 font-geist-mono text-[13px]"
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-midnight-ink">
              Glosa / Motivo Obligatorio *
            </label>
            <input
              type="text"
              required
              minLength={3}
              value={formAjuste.glosa}
              onChange={(e) =>
                setFormAjuste({ ...formAjuste, glosa: e.target.value })
              }
              placeholder="Ej. Retiro de blíster deteriorado en inspección sanitaria"
              className="mt-1 w-full rounded-[6px] border-2 border-slate-300 bg-canvas-white px-3 py-1.5 text-[13px]"
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-ash pt-3">
            <button
              type="button"
              onClick={() => setModalAjusteOpen(false)}
              className="rounded-[8px] border border-ash bg-canvas-white px-4 py-2 text-[13px] font-semibold text-midnight-ink hover:bg-paper-mist"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={procesando}
              className="rounded-[8px] bg-electric-blue px-4 py-2 text-[13px] font-semibold text-canvas-white hover:bg-deep-sapphire disabled:opacity-50"
            >
              {procesando ? 'Procesando...' : 'Confirmar Descuento Auditado'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
