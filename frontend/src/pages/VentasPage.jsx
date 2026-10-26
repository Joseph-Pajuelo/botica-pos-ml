import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Receipt,
  Printer,
  Search,
  RefreshCw,
  Banknote,
  Smartphone,
  CreditCard,
  Eye,
  Calendar,
  Layers,
  AlertTriangle,
  BarChart3,
  PieChart,
} from 'lucide-react'
import { posApi, productosApi, getErrorMessage } from '../services/api'
import { StatusBadge, ThermalTicket, Modal } from '../components'

const FILTROS_PAGO = [
  { id: 'TODOS', label: 'Todos los Pagos' },
  { id: 'EFECTIVO', label: 'Efectivo' },
  { id: 'BILLETERA_DIGITAL', label: 'Yape / Plin' },
  { id: 'TARJETA', label: 'Tarjeta' },
]

const PAGO_AMIGABLE = {
  EFECTIVO: 'Efectivo',
  BILLETERA_DIGITAL: 'Yape / Plin',
  TARJETA: 'Tarjeta',
}

const PRESENTACION_AMIGABLE = {
  CAJA: 'Caja',
  BLISTER: 'Blíster',
  UNIDAD: 'Unidad',
}

export function VentasPage() {
  const [ventas, setVentas] = useState([])
  const [productosMap, setProductosMap] = useState({})
  const [filtroPago, setFiltroPago] = useState('TODOS')
  const [busqueda, setBusqueda] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [ventaDetalle, setVentaDetalle] = useState(null)
  const [ventaTicket, setVentaTicket] = useState(null)

  const cargarHistorialVentas = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [listaVentas, listaProds] = await Promise.all([
        posApi.listarVentas({ skip: 0, limit: 150 }),
        productosApi.listar({ limit: 150 }),
      ])
      setVentas(listaVentas)
      const mapa = {}
      listaProds.forEach((p) => {
        mapa[p.id] = p
      })
      setProductosMap(mapa)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargarHistorialVentas()
  }, [cargarHistorialVentas])

  const ventasFiltradas = useMemo(() => {
    return ventas.filter((v) => {
      if (filtroPago !== 'TODOS' && v.metodo_pago !== filtroPago) {
        return false
      }
      if (busqueda.trim() !== '') {
        const q = busqueda.trim().toLowerCase()
        const matchId = String(v.id).includes(q)
        const matchProducto = (v.detalles || []).some((det) => {
          const nombre = (productosMap[det.producto_id]?.nombre || '').toLowerCase()
          return nombre.includes(q)
        })
        return matchId || matchProducto
      }
      return true
    })
  }, [ventas, filtroPago, busqueda, productosMap])

  const metricas = useMemo(() => {
    let totalGeneral = 0
    let totalEfectivo = 0
    let totalDigital = 0
    let totalTarjeta = 0
    let totalUnidades = 0

    const porProducto = {}

    ventasFiltradas.forEach((v) => {
      const monto = Number(v.total || 0)
      totalGeneral += monto
      if (v.metodo_pago === 'EFECTIVO') totalEfectivo += monto
      if (v.metodo_pago === 'BILLETERA_DIGITAL') totalDigital += monto
      if (v.metodo_pago === 'TARJETA') totalTarjeta += monto

      ;(v.detalles || []).forEach((d) => {
        const u = Number(d.cantidad_unidades || 0)
        const sub = Number(d.subtotal || 0)
        totalUnidades += u

        const pid = d.producto_id
        if (!porProducto[pid]) {
          porProducto[pid] = {
            producto_id: pid,
            nombre: productosMap[pid]?.nombre || `Medicamento #${pid}`,
            importe: 0,
            unidades: 0,
          }
        }
        porProducto[pid].importe += sub
        porProducto[pid].unidades += u
      })
    })

    const topProductos = Object.values(porProducto)
      .sort((a, b) => b.importe - a.importe)
      .slice(0, 5)

    const basePct = Math.max(totalGeneral, 0.01)

    return {
      cantidadVentas: ventasFiltradas.length,
      totalGeneral: +totalGeneral.toFixed(2),
      totalEfectivo: +totalEfectivo.toFixed(2),
      totalDigital: +totalDigital.toFixed(2),
      totalTarjeta: +totalTarjeta.toFixed(2),
      pctEfectivo: Math.round((totalEfectivo / basePct) * 100),
      pctDigital: Math.round((totalDigital / basePct) * 100),
      pctTarjeta: Math.round((totalTarjeta / basePct) * 100),
      totalUnidades,
      topProductos,
    }
  }, [ventasFiltradas, productosMap])

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[14px] border border-[#e5e0d8] bg-canvas-white px-6 py-4 shadow-2xs">
        <div>
          <h1 className="font-satoshi text-[28px] font-bold leading-tight text-midnight-ink">
            Ventas del Día y Resumen de Caja
          </h1>
          <p className="mt-1 text-[14px] text-slate">
            Consulta cuánto ingresó en efectivo, Yape/Plin o tarjeta y reimprime cualquier comprobante de venta.
          </p>
        </div>

        <button
          type="button"
          onClick={cargarHistorialVentas}
          disabled={loading}
          className="inline-flex items-center gap-2 whitespace-nowrap rounded-[10px] bg-[#0d9488] px-4 py-2 text-[14px] font-semibold text-white shadow-2xs hover:bg-[#0f766e] disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualizar Lista</span>
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

      {/* Resumen de Ingresos de Caja */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[12px] border border-[#e5e0d8] border-l-4 border-l-[#0d9488] bg-canvas-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-[12px] font-bold uppercase tracking-wide text-slate">
            <span>Total Vendido</span>
            <Receipt className="h-4 w-4 text-[#0d9488]" />
          </div>
          <div className="mt-2 whitespace-nowrap font-geist-mono text-[28px] font-bold text-midnight-ink">
            S/ {metricas.totalGeneral.toFixed(2)}
          </div>
          <div className="mt-1 text-[11.5px] font-medium text-slate">
            {metricas.cantidadVentas} ventas · {metricas.totalUnidades} unidades entregadas
          </div>
        </div>

        <div className="rounded-[12px] border border-[#e5e0d8] border-l-4 border-l-[#16a34a] bg-canvas-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-[12px] font-bold uppercase tracking-wide text-slate">
            <span>Dinero en Efectivo</span>
            <Banknote className="h-4 w-4 text-[#16a34a]" />
          </div>
          <div className="mt-2 whitespace-nowrap font-geist-mono text-[28px] font-bold text-[#15803d]">
            S/ {metricas.totalEfectivo.toFixed(2)}
          </div>
          <div className="mt-1 text-[11.5px] font-medium text-slate">
            {metricas.pctEfectivo}% de los ingresos
          </div>
        </div>

        <div className="rounded-[12px] border border-[#e5e0d8] border-l-4 border-l-[#7c3aed] bg-canvas-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-[12px] font-bold uppercase tracking-wide text-slate">
            <span>Cobros por Yape / Plin</span>
            <Smartphone className="h-4 w-4 text-[#7c3aed]" />
          </div>
          <div className="mt-2 whitespace-nowrap font-geist-mono text-[28px] font-bold text-[#6d28d9]">
            S/ {metricas.totalDigital.toFixed(2)}
          </div>
          <div className="mt-1 text-[11.5px] font-medium text-slate">
            {metricas.pctDigital}% de los ingresos
          </div>
        </div>

        <div className="rounded-[12px] border border-[#e5e0d8] border-l-4 border-l-[#0284c7] bg-canvas-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-[12px] font-bold uppercase tracking-wide text-slate">
            <span>Cobros con Tarjeta</span>
            <CreditCard className="h-4 w-4 text-[#0284c7]" />
          </div>
          <div className="mt-2 whitespace-nowrap font-geist-mono text-[28px] font-bold text-[#0369a1]">
            S/ {metricas.totalTarjeta.toFixed(2)}
          </div>
          <div className="mt-1 text-[11.5px] font-medium text-slate">
            {metricas.pctTarjeta}% de los ingresos
          </div>
        </div>
      </div>

      {/* Gráficos Amigables de Ventas */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-[14px] border border-[#e5e0d8] bg-canvas-white p-5 shadow-2xs lg:col-span-5">
          <div className="flex items-center gap-2 border-b border-[#e5e0d8] pb-3">
            <PieChart className="h-5 w-5 text-[#0d9488]" />
            <div>
              <h2 className="text-[15px] font-bold text-midnight-ink">
                ¿Cómo pagaron los clientes?
              </h2>
              <p className="text-[11.5px] text-slate">
                Proporción de ventas según el medio de pago
              </p>
            </div>
          </div>

          <div className="mt-4 flex h-5 w-full overflow-hidden rounded-full bg-slate-200">
            {metricas.pctEfectivo > 0 && (
              <div
                style={{ width: `${metricas.pctEfectivo}%` }}
                className="bg-[#16a34a] transition-all duration-500"
                title={`Efectivo: ${metricas.pctEfectivo}%`}
              />
            )}
            {metricas.pctDigital > 0 && (
              <div
                style={{ width: `${metricas.pctDigital}%` }}
                className="bg-[#7c3aed] transition-all duration-500"
                title={`Yape / Plin: ${metricas.pctDigital}%`}
              />
            )}
            {metricas.pctTarjeta > 0 && (
              <div
                style={{ width: `${metricas.pctTarjeta}%` }}
                className="bg-[#0284c7] transition-all duration-500"
                title={`Tarjeta: ${metricas.pctTarjeta}%`}
              />
            )}
          </div>

          <div className="mt-4 space-y-2.5 text-[12.5px]">
            <div className="flex items-center justify-between rounded-[8px] border border-[#86efac] bg-[#f0fdf4] px-3 py-2">
              <span className="flex items-center gap-2 font-semibold text-[#15803d]">
                <span className="h-3 w-3 rounded-full bg-[#16a34a]" />
                Efectivo
              </span>
              <span className="whitespace-nowrap font-geist-mono font-bold text-midnight-ink">
                S/ {metricas.totalEfectivo.toFixed(2)} ({metricas.pctEfectivo}%)
              </span>
            </div>

            <div className="flex items-center justify-between rounded-[8px] border border-[#c4b5fd] bg-[#f5f3ff] px-3 py-2">
              <span className="flex items-center gap-2 font-semibold text-[#6d28d9]">
                <span className="h-3 w-3 rounded-full bg-[#7c3aed]" />
                Yape / Plin
              </span>
              <span className="whitespace-nowrap font-geist-mono font-bold text-midnight-ink">
                S/ {metricas.totalDigital.toFixed(2)} ({metricas.pctDigital}%)
              </span>
            </div>

            <div className="flex items-center justify-between rounded-[8px] border border-[#bae6fd] bg-[#f0f9ff] px-3 py-2">
              <span className="flex items-center gap-2 font-semibold text-[#0369a1]">
                <span className="h-3 w-3 rounded-full bg-[#0284c7]" />
                Tarjeta
              </span>
              <span className="whitespace-nowrap font-geist-mono font-bold text-midnight-ink">
                S/ {metricas.totalTarjeta.toFixed(2)} ({metricas.pctTarjeta}%)
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-[14px] border border-[#e5e0d8] bg-canvas-white p-5 shadow-2xs lg:col-span-7">
          <div className="flex items-center justify-between border-b border-[#e5e0d8] pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-[#0d9488]" />
              <div>
                <h2 className="text-[15px] font-bold text-midnight-ink">
                  Medicamentos Más Vendidos
                </h2>
                <p className="text-[11.5px] text-slate">
                  Productos que generaron mayores ingresos en el mostrador
                </p>
              </div>
            </div>
          </div>

          <div className="mt-3 space-y-3">
            {metricas.topProductos.length === 0 ? (
              <p className="py-10 text-center text-[13px] text-slate">
                Sin ventas registradas para mostrar estadísticas.
              </p>
            ) : (
              metricas.topProductos.map((item, idx) => {
                const maxImp = Math.max(
                  metricas.topProductos[0]?.importe || 1,
                  1
                )
                const pct = Math.round((item.importe / maxImp) * 100)

                return (
                  <div
                    key={item.producto_id}
                    className="rounded-[10px] border border-[#e5e0d8] bg-[#faf8f5] p-2.5"
                  >
                    <div className="flex items-center justify-between gap-2 text-[12.5px]">
                      <span className="truncate font-bold text-midnight-ink">
                        {idx + 1}. {item.nombre}
                      </span>
                      <span className="whitespace-nowrap font-geist-mono font-bold text-[#0f766e]">
                        S/ {item.importe.toFixed(2)} ({item.unidades} unds)
                      </span>
                    </div>
                    <div className="mt-1.5 h-3 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-[#0d9488] transition-all duration-500"
                        style={{ width: `${Math.max(pct, 5)}%` }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Lista de Ventas */}
      <div className="rounded-[14px] border border-[#e5e0d8] bg-canvas-white p-5 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5e0d8] pb-3">
          <div className="relative min-w-[260px] flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-2.5 h-4 w-4 text-[#0d9488]" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por número de boleta o nombre del medicamento vendido..."
              className="w-full rounded-[10px] border-2 border-[#cbd5e1] bg-[#faf8f5] py-2 pl-10 pr-3 text-[14px] font-medium text-midnight-ink placeholder:text-steel focus:border-[#0d9488] focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {FILTROS_PAGO.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFiltroPago(f.id)}
                className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition ${
                  filtroPago === f.id
                    ? 'bg-[#0d9488] text-white shadow-2xs'
                    : 'border border-[#e5e0d8] bg-[#faf8f5] text-slate hover:text-midnight-ink'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-[10px] border border-[#e5e0d8]">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[#e5e0d8] bg-[#faf8f5] text-[11px] font-bold uppercase tracking-wider text-slate">
                <th className="whitespace-nowrap px-3.5 py-2.5">N° Boleta</th>
                <th className="whitespace-nowrap px-3.5 py-2.5">Fecha y Hora</th>
                <th className="whitespace-nowrap px-3.5 py-2.5">Medio de Pago</th>
                <th className="px-3.5 py-2.5">Medicamentos Vendidos</th>
                <th className="whitespace-nowrap px-3.5 py-2.5 text-right">Cantidad Total</th>
                <th className="whitespace-nowrap px-3.5 py-2.5 text-right">Monto Cobrado</th>
                <th className="whitespace-nowrap px-3.5 py-2.5 text-right">Comprobante</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e0d8] text-[13px]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center font-medium text-slate">
                    Cargando historial de ventas...
                  </td>
                </tr>
              ) : ventasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate">
                    No se encontraron ventas con esos criterios.
                  </td>
                </tr>
              ) : (
                ventasFiltradas.map((venta) => {
                  const detalles = venta.detalles || []
                  const totalUnidsVenta = detalles.reduce(
                    (acc, d) => acc + Number(d.cantidad_unidades || 0),
                    0
                  )

                  return (
                    <tr key={venta.id} className="transition hover:bg-[#f0fdfa]/60">
                      <td className="whitespace-nowrap px-3.5 py-3 font-geist-mono text-[13px] font-bold text-midnight-ink">
                        #{String(venta.id).padStart(6, '0')}
                      </td>

                      <td className="whitespace-nowrap px-3.5 py-3 text-[12px] font-medium text-slate">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-[#0d9488]" />
                          {new Date(venta.fecha_hora).toLocaleString('es-PE', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-3.5 py-3">
                        <StatusBadge
                          variant={
                            venta.metodo_pago === 'EFECTIVO'
                              ? 'mint'
                              : venta.metodo_pago === 'BILLETERA_DIGITAL'
                                ? 'lavender'
                                : 'blue'
                          }
                        >
                          {PAGO_AMIGABLE[venta.metodo_pago] || venta.metodo_pago}
                        </StatusBadge>
                      </td>

                      <td className="px-3.5 py-3">
                        <div className="space-y-1">
                          {detalles.slice(0, 2).map((det) => {
                            const prod = productosMap[det.producto_id]
                            return (
                              <div
                                key={det.id}
                                className="flex flex-wrap items-center gap-1.5 text-[12px]"
                              >
                                <span className="font-semibold text-midnight-ink">
                                  {prod?.nombre || `Medicamento #${det.producto_id}`}
                                </span>
                                <span className="whitespace-nowrap rounded-full border border-[#e5e0d8] bg-[#faf8f5] px-2 py-0.2 text-[11px] font-semibold text-slate">
                                  {det.cantidad_presentacion}{' '}
                                  {PRESENTACION_AMIGABLE[det.tipo_presentacion] ||
                                    det.tipo_presentacion}
                                </span>
                              </div>
                            )
                          })}
                          {detalles.length > 2 && (
                            <span className="text-[11px] font-semibold text-[#0d9488]">
                              +{detalles.length - 2} medicamento(s) más...
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-3.5 py-3 text-right text-[12px] font-semibold text-slate">
                        {totalUnidsVenta} unds
                      </td>

                      <td className="whitespace-nowrap px-3.5 py-3 text-right font-geist-mono text-[14px] font-bold text-midnight-ink">
                        S/ {Number(venta.total).toFixed(2)}
                      </td>

                      <td className="whitespace-nowrap px-3.5 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setVentaDetalle(venta)}
                            className="inline-flex items-center gap-1 whitespace-nowrap rounded-[8px] border border-[#99f6e4] bg-[#f0fdfa] px-2.5 py-1.5 text-[12px] font-semibold text-[#0f766e] hover:bg-[#0d9488] hover:text-white"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Ver Detalle
                          </button>

                          <button
                            type="button"
                            onClick={() => setVentaTicket(venta)}
                            className="inline-flex items-center gap-1 whitespace-nowrap rounded-[8px] border border-[#e5e0d8] bg-canvas-white px-2.5 py-1.5 text-[12px] font-semibold text-midnight-ink hover:bg-[#faf8f5]"
                          >
                            <Printer className="h-3.5 w-3.5 text-[#0d9488]" />
                            Boleta
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Detalle de Venta */}
      <Modal
        isOpen={Boolean(ventaDetalle)}
        onClose={() => setVentaDetalle(null)}
        title={`Detalle de Venta #${String(ventaDetalle?.id || 0).padStart(6, '0')}`}
        subtitle="Resumen de los medicamentos entregados al cliente."
        maxWidth="max-w-2xl"
      >
        {ventaDetalle && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 rounded-[12px] border border-[#99f6e4] bg-[#f0fdfa] p-3 text-[12px]">
              <div>
                <span className="block text-[10px] font-bold text-slate">FECHA Y HORA</span>
                <span className="font-semibold text-midnight-ink">
                  {new Date(ventaDetalle.fecha_hora).toLocaleString('es-PE')}
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate">MEDIO DE PAGO</span>
                <span className="font-bold text-[#0f766e]">
                  {PAGO_AMIGABLE[ventaDetalle.metodo_pago] || ventaDetalle.metodo_pago}
                </span>
              </div>
              <div className="text-right">
                <span className="block text-[10px] font-bold text-slate">TOTAL COBRADO</span>
                <span className="whitespace-nowrap font-geist-mono text-[16px] font-bold text-midnight-ink">
                  S/ {Number(ventaDetalle.total).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-[12px] border border-[#e5e0d8]">
              <table className="w-full border-collapse text-left text-[12.5px]">
                <thead>
                  <tr className="border-b border-[#e5e0d8] bg-[#faf8f5] text-[11px] font-bold text-slate">
                    <th className="p-2.5">Medicamento</th>
                    <th className="whitespace-nowrap p-2.5">Presentación</th>
                    <th className="whitespace-nowrap p-2.5">Lote Entregado</th>
                    <th className="whitespace-nowrap p-2.5 text-right">Unidades</th>
                    <th className="whitespace-nowrap p-2.5 text-right">Precio</th>
                    <th className="whitespace-nowrap p-2.5 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e0d8]">
                  {(ventaDetalle.detalles || []).map((det) => {
                    const prod = productosMap[det.producto_id]
                    return (
                      <tr key={det.id}>
                        <td className="p-2.5 font-semibold text-midnight-ink">
                          {prod?.nombre || `Medicamento #${det.producto_id}`}
                        </td>
                        <td className="whitespace-nowrap p-2.5 font-medium">
                          {det.cantidad_presentacion} ×{' '}
                          {PRESENTACION_AMIGABLE[det.tipo_presentacion] ||
                            det.tipo_presentacion}
                        </td>
                        <td className="whitespace-nowrap p-2.5">
                          <span className="inline-flex items-center gap-1 rounded-full border border-[#86efac] bg-[#dcfce7] px-2 py-0.5 text-[11px] font-semibold text-[#15803d]">
                            <Layers className="h-3 w-3" />
                            Lote #{det.lote_id}
                          </span>
                        </td>
                        <td className="whitespace-nowrap p-2.5 text-right font-medium text-slate">
                          {det.cantidad_unidades} unds
                        </td>
                        <td className="whitespace-nowrap p-2.5 text-right font-geist-mono font-medium text-slate">
                          S/ {Number(det.precio_unitario).toFixed(2)}
                        </td>
                        <td className="whitespace-nowrap p-2.5 text-right font-geist-mono font-bold text-midnight-ink">
                          S/ {Number(det.subtotal).toFixed(2)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2 border-t border-[#e5e0d8] pt-3">
              <button
                type="button"
                onClick={() => setVentaDetalle(null)}
                className="rounded-[8px] border border-[#e5e0d8] bg-canvas-white px-4 py-2 text-[13px] font-semibold text-midnight-ink hover:bg-[#faf8f5]"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => {
                  const v = ventaDetalle
                  setVentaDetalle(null)
                  setVentaTicket(v)
                }}
                className="inline-flex items-center gap-2 rounded-[8px] bg-[#0d9488] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#0f766e]"
              >
                <Printer className="h-4 w-4" />
                Imprimir Boleta
              </button>
            </div>
          </div>
        )}
      </Modal>

      {ventaTicket && (
        <ThermalTicket
          venta={ventaTicket}
          productosMap={productosMap}
          onClose={() => setVentaTicket(null)}
        />
      )}
    </div>
  )
}
