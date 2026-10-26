import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Banknote,
  CreditCard,
  Smartphone,
  Printer,
  Clock,
  Receipt,
  Sparkles,
  ShoppingBag,
} from 'lucide-react'
import { productosApi, posApi, getErrorMessage } from '../services/api'
import { useBarcodeScanner, useKeyboardShortcuts } from '../hooks'
import { StatusBadge, ThermalTicket } from '../components'

const MEDICAMENTOS_FRECUENTES = [
  { codigo: '7750100000011', nombre: 'Paracetamol 500mg' },
  { codigo: '7750100000028', nombre: 'Amoxicilina 500mg' },
  { codigo: '7750100000035', nombre: 'Ibuprofeno 400mg' },
  { codigo: '7750100000042', nombre: 'Panadol Antigripal' },
  { codigo: '7750100000066', nombre: 'Loratadina 10mg' },
  { codigo: '7750100000080', nombre: 'Ambroxol Jarabe' },
]

const METODOS_PAGO = [
  { id: 'EFECTIVO', label: 'Efectivo', icon: Banknote },
  { id: 'BILLETERA_DIGITAL', label: 'Yape / Plin', icon: Smartphone },
  { id: 'TARJETA', label: 'Tarjeta', icon: CreditCard },
]

const PAGO_AMIGABLE = {
  EFECTIVO: 'Efectivo',
  BILLETERA_DIGITAL: 'Yape / Plin',
  TARJETA: 'Tarjeta',
}

/**
 * Calcula las unidades a descontar y el subtotal según la presentación elegida.
 */
function calcularItemPresentacion(producto, tipoPresentacion, cantidadPresentacion) {
  const cant = Math.max(1, Number(cantidadPresentacion) || 1)
  if (tipoPresentacion === 'CAJA') {
    const precio = Number(producto.precio_venta_caja || 0)
    const unidades = cant * Number(producto.unidades_por_caja || 1)
    return {
      precioUnitario: precio,
      unidadesMinimas: unidades,
      subtotal: +(cant * precio).toFixed(2),
    }
  }
  if (tipoPresentacion === 'BLISTER') {
    const precio = Number(producto.precio_venta_blister || producto.precio_venta_caja || 0)
    const unidades = cant * Number(producto.unidades_por_blister || 10)
    return {
      precioUnitario: precio,
      unidadesMinimas: unidades,
      subtotal: +(cant * precio).toFixed(2),
    }
  }
  const precio = Number(
    producto.precio_venta_unitario ||
      Number(producto.precio_venta_caja || 0) / Number(producto.unidades_por_caja || 1)
  )
  return {
    precioUnitario: +precio.toFixed(2),
    unidadesMinimas: cant,
    subtotal: +(cant * precio).toFixed(2),
  }
}

