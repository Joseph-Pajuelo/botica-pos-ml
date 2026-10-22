import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  ScanBarcode,
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
  Zap,
  Receipt,
} from 'lucide-react'
import { productosApi, posApi, getErrorMessage } from '../services/api'
import { useBarcodeScanner, useKeyboardShortcuts } from '../hooks'
import { StatusBadge, ThermalTicket } from '../components'

const CODIGOS_RAPIDOS_DEMO = [
  { codigo: '7750100000011', nombre: 'Paracetamol 500mg' },
  { codigo: '7750100000028', nombre: 'Amoxicilina 500mg' },
  { codigo: '7750100000035', nombre: 'Ibuprofeno 400mg' },
  { codigo: '7750100000042', nombre: 'Panadol Antigripal' },
  { codigo: '7750100000066', nombre: 'Loratadina 10mg' },
  { codigo: '7750100000080', nombre: 'Ambroxol Jbe' },
]

const METODOS_PAGO = [
  { id: 'EFECTIVO', label: 'Efectivo', icon: Banknote },
  { id: 'BILLETERA_DIGITAL', label: 'Yape / Plin', icon: Smartphone },
  { id: 'TARJETA', label: 'Tarjeta POS', icon: CreditCard },
]

/**
 * Calcula las unidades mínimas a descontar del lote FEFO y el subtotal según la presentación.
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
  // UNIDAD
  const precio = Number(
    producto.precio_venta_unitario ||
      (Number(producto.precio_venta_caja || 0) / Number(producto.unidades_por_caja || 1))
  )
  return {
    precioUnitario: +precio.toFixed(2),
    unidadesMinimas: cant,
    subtotal: +(cant * precio).toFixed(2),
  }
}

export function POSPage({ onBarcodeEvent }) {
  const barcodeInputRef = useRef(null)
  const [barcodeInput, setBarcodeInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [catalogo, setCatalogo] = useState([])
  const [loadingCatalogo, setLoadingCatalogo] = useState(false)

  // Carrito de compras FEFO
  const [carrito, setCarrito] = useState([])
  const [metodoPago, setMetodoPago] = useState('EFECTIVO')
  const [montoRecibido, setMontoRecibido] = useState('')
  const [procesandoVenta, setProcesandoVenta] = useState(false)

  // Estado de respuesta del lector HID (<100ms)
  const [lastScanLatency, setLastScanLatency] = useState(null)
  const [lastScannedProduct, setLastScannedProduct] = useState(null)
  const [feedbackError, setFeedbackError] = useState(null)
  const [feedbackSuccess, setFeedbackSuccess] = useState(null)

  // Ticket emitido e historial reciente
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
        posApi.listarVentas({ limit: 8 }),
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

  // Agregar o incrementar un producto en el carrito validando lote FEFO
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

  // Escaneo directo por código de barras (USB HID o simulador)
  const procesarCodigoBarras = useCallback(
    async (codigo) => {
      const clean = String(codigo || '').trim()
      if (!clean) return
      setFeedbackError(null)

      try {
        const { producto, latencyMs } = await productosApi.escanearBarcode(clean)
        setLastScanLatency(latencyMs)
        setLastScannedProduct(producto)
        onBarcodeEvent?.(clean)

        if (producto.stock_total_vigente <= 0) {
          setFeedbackError(
            `El producto "${producto.nombre}" (${clean}) no tiene lotes FEFO vigentes con stock disponible.`
          )
          return
        }

        agregarProductoAlCarrito(producto, 'CAJA')
        setBarcodeInput('')
      } catch (err) {
        setFeedbackError(getErrorMessage(err))
      }
    },
    [agregarProductoAlCarrito, onBarcodeEvent]
  )

  // Hook global para lector USB HID
  const { triggerScan } = useBarcodeScanner({
    onScan: procesarCodigoBarras,
    enabled: true,
  })

  // Seleccionar un producto desde el listado de búsqueda enriqueciéndolo con su info FEFO
  const seleccionarProductoCatalogo = async (prod) => {
    try {
      const { producto, latencyMs } = await productosApi.escanearBarcode(prod.codigo_barras)
      setLastScanLatency(latencyMs)
      setLastScannedProduct(producto)
      if (producto.stock_total_vigente <= 0) {
        setFeedbackError(
          `"${producto.nombre}" tiene 0 unidades disponibles en lotes vigentes FEFO.`
        )
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

  // Cálculos totales del carrito
  const resumenCarrito = useMemo(() => {
    let totalSoles = 0
    let totalUnidadesMinimas = 0

    const itemsCalculados = carrito.map((item) => {
      const calc = calcularItemPresentacion(
        item.producto,
        item.tipo_presentacion,
        item.cantidad_presentacion
      )
      totalSoles += calc.subtotal
      totalUnidadesMinimas += calc.unidadesMinimas
      return {
        ...item,
        ...calc,
      }
    })

    return {
      items: itemsCalculados,
      total: +totalSoles.toFixed(2),
      totalUnidadesMinimas,
    }
  }, [carrito])

  const vuelto = useMemo(() => {
    const recibido = parseFloat(montoRecibido)
    if (isNaN(recibido) || recibido < resumenCarrito.total) return 0
    return +(recibido - resumenCarrito.total).toFixed(2)
  }, [montoRecibido, resumenCarrito.total])

  // Procesar Venta Transaccional FEFO
  const confirmarVentaFEFO = useCallback(async () => {
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
        `Venta FEFO #${ventaCreada.id} procesada por S/ ${Number(ventaCreada.total).toFixed(2)}`
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

  // Atajos de teclado de mostrador (F6, F7, F9, F10)
  useKeyboardShortcuts({
    F6: () => barcodeInputRef.current?.focus(),
    F7: () => {
      setMetodoPago((prev) => {
        const orden = ['EFECTIVO', 'BILLETERA_DIGITAL', 'TARJETA']
        const nextIdx = (orden.indexOf(prev) + 1) % orden.length
        return orden[nextIdx]
      })
    },
    F9: () => limpiarCarrito(),
    F10: () => confirmarVentaFEFO(),
  })

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    cargarDatosMostrador(searchQuery)
  }

  const handleBarcodeFormSubmit = (e) => {
    e.preventDefault()
    if (barcodeInput.trim()) {
      triggerScan(barcodeInput.trim())
    }
  }

  return (
    <div className="space-y-6">
      {/* Encabezado con alto contraste */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[12px] border border-ash bg-canvas-white px-5 py-4 shadow-xs">
        <div>
          <h1 className="font-satoshi text-[30px] font-bold leading-[1.15] text-midnight-ink">
            Punto de Venta Farmacéutico (FEFO)
          </h1>
          <p className="mt-1 text-[14px] text-slate">
            Despacho rápido con descuento automático del lote próximo a vencer y fraccionamiento por presentación.
          </p>
        </div>

        {/* Barra de Atajos Rápidos (Geist Mono) */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[#93c5fd] bg-[#eff6ff] px-3 py-1 font-geist-mono text-[11px] font-medium text-midnight-ink">
            <kbd className="font-bold text-electric-blue">F6</kbd> Escanear HID
          </span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[#93c5fd] bg-[#eff6ff] px-3 py-1 font-geist-mono text-[11px] font-medium text-midnight-ink">
            <kbd className="font-bold text-electric-blue">F7</kbd> Cambiar Pago
          </span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[#93c5fd] bg-[#eff6ff] px-3 py-1 font-geist-mono text-[11px] font-medium text-midnight-ink">
            <kbd className="font-bold text-electric-blue">F9</kbd> Vaciar
          </span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[#86efac] bg-[#f0fdf4] px-3 py-1 font-geist-mono text-[11px] font-medium text-midnight-ink">
            <kbd className="font-bold text-vivid-green">F10</kbd> Cobrar Venta
          </span>
        </div>
      </div>

      {/* Alertas de Estado */}
      {feedbackError && (
        <div className="flex items-center justify-between rounded-[12px] border border-[#fca5a5] bg-[#fee2e2] px-4 py-3 text-[14px] font-medium text-[#b91c1c] shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{feedbackError}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackError(null)}
            className="font-geist-mono text-[12px] font-semibold underline"
          >
            Cerrar
          </button>
        </div>
      )}

      {feedbackSuccess && (
        <div className="flex items-center justify-between rounded-[12px] border border-[#86efac] bg-[#dcfce7] px-4 py-3 text-[14px] font-medium text-[#15803d] shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{feedbackSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackSuccess(null)}
            className="font-geist-mono text-[12px] font-semibold underline"
          >
            OK
          </button>
        </div>
      )}

      {/* Grilla Principal Mostrador: Izquierda (Lector HID + Catálogo) / Derecha (Carrito FEFO + Cobro) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* COLUMNA IZQUIERDA (7 cols): Lector Código de Barras y Buscador */}
        <div className="space-y-4 lg:col-span-7">
          {/* Tarjeta Lector USB HID */}
          <div className="rounded-[12px] border border-ash border-l-4 border-l-electric-blue bg-canvas-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <label
                htmlFor="pos-barcode-input"
                className="flex items-center gap-2 text-[14px] font-bold text-midnight-ink"
              >
                <ScanBarcode className="h-4 w-4 text-electric-blue" />
                Lector de Código de Barras USB (HID)
              </label>
              {lastScanLatency !== null && (
                <StatusBadge
                  variant={lastScanLatency <= 100 ? 'mint' : 'tangerine'}
                  mono
                >
                  <Zap className="mr-1 h-3 w-3" />
                  Respuesta API: {lastScanLatency} ms
                </StatusBadge>
              )}
            </div>

            <form onSubmit={handleBarcodeFormSubmit} className="mt-2.5 flex gap-2">
              <input
                id="pos-barcode-input"
                ref={barcodeInputRef}
                data-barcode-input="true"
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Dispare el lector USB HID o ingrese EAN-13 y presione Enter..."
                className="w-full rounded-[8px] border-2 border-slate-300 bg-canvas-white px-3.5 py-2 font-geist-mono text-[14px] font-medium text-midnight-ink placeholder:text-fog focus:border-electric-blue focus:outline-none focus:ring-2 focus:ring-electric-blue/20"
              />
              <button
                type="submit"
                className="shrink-0 whitespace-nowrap rounded-[8px] bg-electric-blue px-4 py-2 text-[14px] font-semibold text-canvas-white shadow-xs transition hover:bg-deep-sapphire"
              >
                Escanear
              </button>
            </form>

            {/* Simulador de ráfagas HID para pruebas rápidas */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate">
                Prueba rápida HID:
              </span>
              {CODIGOS_RAPIDOS_DEMO.map((item) => (
                <button
                  key={item.codigo}
                  type="button"
                  onClick={() => triggerScan(item.codigo)}
                  className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-[#93c5fd] bg-[#eff6ff] px-2.5 py-0.5 font-geist-mono text-[11px] font-medium text-midnight-ink transition hover:bg-electric-blue hover:text-canvas-white"
                  title={`Simular lectura láser HID de ${item.nombre}`}
                >
                  <span className="font-bold text-electric-blue group-hover:text-white">
                    {item.codigo.slice(-4)}
                  </span>
                  <span>· {item.nombre}</span>
                </button>
              ))}
            </div>

            {/* Ficha instantánea del último producto escaneado */}
            {lastScannedProduct && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-[8px] border border-[#93c5fd] bg-[#eff6ff] px-3 py-2 text-[12px]">
                <div>
                  <span className="font-bold text-midnight-ink">
                    Último escaneo: {lastScannedProduct.nombre}
                  </span>
                  <span className="ml-2 font-geist-mono font-medium text-slate">
                    ({lastScannedProduct.codigo_barras})
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 font-geist-mono">
                  <StatusBadge variant="mint" mono>
                    Lote FEFO: {lastScannedProduct.lote_fefo_numero || 'N/A'}
                  </StatusBadge>
                  <StatusBadge variant="blue" mono withDot={false}>
                    Vence: {lastScannedProduct.proximo_vencimiento || 'Sin lote'}
                  </StatusBadge>
                  <StatusBadge variant="neutral" mono withDot={false}>
                    Stock: {lastScannedProduct.stock_total_vigente} u.mín
                  </StatusBadge>
                </div>
              </div>
            )}
          </div>

          {/* Buscador Manual y Catálogo Rápido */}
          <div className="rounded-[12px] border border-ash bg-canvas-white p-4 shadow-xs">
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-electric-blue" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    cargarDatosMostrador(e.target.value)
                  }}
                  placeholder="Buscar por nombre comercial o principio activo (ej. Paracetamol, Amoxicilina)..."
                  className="w-full rounded-[8px] border-2 border-slate-300 bg-canvas-white py-2 pl-9 pr-3 text-[14px] font-medium text-midnight-ink placeholder:text-fog focus:border-electric-blue focus:outline-none"
                />
              </div>
            </form>

            <div className="mt-3 max-h-[420px] overflow-x-auto overflow-y-auto rounded-[8px] border border-ash">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-ash bg-paper-mist text-[11px] font-bold uppercase tracking-wider text-slate">
                    <th className="px-3 py-2.5">Medicamento / Laboratorio</th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-right">Caja</th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-right">Blíster</th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-right">Unidad</th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ash text-[13px]">
                  {loadingCatalogo ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center font-medium text-slate">
                        Consultando catálogo de medicamentos...
                      </td>
                    </tr>
                  ) : catalogo.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate">
                        No hay productos registrados. Usa el botón superior{' '}
                        <strong className="text-midnight-ink">Datos Demo</strong> para inyectar el catálogo semilla.
                      </td>
                    </tr>
                  ) : (
                    catalogo.map((prod) => (
                      <tr
                        key={prod.id}
                        className="group transition hover:bg-[#eff6ff]/60"
                      >
                        <td className="px-3 py-2.5">
                          <div className="font-semibold text-midnight-ink">
                            {prod.nombre}
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate">
                            <span className="rounded bg-paper-mist px-1.5 py-0.2 font-geist-mono font-medium text-slate">
                              {prod.codigo_barras}
                            </span>
                            <span>· {prod.principio_activo || 'Genérico'}</span>
                            <span>· {prod.laboratorio || 'Lab'}</span>
                            <span className="font-geist-mono font-semibold text-electric-blue">
                              (Caja x {prod.unidades_por_caja}u)
                            </span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right font-geist-mono text-[13px] font-bold text-midnight-ink">
                          S/ {Number(prod.precio_venta_caja).toFixed(2)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right font-geist-mono text-[13px] font-semibold text-deep-sapphire">
                          {prod.precio_venta_blister
                            ? `S/ ${Number(prod.precio_venta_blister).toFixed(2)}`
                            : '—'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right font-geist-mono text-[13px] font-semibold text-vivid-green">
                          {prod.precio_venta_unitario
                            ? `S/ ${Number(prod.precio_venta_unitario).toFixed(2)}`
                            : '—'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => seleccionarProductoCatalogo(prod)}
                            className="inline-flex items-center gap-1 whitespace-nowrap rounded-[8px] border border-[#93c5fd] bg-[#eff6ff] px-3 py-1.5 text-[12px] font-semibold text-electric-blue transition hover:bg-electric-blue hover:text-canvas-white"
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

        {/* COLUMNA DERECHA (5 cols): Carrito de Despacho FEFO y Liquidación */}
        <div className="space-y-4 lg:col-span-5">
          <div className="rounded-[12px] border border-ash border-t-4 border-t-vivid-green bg-canvas-white p-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-ash pb-3">
              <div>
                <h2 className="text-[17px] font-bold text-midnight-ink">
                  Orden de Despacho Actual
                </h2>
                <p className="font-geist-mono text-[12px] font-medium text-slate">
                  {resumenCarrito.items.length} ítems ·{' '}
                  <span className="font-semibold text-electric-blue">
                    {resumenCarrito.totalUnidadesMinimas} u. mínimas
                  </span>{' '}
                  a descontar
                </p>
              </div>
              {carrito.length > 0 && (
                <button
                  type="button"
                  onClick={limpiarCarrito}
                  className="inline-flex items-center gap-1 whitespace-nowrap rounded-[8px] border border-[#fca5a5] bg-[#fef2f2] px-2.5 py-1 text-[12px] font-semibold text-[#b91c1c] hover:bg-[#fee2e2]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Vaciar (F9)
                </button>
              )}
            </div>

            {/* Lista de Ítems en el Carrito */}
            <div className="my-3 max-h-[320px] space-y-2.5 overflow-y-auto pr-1">
              {resumenCarrito.items.length === 0 ? (
                <div className="rounded-[12px] border-2 border-dashed border-ash bg-paper-mist/70 py-10 text-center">
                  <ScanBarcode className="mx-auto h-8 w-8 text-electric-blue/60" />
                  <p className="mt-2 text-[14px] font-semibold text-slate">
                    Carrito de despacho vacío
                  </p>
                  <p className="mt-0.5 px-4 text-[12px] text-fog">
                    Escanee un código de barras USB o haga clic en &ldquo;Agregar&rdquo; en el catálogo izquierdo.
                  </p>
                </div>
              ) : (
                resumenCarrito.items.map((item, idx) => {
                  const prod = item.producto
                  return (
                    <div
                      key={item.key}
                      className="rounded-[12px] border border-ash bg-[#f8fafc] p-3 shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-[14px] font-bold text-midnight-ink">
                            {prod.nombre}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 font-geist-mono text-[11px] text-slate">
                            <span className="font-medium">SKU: {prod.codigo_barras}</span>
                            {prod.lote_fefo_numero && (
                              <span className="whitespace-nowrap rounded-full border border-[#86efac] bg-[#dcfce7] px-2 py-0.5 font-semibold text-[#15803d]">
                                FEFO: {prod.lote_fefo_numero} ({prod.proximo_vencimiento})
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => eliminarItemCarrito(idx)}
                          className="rounded-[6px] p-1 text-slate hover:bg-[#fee2e2] hover:text-[#dc2626]"
                          title="Quitar ítem"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Controles de Fraccionamiento y Cantidad */}
                      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-ash pt-2.5">
                        {/* Selector de Presentación (Caja / Blíster / Unidad) */}
                        <div className="inline-flex rounded-[8px] border border-ash bg-canvas-white p-0.5">
                          <button
                            type="button"
                            onClick={() => cambiarPresentacionItem(idx, 'CAJA')}
                            className={`rounded-[6px] px-2.5 py-1 font-geist-mono text-[11px] font-semibold transition ${
                              item.tipo_presentacion === 'CAJA'
                                ? 'bg-electric-blue text-canvas-white shadow-2xs'
                                : 'text-slate hover:text-midnight-ink'
                            }`}
                          >
                            CAJA
                          </button>
                          <button
                            type="button"
                            disabled={!prod.fraccionable || !prod.precio_venta_blister}
                            onClick={() => cambiarPresentacionItem(idx, 'BLISTER')}
                            className={`rounded-[6px] px-2.5 py-1 font-geist-mono text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-35 ${
                              item.tipo_presentacion === 'BLISTER'
                                ? 'bg-electric-blue text-canvas-white shadow-2xs'
                                : 'text-slate hover:text-midnight-ink'
                            }`}
                          >
                            BLÍSTER
                          </button>
                          <button
                            type="button"
                            disabled={!prod.fraccionable}
                            onClick={() => cambiarPresentacionItem(idx, 'UNIDAD')}
                            className={`rounded-[6px] px-2.5 py-1 font-geist-mono text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-35 ${
                              item.tipo_presentacion === 'UNIDAD'
                                ? 'bg-electric-blue text-canvas-white shadow-2xs'
                                : 'text-slate hover:text-midnight-ink'
                            }`}
                          >
                            UNIDAD
                          </button>
                        </div>

                        {/* Control de Cantidad */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              cambiarCantidadItem(idx, item.cantidad_presentacion - 1)
                            }
                            className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] border border-ash bg-canvas-white text-midnight-ink transition hover:bg-paper-mist"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <input
                            type="number"
                            min={1}
                            value={item.cantidad_presentacion}
                            onChange={(e) => cambiarCantidadItem(idx, e.target.value)}
                            className="h-8 w-16 [appearance:textfield] rounded-[6px] border-2 border-midnight-ink bg-canvas-white px-2 text-center font-geist-mono text-[14px] font-bold text-midnight-ink focus:border-electric-blue focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              cambiarCantidadItem(idx, item.cantidad_presentacion + 1)
                            }
                            className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] border border-ash bg-canvas-white text-midnight-ink transition hover:bg-paper-mist"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Subtotal y equivalencia en unidad mínima */}
                        <div className="whitespace-nowrap text-right font-geist-mono">
                          <div className="text-[15px] font-bold text-midnight-ink">
                            S/ {item.subtotal.toFixed(2)}
                          </div>
                          <div className="text-[11px] font-medium text-electric-blue">
                            -{item.unidadesMinimas} u.mín
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Selector de Método de Pago */}
            <div className="border-t border-ash pt-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate">
                Método de Pago (F7)
              </span>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {METODOS_PAGO.map((mp) => {
                  const Icon = mp.icon
                  const activo = metodoPago === mp.id
                  return (
                    <button
                      key={mp.id}
                      type="button"
                      onClick={() => setMetodoPago(mp.id)}
                      className={`flex flex-col items-center justify-center gap-1 rounded-[8px] border-2 p-2.5 text-[12px] font-semibold transition ${
                        activo
                          ? 'border-electric-blue bg-[#eff6ff] text-deep-sapphire shadow-2xs'
                          : 'border-ash bg-canvas-white text-slate hover:bg-paper-mist'
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 ${
                          activo ? 'text-electric-blue' : 'text-slate'
                        }`}
                      />
                      <span className="whitespace-nowrap">{mp.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Cálculo de Efectivo y Vuelto */}
            {metodoPago === 'EFECTIVO' && resumenCarrito.total > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-3 rounded-[8px] border border-[#86efac] bg-[#f0fdf4] p-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#15803d]">
                    Efectivo Recibido (S/)
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
                <div className="flex flex-col justify-between text-right font-geist-mono">
                  <span className="text-[11px] font-semibold text-[#15803d]">
                    Vuelto al cliente
                  </span>
                  <span className="whitespace-nowrap text-[18px] font-bold text-[#15803d]">
                    S/ {vuelto.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Total y Botón Primario */}
            <div className="mt-4 border-t border-ash pt-3">
              <div className="flex items-baseline justify-between rounded-[10px] bg-paper-mist px-3.5 py-2.5">
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
                onClick={confirmarVentaFEFO}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-[8px] bg-electric-blue px-4 py-3 text-[15px] font-semibold text-canvas-white shadow-sm transition hover:bg-deep-sapphire disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Receipt className="h-5 w-5" />
                <span>
                  {procesandoVenta
                    ? 'Procesando Descuento FEFO...'
                    : 'Registrar Venta e Imprimir Ticket (F10)'}
                </span>
              </button>
            </div>
          </div>

          {/* Historial Rápido de Últimas Ventas en Mostrador */}
          <div className="rounded-[12px] border border-ash bg-canvas-white p-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-ash pb-2.5">
              <span className="flex items-center gap-1.5 text-[13px] font-bold text-midnight-ink">
                <Clock className="h-4 w-4 text-electric-blue" />
                Últimas Ventas Despachadas
              </span>
              <span className="font-geist-mono text-[11px] font-medium text-slate">
                Reimpresión Térmica
              </span>
            </div>

            <div className="mt-2 divide-y divide-ash text-[12px]">
              {ventasRecientes.length === 0 ? (
                <p className="py-4 text-center text-fog">
                  Sin ventas registradas recientemente.
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
                      <span className="font-geist-mono text-slate">
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
                        mono
                        withDot={false}
                      >
                        {v.metodo_pago}
                      </StatusBadge>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="whitespace-nowrap font-geist-mono text-[13px] font-bold text-midnight-ink">
                        S/ {Number(v.total).toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setVentaEmitida(v)}
                        className="inline-flex items-center gap-1 whitespace-nowrap rounded-[6px] border border-[#93c5fd] bg-[#eff6ff] px-2.5 py-1 text-[11px] font-semibold text-electric-blue hover:bg-electric-blue hover:text-canvas-white"
                        title="Ver / Imprimir Ticket Térmico"
                      >
                        <Printer className="h-3 w-3" />
                        Ticket
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal e Impresión Web de Ticket Térmico 80mm */}
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
