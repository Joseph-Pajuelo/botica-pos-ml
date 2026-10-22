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
  { id: 'TARJETA', label: 'Tarjeta POS' },
]

export function VentasPage() {
  const [ventas, setVentas] = useState([])
  const [productosMap, setProductosMap] = useState({})
  const [filtroPago, setFiltroPago] = useState('TODOS')
  const [busqueda, setBusqueda] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Modal de detalle de venta y Ticket Térmico
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

  // KPIs y analítica visual de Caja y Ventas
  const metricas = useMemo(() => {
    let totalGeneral = 0
    let totalEfectivo = 0
    let totalDigital = 0
    let totalTarjeta = 0
    let totalUnidades = 0

    const porProducto = {}
    const porPresentacion = { CAJA: 0, BLISTER: 0, UNIDAD: 0 }

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
        porPresentacion[d.tipo_presentacion] =
          (porPresentacion[d.tipo_presentacion] || 0) + sub

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
      porPresentacion,
    }
  }, [ventasFiltradas, productosMap])

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[12px] border border-ash bg-canvas-white px-5 py-4 shadow-xs">
        <div>
          <h1 className="font-satoshi text-[30px] font-bold leading-[1.15] text-midnight-ink">
            Historial de Ventas y Arqueo de Caja
          </h1>
          <p className="mt-1 text-[14px] text-slate">
            Registro auditable de comprobantes emitidos, analítica de medios de pago, lotes FEFO descontados y reimpresión térmica.
          </p>
        </div>

        <button
          type="button"
          onClick={cargarHistorialVentas}
          disabled={loading}
          className="inline-flex items-center gap-2 whitespace-nowrap rounded-[8px] bg-electric-blue px-4 py-2 text-[14px] font-semibold text-canvas-white shadow-xs hover:bg-deep-sapphire disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualizar Ventas</span>
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

      {/* KPIs de Recaudación con bordes de color */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[12px] border border-ash border-l-4 border-l-electric-blue bg-canvas-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-[12px] font-bold uppercase tracking-wide text-slate">
            <span>Total Recaudado</span>
            <Receipt className="h-4 w-4 text-electric-blue" />
          </div>
          <div className="mt-2 whitespace-nowrap font-geist-mono text-[28px] font-bold text-midnight-ink">
            S/ {metricas.totalGeneral.toFixed(2)}
          </div>
          <div className="mt-1 font-geist-mono text-[11px] font-medium text-slate">
            {metricas.cantidadVentas} tickets · {metricas.totalUnidades} u.mín despachadas
          </div>
        </div>

        <div className="rounded-[12px] border border-ash border-l-4 border-l-[#16a34a] bg-canvas-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-[12px] font-bold uppercase tracking-wide text-slate">
            <span>Caja en Efectivo</span>
            <Banknote className="h-4 w-4 text-[#16a34a]" />
          </div>
          <div className="mt-2 whitespace-nowrap font-geist-mono text-[28px] font-bold text-[#15803d]">
            S/ {metricas.totalEfectivo.toFixed(2)}
          </div>
          <div className="mt-1 text-[11px] font-medium text-slate">
            {metricas.pctEfectivo}% del total recaudado
          </div>
        </div>

        <div className="rounded-[12px] border border-ash border-l-4 border-l-[#7c3aed] bg-canvas-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-[12px] font-bold uppercase tracking-wide text-slate">
            <span>Yape / Plin</span>
            <Smartphone className="h-4 w-4 text-[#7c3aed]" />
          </div>
          <div className="mt-2 whitespace-nowrap font-geist-mono text-[28px] font-bold text-[#6d28d9]">
            S/ {metricas.totalDigital.toFixed(2)}
          </div>
          <div className="mt-1 text-[11px] font-medium text-slate">
            {metricas.pctDigital}% del total recaudado
          </div>
        </div>

        <div className="rounded-[12px] border border-ash border-l-4 border-l-deep-sapphire bg-canvas-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-[12px] font-bold uppercase tracking-wide text-slate">
            <span>Tarjeta POS</span>
            <CreditCard className="h-4 w-4 text-electric-blue" />
          </div>
          <div className="mt-2 whitespace-nowrap font-geist-mono text-[28px] font-bold text-deep-sapphire">
            S/ {metricas.totalTarjeta.toFixed(2)}
          </div>
          <div className="mt-1 text-[11px] font-medium text-slate">
            {metricas.pctTarjeta}% del total recaudado
          </div>
        </div>
      </div>

      {/* GRÁFICOS VISUALES DE VENTAS Y MEDIOS DE PAGO */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Gráfico 1 (5 cols): Distribución por Medio de Pago y Presentación */}
        <div className="rounded-[12px] border border-ash bg-canvas-white p-4 shadow-xs lg:col-span-5">
          <div className="flex items-center gap-2 border-b border-ash pb-3">
            <PieChart className="h-5 w-5 text-electric-blue" />
            <div>
              <h2 className="text-[15px] font-bold text-midnight-ink">
                Composición de Ingresos por Medio de Pago
              </h2>
              <p className="text-[11px] text-slate">
                Proporción porcentual de cobros en mostrador
              </p>
            </div>
          </div>

          {/* Barra apilada de medios de pago */}
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
                className="bg-[#2563eb] transition-all duration-500"
                title={`Tarjeta POS: ${metricas.pctTarjeta}%`}
              />
            )}
          </div>

          <div className="mt-4 space-y-2.5 font-geist-mono text-[12px]">
            <div className="flex items-center justify-between rounded-[8px] border border-[#86efac] bg-[#f0fdf4] px-3 py-2">
              <span className="flex items-center gap-2 font-semibold text-[#15803d]">
                <span className="h-3 w-3 rounded-full bg-[#16a34a]" />
                EFECTIVO
              </span>
              <span className="whitespace-nowrap font-bold text-midnight-ink">
                S/ {metricas.totalEfectivo.toFixed(2)} ({metricas.pctEfectivo}%)
              </span>
            </div>

            <div className="flex items-center justify-between rounded-[8px] border border-[#c4b5fd] bg-[#f5f3ff] px-3 py-2">
              <span className="flex items-center gap-2 font-semibold text-[#6d28d9]">
                <span className="h-3 w-3 rounded-full bg-[#7c3aed]" />
                YAPE / PLIN
              </span>
              <span className="whitespace-nowrap font-bold text-midnight-ink">
                S/ {metricas.totalDigital.toFixed(2)} ({metricas.pctDigital}%)
              </span>
            </div>

            <div className="flex items-center justify-between rounded-[8px] border border-[#93c5fd] bg-[#eff6ff] px-3 py-2">
              <span className="flex items-center gap-2 font-semibold text-deep-sapphire">
                <span className="h-3 w-3 rounded-full bg-[#2563eb]" />
                TARJETA POS
              </span>
              <span className="whitespace-nowrap font-bold text-midnight-ink">
                S/ {metricas.totalTarjeta.toFixed(2)} ({metricas.pctTarjeta}%)
              </span>
            </div>
          </div>
        </div>

        {/* Gráfico 2 (7 cols): Ranking de Medicamentos Más Vendidos */}
        <div className="rounded-[12px] border border-ash bg-canvas-white p-4 shadow-xs lg:col-span-7">
          <div className="flex items-center justify-between border-b border-ash pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-electric-blue" />
              <div>
                <h2 className="text-[15px] font-bold text-midnight-ink">
                  Top Medicamentos por Facturación y Rotación en Caja
                </h2>
                <p className="text-[11px] text-slate">
                  Ranking de productos con mayor importe recaudado y unidades mínimas despachadas
                </p>
              </div>
            </div>
          </div>

          <div className="mt-3 space-y-3">
            {metricas.topProductos.length === 0 ? (
              <p className="py-10 text-center text-[13px] text-slate">
                Sin ventas registradas para graficar.
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
                    className="rounded-[10px] border border-ash bg-[#f8fafc] p-2.5"
                  >
                    <div className="flex items-center justify-between gap-2 text-[12px]">
                      <span className="truncate font-bold text-midnight-ink">
                        #{idx + 1} · {item.nombre}
                      </span>
                      <span className="whitespace-nowrap font-geist-mono font-bold text-electric-blue">
                        S/ {item.importe.toFixed(2)} ({item.unidades} u.mín)
                      </span>
                    </div>
                    <div className="mt-1.5 h-3 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-electric-blue transition-all duration-500"
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

      {/* Filtros y Tabla de Ventas */}
      <div className="rounded-[12px] border border-ash bg-canvas-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ash pb-3">
          {/* Buscador por N° de Ticket o Medicamento */}
          <div className="relative min-w-[260px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-electric-blue" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por N° de ticket o nombre de medicamento vendido..."
              className="w-full rounded-[8px] border-2 border-slate-300 bg-canvas-white py-2 pl-9 pr-3 text-[14px] font-medium text-midnight-ink placeholder:text-fog focus:border-electric-blue focus:outline-none"
            />
          </div>

          {/* Filtro por Método de Pago */}
          <div className="flex flex-wrap items-center gap-1.5">
            {FILTROS_PAGO.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFiltroPago(f.id)}
                className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition ${
                  filtroPago === f.id
                    ? 'bg-electric-blue text-canvas-white shadow-2xs'
                    : 'border border-ash bg-paper-mist text-slate hover:text-midnight-ink'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tabla de Comprobantes */}
        <div className="mt-4 overflow-x-auto rounded-[8px] border border-ash">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-ash bg-paper-mist text-[11px] font-bold uppercase tracking-wider text-slate">
                <th className="whitespace-nowrap px-3 py-2.5">N° Ticket</th>
                <th className="whitespace-nowrap px-3 py-2.5">Fecha y Hora</th>
                <th className="whitespace-nowrap px-3 py-2.5">Método de Pago</th>
                <th className="px-3 py-2.5">Medicamentos Despachados (Lotes FEFO)</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">Unidades Mín.</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">Total Venta</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ash text-[13px]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center font-medium text-slate">
                    Consultando registro de ventas...
                  </td>
                </tr>
              ) : ventasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate">
                    No se encontraron ventas registradas con los filtros seleccionados.
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
                    <tr key={venta.id} className="transition hover:bg-[#eff6ff]/60">
                      <td className="whitespace-nowrap px-3 py-3 font-geist-mono text-[13px] font-bold text-midnight-ink">
                        #{String(venta.id).padStart(6, '0')}
                      </td>

                      <td className="whitespace-nowrap px-3 py-3 font-geist-mono text-[12px] font-medium text-slate">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-electric-blue" />
                          {new Date(venta.fecha_hora).toLocaleString('es-PE', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-3 py-3">
                        <StatusBadge
                          variant={
                            venta.metodo_pago === 'EFECTIVO'
                              ? 'mint'
                              : venta.metodo_pago === 'BILLETERA_DIGITAL'
                                ? 'lavender'
                                : 'blue'
                          }
                          mono
                        >
                          {venta.metodo_pago}
                        </StatusBadge>
                      </td>

                      <td className="px-3 py-3">
                        <div className="space-y-1">
                          {detalles.slice(0, 2).map((det) => {
                            const prod = productosMap[det.producto_id]
                            return (
                              <div
                                key={det.id}
                                className="flex flex-wrap items-center gap-1.5 text-[12px]"
                              >
                                <span className="font-semibold text-midnight-ink">
                                  {prod?.nombre || `Producto #${det.producto_id}`}
                                </span>
                                <span className="whitespace-nowrap rounded-full border border-ash bg-paper-mist px-2 py-0.2 font-geist-mono text-[10px] font-semibold text-slate">
                                  {det.cantidad_presentacion} {det.tipo_presentacion}
                                </span>
                                <span className="whitespace-nowrap font-geist-mono text-[11px] font-semibold text-[#15803d]">
                                  Lote #{det.lote_id}
                                </span>
                              </div>
                            )
                          })}
                          {detalles.length > 2 && (
                            <span className="font-geist-mono text-[11px] font-semibold text-electric-blue">
                              +{detalles.length - 2} ítem(s) adicionales...
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-3 py-3 text-right font-geist-mono text-[12px] font-semibold text-slate">
                        {totalUnidsVenta} u.mín
                      </td>

                      <td className="whitespace-nowrap px-3 py-3 text-right font-geist-mono text-[14px] font-bold text-midnight-ink">
                        S/ {Number(venta.total).toFixed(2)}
                      </td>

                      <td className="whitespace-nowrap px-3 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setVentaDetalle(venta)}
                            className="inline-flex items-center gap-1 whitespace-nowrap rounded-[8px] border border-[#93c5fd] bg-[#eff6ff] px-2.5 py-1.5 text-[12px] font-semibold text-electric-blue hover:bg-electric-blue hover:text-canvas-white"
                            title="Ver desglose FEFO de la venta"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Detalle
                          </button>

                          <button
                            type="button"
                            onClick={() => setVentaTicket(venta)}
                            className="inline-flex items-center gap-1 whitespace-nowrap rounded-[8px] border border-ash bg-canvas-white px-2.5 py-1.5 text-[12px] font-semibold text-midnight-ink hover:bg-paper-mist"
                            title="Imprimir Ticket Térmico 80mm"
                          >
                            <Printer className="h-3.5 w-3.5 text-electric-blue" />
                            Ticket
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

      {/* Modal de Auditoría Detallada de Venta FEFO */}
      <Modal
        isOpen={Boolean(ventaDetalle)}
        onClose={() => setVentaDetalle(null)}
        title={`Detalle de Venta FEFO #${String(ventaDetalle?.id || 0).padStart(6, '0')}`}
        subtitle="Desglose de presentaciones vendidas y lotes descontados automáticamente por fecha de vencimiento."
        maxWidth="max-w-2xl"
      >
        {ventaDetalle && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 rounded-[12px] border border-[#93c5fd] bg-[#eff6ff] p-3 font-geist-mono text-[12px]">
              <div>
                <span className="block text-[10px] font-bold text-slate">FECHA Y HORA</span>
                <span className="font-semibold text-midnight-ink">
                  {new Date(ventaDetalle.fecha_hora).toLocaleString('es-PE')}
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate">MÉTODO DE PAGO</span>
                <span className="font-bold text-electric-blue">
                  {ventaDetalle.metodo_pago}
                </span>
              </div>
              <div className="text-right">
                <span className="block text-[10px] font-bold text-slate">IMPORTE TOTAL</span>
                <span className="whitespace-nowrap text-[16px] font-bold text-midnight-ink">
                  S/ {Number(ventaDetalle.total).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-[12px] border border-ash">
              <table className="w-full border-collapse text-left text-[12px]">
                <thead>
                  <tr className="border-b border-ash bg-paper-mist font-geist-mono text-[11px] font-bold text-slate">
                    <th className="p-2.5">Medicamento</th>
                    <th className="whitespace-nowrap p-2.5">Presentación</th>
                    <th className="whitespace-nowrap p-2.5">Lote FEFO</th>
                    <th className="whitespace-nowrap p-2.5 text-right">Unid. Mínimas</th>
                    <th className="whitespace-nowrap p-2.5 text-right">Precio Pres.</th>
                    <th className="whitespace-nowrap p-2.5 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ash">
                  {(ventaDetalle.detalles || []).map((det) => {
                    const prod = productosMap[det.producto_id]
                    return (
                      <tr key={det.id}>
                        <td className="p-2.5 font-semibold text-midnight-ink">
                          {prod?.nombre || `Producto #${det.producto_id}`}
                        </td>
                        <td className="whitespace-nowrap p-2.5 font-geist-mono font-medium">
                          {det.cantidad_presentacion} × {det.tipo_presentacion}
                        </td>
                        <td className="whitespace-nowrap p-2.5 font-geist-mono">
                          <span className="inline-flex items-center gap-1 rounded-full border border-[#86efac] bg-[#dcfce7] px-2 py-0.5 text-[11px] font-semibold text-[#15803d]">
                            <Layers className="h-3 w-3" />
                            Lote #{det.lote_id}
                          </span>
                        </td>
                        <td className="whitespace-nowrap p-2.5 text-right font-geist-mono font-medium text-slate">
                          -{det.cantidad_unidades} u.mín
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

            <div className="flex justify-end gap-2 border-t border-ash pt-3">
              <button
                type="button"
                onClick={() => setVentaDetalle(null)}
                className="rounded-[8px] border border-ash bg-canvas-white px-4 py-2 text-[13px] font-semibold text-midnight-ink hover:bg-paper-mist"
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
                className="inline-flex items-center gap-2 rounded-[8px] bg-electric-blue px-4 py-2 text-[13px] font-semibold text-canvas-white hover:bg-deep-sapphire"
              >
                <Printer className="h-4 w-4" />
                Ver / Imprimir Ticket 80mm
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de Impresión de Ticket Térmico */}
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