export function POSPage() {
  const searchInputRef = useRef(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [catalogo, setCatalogo] = useState([])
  const [loadingCatalogo, setLoadingCatalogo] = useState(false)

  // Pedido actual del cliente
  const [carrito, setCarrito] = useState([])
  const [metodoPago, setMetodoPago] = useState('EFECTIVO')
  const [montoRecibido, setMontoRecibido] = useState('')
  const [procesandoVenta, setProcesandoVenta] = useState(false)

  // Mensajes amigables
  const [feedbackError, setFeedbackError] = useState(null)
  const [feedbackSuccess, setFeedbackSuccess] = useState(null)

  // Comprobante emitido e historial reciente
  const [ventaEmitida, setVentaEmitida] = useState(null)
  const [ventasRecientes, setVentasRecientes] = useState([])

  const productosMap = useMemo(() => {
    const map = {}
    catalogo.forEach((p) => {
      map[p.id] = p
    })
    carrito.forEach((item) => {
      map[item.producto.id] = item.producto
    })
    return map
  }, [catalogo, carrito])

  const cargarDatosMostrador = useCallback(async (termino = '') => {
    setLoadingCatalogo(true)
    try {
      const [prods, ventas] = await Promise.all([
        productosApi.listar({ buscar: termino, limit: 60 }),
        posApi.listarVentas({ limit: 6 }),
      ])
      setCatalogo(prods)
      setVentasRecientes(ventas)
    } catch (err) {
      setFeedbackError(getErrorMessage(err))
    } finally {
      setLoadingCatalogo(false)
    }
  }, [])

  useEffect(() => {
    cargarDatosMostrador()
  }, [cargarDatosMostrador])

  // Agregar o incrementar un medicamento en el pedido
  const agregarProductoAlCarrito = useCallback((productoData, presentacionInicial = null) => {
    setFeedbackError(null)
    const presentacionPorDefecto =
      presentacionInicial || (productoData.fraccionable ? 'UNIDAD' : 'CAJA')

    setCarrito((prev) => {
      const idx = prev.findIndex(
        (item) =>
          item.producto.id === productoData.id &&
          item.tipo_presentacion === presentacionPorDefecto
      )
      if (idx >= 0) {
        const actualizado = [...prev]
        actualizado[idx] = {
          ...actualizado[idx],
          producto: { ...actualizado[idx].producto, ...productoData },
          cantidad_presentacion: actualizado[idx].cantidad_presentacion + 1,
        }
        return actualizado
      }
      return [
        ...prev,
        {
          key: `${productoData.id}-${presentacionPorDefecto}`,
          producto: productoData,
          tipo_presentacion: presentacionPorDefecto,
          cantidad_presentacion: 1,
        },
      ]
    })
  }, [])

  // Lectura automática por código de barras
  const procesarCodigoBarras = useCallback(
    async (codigo) => {
      const clean = String(codigo || '').trim()
      if (!clean) return
      setFeedbackError(null)

      try {
        const { producto } = await productosApi.escanearBarcode(clean)
        if (producto.stock_total_vigente <= 0) {
          setFeedbackError(
            `El medicamento "${producto.nombre}" no cuenta con stock disponible en este momento.`
          )
          return
        }
        agregarProductoAlCarrito(producto, 'CAJA')
        setSearchQuery('')
      } catch (err) {
        setFeedbackError(getErrorMessage(err))
      }
    },
    [agregarProductoAlCarrito]
  )

  const { triggerScan } = useBarcodeScanner({
    onScan: procesarCodigoBarras,
    enabled: true,
  })

  // Seleccionar un medicamento de la lista
  const seleccionarProductoCatalogo = async (prod) => {
    try {
      const { producto } = await productosApi.escanearBarcode(prod.codigo_barras)
      if (producto.stock_total_vigente <= 0) {
        setFeedbackError(`"${producto.nombre}" no tiene unidades disponibles para la venta.`)
        return
      }
      agregarProductoAlCarrito(producto, 'CAJA')
    } catch {
      agregarProductoAlCarrito(prod, 'CAJA')
    }
  }

  const cambiarPresentacionItem = (index, nuevaPresentacion) => {
    setCarrito((prev) => {
      const copia = [...prev]
      const actual = copia[index]
      copia[index] = {
        ...actual,
        key: `${actual.producto.id}-${nuevaPresentacion}`,
        tipo_presentacion: nuevaPresentacion,
      }
      return copia
    })
  }

  const cambiarCantidadItem = (index, nuevaCantidad) => {
    const cant = Math.max(1, Number(nuevaCantidad) || 1)
    setCarrito((prev) => {
      const copia = [...prev]
      copia[index] = {
        ...copia[index],
        cantidad_presentacion: cant,
      }
      return copia
    })
  }

  const eliminarItemCarrito = (index) => {
    setCarrito((prev) => prev.filter((_, i) => i !== index))
  }

  const limpiarCarrito = useCallback(() => {
    setCarrito([])
    setMontoRecibido('')
    setFeedbackError(null)
  }, [])

  // Cálculos totales del pedido
  const resumenCarrito = useMemo(() => {
    let totalSoles = 0
    let totalUnidades = 0

    const itemsCalculados = carrito.map((item) => {
      const calc = calcularItemPresentacion(
        item.producto,
        item.tipo_presentacion,
        item.cantidad_presentacion
      )
      totalSoles += calc.subtotal
      totalUnidades += calc.unidadesMinimas
      return {
        ...item,
        ...calc,
      }
    })

    return {
      items: itemsCalculados,
      total: +totalSoles.toFixed(2),
      totalUnidades,
    }
  }, [carrito])

  const vuelto = useMemo(() => {
    const recibido = parseFloat(montoRecibido)
    if (isNaN(recibido) || recibido < resumenCarrito.total) return 0
    return +(recibido - resumenCarrito.total).toFixed(2)
  }, [montoRecibido, resumenCarrito.total])

  // Confirmar y registrar la venta
  const confirmarVenta = useCallback(async () => {
    if (carrito.length === 0 || procesandoVenta) return
    setProcesandoVenta(true)
    setFeedbackError(null)
    setFeedbackSuccess(null)

    try {
      const payload = {
        metodo_pago: metodoPago,
        items: carrito.map((item) => ({
          producto_id: item.producto.id,
          tipo_presentacion: item.tipo_presentacion,
          cantidad_presentacion: item.cantidad_presentacion,
        })),
      }

      const ventaCreada = await posApi.registrarVenta(payload)
      setVentaEmitida(ventaCreada)
      setFeedbackSuccess(
        `¡Venta #${ventaCreada.id} registrada por S/ ${Number(ventaCreada.total).toFixed(2)}!`
      )
      setCarrito([])
      setMontoRecibido('')
      await cargarDatosMostrador(searchQuery)
    } catch (err) {
      setFeedbackError(getErrorMessage(err))
    } finally {
      setProcesandoVenta(false)
    }
  }, [carrito, procesandoVenta, metodoPago, cargarDatosMostrador, searchQuery])

  // Atajos discretos para agilidad en caja
  useKeyboardShortcuts({
    F6: () => searchInputRef.current?.focus(),
    F7: () => {
      setMetodoPago((prev) => {
        const orden = ['EFECTIVO', 'BILLETERA_DIGITAL', 'TARJETA']
        const nextIdx = (orden.indexOf(prev) + 1) % orden.length
        return orden[nextIdx]
      })
    },
    F9: () => limpiarCarrito(),
    F10: () => confirmarVenta(),
  })

  // Un solo buscador inteligente: si es un código numérico y presiona Enter, lo agrega directo
  const handleUnifiedSearchSubmit = (e) => {
    e.preventDefault()
    const q = searchQuery.trim()
    if (!q) return
    if (/^\d{6,14}$/.test(q)) {
      triggerScan(q)
    } else if (catalogo.length === 1) {
      seleccionarProductoCatalogo(catalogo[0])
    } else {
      cargarDatosMostrador(q)
    }
  }

  return (
    <div className="space-y-6">
      {/* Encabezado Cálido y Guiado (Sin siglas técnicas como FEFO o HID) */}
      <div className="rounded-[14px] border border-[#e5e0d8] bg-canvas-white px-6 py-4 shadow-2xs">
        <h1 className="font-satoshi text-[28px] font-bold leading-tight text-midnight-ink">
          Atención y Venta en Mostrador
        </h1>
        <p className="mt-1 text-[14px] text-slate">
          Busca el medicamento por su nombre, principio activo o pásalo por el lector de código de barras para armar el pedido del cliente.
        </p>
      </div>

      {/* Alertas Amigables */}
      {feedbackError && (
        <div className="flex items-center justify-between rounded-[12px] border border-[#fca5a5] bg-[#fee2e2] px-4 py-3 text-[14px] font-medium text-[#b91c1c] shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{feedbackError}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackError(null)}
            className="text-[12px] font-semibold underline"
          >
            Entendido
          </button>
        </div>
      )}

      {feedbackSuccess && (
        <div className="flex items-center justify-between rounded-[12px] border border-[#86efac] bg-[#dcfce7] px-4 py-3 text-[14px] font-medium text-[#15803d] shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{feedbackSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackSuccess(null)}
            className="text-[12px] font-semibold underline"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Grilla Guiada en 2 Pasos Simples: Paso 1 (Catálogo Unificado) y Paso 2 (Pedido del Cliente) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* PASO 1 (7 cols): Buscador Unificado + Lista de Medicamentos */}
        <div className="lg:col-span-7">
          <div className="rounded-[14px] border border-[#e5e0d8] border-t-4 border-t-[#0d9488] bg-canvas-white p-5 shadow-2xs">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#0d9488] text-[12px] font-bold text-white">
                  1
                </span>
                <h2 className="text-[16px] font-bold text-midnight-ink">
                  Buscar o Escanear Medicamento
                </h2>
              </div>
              <span className="text-[12px] text-slate">
                Lector de código de barras listo
              </span>
            </div>

            {/* Barra Única de Búsqueda y Código de Barras */}
            <form onSubmit={handleUnifiedSearchSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-[#0d9488]" />
                <input
                  ref={searchInputRef}
                  data-barcode-input="true"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    cargarDatosMostrador(e.target.value)
                  }}
                  placeholder="Escribe el nombre (ej. Paracetamol, Ibuprofeno) o escanea el código..."
                  className="w-full rounded-[10px] border-2 border-[#cbd5e1] bg-[#faf8f5] py-2.5 pl-10 pr-4 text-[14px] font-medium text-midnight-ink placeholder:text-steel focus:border-[#0d9488] focus:bg-white focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="shrink-0 whitespace-nowrap rounded-[10px] bg-[#0d9488] px-4 py-2.5 text-[14px] font-semibold text-white shadow-2xs transition hover:bg-[#0f766e]"
              >
                Buscar
              </button>
            </form>

            {/* Accesos rápidos a medicamentos frecuentes */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate">
                <Sparkles className="h-3 w-3 text-[#d97706]" />
                Más pedidos:
              </span>
              {MEDICAMENTOS_FRECUENTES.map((item) => (
                <button
                  key={item.codigo}
                  type="button"
                  onClick={() => triggerScan(item.codigo)}
                  className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-[#ccfbf1] bg-[#f0fdfa] px-3 py-1 text-[11.5px] font-semibold text-[#0f766e] transition hover:bg-[#0d9488] hover:text-white"
                  title={`Agregar ${item.nombre} al pedido`}
                >
                  <span>+ {item.nombre}</span>
                </button>
              ))}
            </div>

            {/* Tabla Limpia de Medicamentos */}
            <div className="mt-4 max-h-[450px] overflow-x-auto overflow-y-auto rounded-[10px] border border-[#e5e0d8]">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#e5e0d8] bg-[#faf8f5] text-[11px] font-bold uppercase tracking-wider text-slate">
                    <th className="px-3.5 py-2.5">Medicamento / Laboratorio</th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-right">Por Caja</th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-right">Por Blíster</th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-right">Por Unidad</th>
                    <th className="whitespace-nowrap px-3.5 py-2.5 text-right">Agregar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e0d8] text-[13px]">
                  {loadingCatalogo ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center font-medium text-slate">
                        Cargando lista de medicamentos...
                      </td>
                    </tr>
                  ) : catalogo.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate">
                        No se encontraron medicamentos con ese nombre.
                      </td>
                    </tr>
                  ) : (
                    catalogo.map((prod) => (
                      <tr
                        key={prod.id}
                        className="group transition hover:bg-[#f0fdfa]/70"
                      >
                        <td className="px-3.5 py-3">
                          <div className="font-bold text-midnight-ink">
                            {prod.nombre}
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11.5px] text-slate">
                            <span>{prod.principio_activo || 'Genérico'}</span>
                            <span>· {prod.laboratorio || 'Laboratorio'}</span>
                            <span className="font-semibold text-[#0d9488]">
                              (Caja de {prod.unidades_por_caja} unds)
                            </span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-right font-geist-mono text-[13px] font-bold text-midnight-ink">
                          S/ {Number(prod.precio_venta_caja).toFixed(2)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-right font-geist-mono text-[13px] font-semibold text-[#0f766e]">
                          {prod.precio_venta_blister
                            ? `S/ ${Number(prod.precio_venta_blister).toFixed(2)}`
                            : '—'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-right font-geist-mono text-[13px] font-semibold text-[#15803d]">
                          {prod.precio_venta_unitario
                            ? `S/ ${Number(prod.precio_venta_unitario).toFixed(2)}`
                            : '—'}
                        </td>
                        <td className="whitespace-nowrap px-3.5 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => seleccionarProductoCatalogo(prod)}
                            className="inline-flex items-center gap-1 whitespace-nowrap rounded-[8px] border border-[#99f6e4] bg-[#f0fdfa] px-3 py-1.5 text-[12px] font-semibold text-[#0f766e] transition hover:bg-[#0d9488] hover:text-white"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Agregar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* PASO 2 (5 cols): Pedido del Cliente y Cobro */}
        <div className="space-y-4 lg:col-span-5">
          <div className="rounded-[14px] border border-[#e5e0d8] border-t-4 border-t-[#15803d] bg-canvas-white p-5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-[#e5e0d8] pb-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#15803d] text-[12px] font-bold text-white">
                  2
                </span>
                <div>
                  <h2 className="text-[16px] font-bold text-midnight-ink">
                    Pedido del Cliente
                  </h2>
                  <p className="text-[12px] text-slate">
                    {resumenCarrito.items.length} medicamento(s) ·{' '}
                    <span className="font-semibold text-[#0d9488]">
                      {resumenCarrito.totalUnidades} unidades en total
                    </span>
                  </p>
                </div>
              </div>
              {carrito.length > 0 && (
                <button
                  type="button"
                  onClick={limpiarCarrito}
                  className="inline-flex items-center gap-1 whitespace-nowrap rounded-[8px] border border-[#fca5a5] bg-[#fef2f2] px-2.5 py-1 text-[12px] font-semibold text-[#b91c1c] hover:bg-[#fee2e2]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Limpiar
                </button>
              )}
            </div>

            {/* Lista de Medicamentos en el Pedido */}
            <div className="my-3.5 max-h-[320px] space-y-2.5 overflow-y-auto pr-1">
              {resumenCarrito.items.length === 0 ? (
                <div className="rounded-[12px] border-2 border-dashed border-[#e5e0d8] bg-[#faf8f5] py-10 text-center">
                  <ShoppingBag className="mx-auto h-8 w-8 text-[#0d9488]/60" />
                  <p className="mt-2 text-[14px] font-semibold text-slate">
                    Aún no has agregado medicamentos
                  </p>
                  <p className="mt-0.5 px-4 text-[12px] text-steel">
                    Haz clic en el botón &ldquo;+ Agregar&rdquo; de la lista izquierda o usa el lector de código de barras.
                  </p>
                </div>
              ) : (
                resumenCarrito.items.map((item, idx) => {
                  const prod = item.producto
                  return (
                    <div
                      key={item.key}
                      className="rounded-[12px] border border-[#e5e0d8] bg-[#faf8f5] p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-[14px] font-bold text-midnight-ink">
                            {prod.nombre}
                          </div>
                          {prod.lote_fefo_numero && (
                            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                              <span className="whitespace-nowrap rounded-full border border-[#86efac] bg-[#dcfce7] px-2.5 py-0.5 font-semibold text-[#15803d]">
                                Lote a entregar: {prod.lote_fefo_numero} (Vence: {prod.proximo_vencimiento})
                              </span>
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => eliminarItemCarrito(idx)}
                          className="rounded-[6px] p-1 text-slate hover:bg-[#fee2e2] hover:text-[#dc2626]"
                          title="Quitar medicamento"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Selector de Presentación y Cantidad */}
                      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-[#e5e0d8] pt-2.5">
                        <div className="inline-flex rounded-[8px] border border-[#e5e0d8] bg-canvas-white p-0.5">
                          <button
                            type="button"
                            onClick={() => cambiarPresentacionItem(idx, 'CAJA')}
                            className={`rounded-[6px] px-2.5 py-1 text-[11.5px] font-semibold transition ${
                              item.tipo_presentacion === 'CAJA'
                                ? 'bg-[#0d9488] text-white shadow-2xs'
                                : 'text-slate hover:text-midnight-ink'
                            }`}
                          >
                            Caja
                          </button>
                          <button
                            type="button"
                            disabled={!prod.fraccionable || !prod.precio_venta_blister}
                            onClick={() => cambiarPresentacionItem(idx, 'BLISTER')}
                            className={`rounded-[6px] px-2.5 py-1 text-[11.5px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-35 ${
                              item.tipo_presentacion === 'BLISTER'
                                ? 'bg-[#0d9488] text-white shadow-2xs'
                                : 'text-slate hover:text-midnight-ink'
                            }`}
                          >
                            Blíster
                          </button>
                          <button
                            type="button"
                            disabled={!prod.fraccionable}
                            onClick={() => cambiarPresentacionItem(idx, 'UNIDAD')}
                            className={`rounded-[6px] px-2.5 py-1 text-[11.5px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-35 ${
                              item.tipo_presentacion === 'UNIDAD'
                                ? 'bg-[#0d9488] text-white shadow-2xs'
                                : 'text-slate hover:text-midnight-ink'
                            }`}
                          >
                            Unidad
                          </button>
                        </div>

                        {/* Cantidad */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              cambiarCantidadItem(idx, item.cantidad_presentacion - 1)
                            }
                            className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] border border-[#cbd5e1] bg-canvas-white text-midnight-ink transition hover:bg-paper-mist"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <input
                            type="number"
                            min={1}
                            value={item.cantidad_presentacion}
                            onChange={(e) => cambiarCantidadItem(idx, e.target.value)}
                            className="h-8 w-16 [appearance:textfield] rounded-[6px] border-2 border-[#0d9488] bg-canvas-white px-2 text-center font-geist-mono text-[14px] font-bold text-midnight-ink focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              cambiarCantidadItem(idx, item.cantidad_presentacion + 1)
                            }
                            className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] border border-[#cbd5e1] bg-canvas-white text-midnight-ink transition hover:bg-paper-mist"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Subtotal */}
                        <div className="whitespace-nowrap text-right">
                          <div className="font-geist-mono text-[15px] font-bold text-midnight-ink">
                            S/ {item.subtotal.toFixed(2)}
                          </div>
                          <div className="text-[11px] font-medium text-[#0f766e]">
                            {item.unidadesMinimas} unds
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Medio de Pago */}
            <div className="border-t border-[#e5e0d8] pt-3">
              <span className="text-[11.5px] font-bold uppercase tracking-wider text-slate">
                Selecciona cómo paga el cliente
              </span>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {METODOS_PAGO.map((mp) => {
                  const Icon = mp.icon
                  const activo = metodoPago === mp.id
                  return (
                    <button
                      key={mp.id}
                      type="button"
                      onClick={() => setMetodoPago(mp.id)}
                      className={`flex flex-col items-center justify-center gap-1 rounded-[10px] border-2 p-2.5 text-[12.5px] font-semibold transition ${
                        activo
                          ? 'border-[#0d9488] bg-[#f0fdfa] text-[#0f766e] shadow-2xs'
                          : 'border-[#e5e0d8] bg-canvas-white text-slate hover:bg-[#faf8f5]'
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 ${
                          activo ? 'text-[#0d9488]' : 'text-slate'
                        }`}
                      />
                      <span className="whitespace-nowrap">{mp.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Calculadora de Vuelto para Efectivo */}
            {metodoPago === 'EFECTIVO' && resumenCarrito.total > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-3 rounded-[10px] border border-[#86efac] bg-[#f0fdf4] p-3">
                <div>
                  <label className="block text-[11.5px] font-semibold text-[#15803d]">
                    ¿Con cuánto paga? (S/)
                  </label>
                  <input
                    type="number"
                    step="0.10"
                    value={montoRecibido}
                    onChange={(e) => setMontoRecibido(e.target.value)}
                    placeholder={resumenCarrito.total.toFixed(2)}
                    className="mt-1 w-full rounded-[6px] border-2 border-[#16a34a] bg-canvas-white px-2.5 py-1 font-geist-mono text-[14px] font-bold text-midnight-ink focus:outline-none"
                  />
                </div>
                <div className="flex flex-col justify-between text-right">
                  <span className="text-[11.5px] font-semibold text-[#15803d]">
                    Vuelto a entregar
                  </span>
                  <span className="whitespace-nowrap font-geist-mono text-[18px] font-bold text-[#15803d]">
                    S/ {vuelto.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Total y Botón Principal de Venta */}
            <div className="mt-4 border-t border-[#e5e0d8] pt-3">
              <div className="flex items-baseline justify-between rounded-[10px] bg-[#faf8f5] px-4 py-2.5">
                <span className="text-[14px] font-bold uppercase tracking-wide text-slate">
                  Total a Cobrar
                </span>
                <span className="whitespace-nowrap font-geist-mono text-[28px] font-bold tracking-tight text-midnight-ink">
                  S/ {resumenCarrito.total.toFixed(2)}
                </span>
              </div>

              <button
                type="button"
                disabled={carrito.length === 0 || procesandoVenta}
                onClick={confirmarVenta}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#0d9488] px-4 py-3 text-[15px] font-semibold text-white shadow-sm transition hover:bg-[#0f766e] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Receipt className="h-5 w-5" />
                <span>
                  {procesandoVenta
                    ? 'Registrando venta...'
                    : 'Confirmar Venta e Imprimir Comprobante'}
                </span>
              </button>
            </div>
          </div>

          {/* Últimas Ventas Realizadas */}
          <div className="rounded-[14px] border border-[#e5e0d8] bg-canvas-white p-4 shadow-2xs">
            <div className="flex items-center justify-between border-b border-[#e5e0d8] pb-2.5">
              <span className="flex items-center gap-1.5 text-[13px] font-bold text-midnight-ink">
                <Clock className="h-4 w-4 text-[#0d9488]" />
                Ventas Recientes en Mostrador
              </span>
              <span className="text-[11px] font-medium text-slate">
                Reimprimir boleta
              </span>
            </div>

            <div className="mt-2 divide-y divide-[#e5e0d8] text-[12px]">
              {ventasRecientes.length === 0 ? (
                <p className="py-4 text-center text-steel">
                  Aún no hay ventas registradas hoy.
                </p>
              ) : (
                ventasRecientes.slice(0, 5).map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between py-2.5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-geist-mono font-bold text-midnight-ink">
                        #{String(v.id).padStart(5, '0')}
                      </span>
                      <span className="text-slate">
                        {new Date(v.fecha_hora).toLocaleTimeString('es-PE', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <StatusBadge
                        variant={
                          v.metodo_pago === 'EFECTIVO'
                            ? 'mint'
                            : v.metodo_pago === 'BILLETERA_DIGITAL'
                              ? 'lavender'
                              : 'blue'
                        }
                        withDot={false}
                      >
                        {PAGO_AMIGABLE[v.metodo_pago] || v.metodo_pago}
                      </StatusBadge>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="whitespace-nowrap font-geist-mono text-[13px] font-bold text-midnight-ink">
                        S/ {Number(v.total).toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setVentaEmitida(v)}
                        className="inline-flex items-center gap-1 whitespace-nowrap rounded-[6px] border border-[#99f6e4] bg-[#f0fdfa] px-2.5 py-1 text-[11px] font-semibold text-[#0f766e] hover:bg-[#0d9488] hover:text-white"
                      >
                        <Printer className="h-3 w-3" />
                        Boleta
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Comprobante Térmico */}
      {ventaEmitida && (
        <ThermalTicket
          venta={ventaEmitida}
          productosMap={productosMap}
          onClose={() => setVentaEmitida(null)}
        />
      )}
    </div>
  )
}
