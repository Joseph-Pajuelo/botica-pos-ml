import { useState, useEffect, useCallback } from 'react'
import {
  Search,
  Plus,
  Edit3,
  PackageCheck,
  AlertTriangle,
  CheckCircle2,
  ScanBarcode,
  RefreshCw,
} from 'lucide-react'
import { productosApi, getErrorMessage } from '../services/api'
import { StatusBadge, Modal } from '../components'

const FORM_INICIAL = {
  codigo_barras: '',
  nombre: '',
  principio_activo: '',
  concentracion: '',
  laboratorio: '',
  precio_venta_caja: '',
  precio_venta_blister: '',
  precio_venta_unitario: '',
  fraccionable: true,
  unidades_por_caja: 100,
  unidades_por_blister: 10,
  stock_minimo: 20,
  activo: true,
}

export function InventarioPage() {
  const [productos, setProductos] = useState([])
  const [stockFefoMap, setStockFefoMap] = useState({})
  const [buscar, setBuscar] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  // Estado del Modal Crear / Editar
  const [modalOpen, setModalOpen] = useState(false)
  const [editandoProducto, setEditandoProducto] = useState(null)
  const [form, setForm] = useState(FORM_INICIAL)
  const [guardando, setGuardando] = useState(false)

  const cargarCatalogo = useCallback(async (termino = '') => {
    setLoading(true)
    setError(null)
    try {
      const lista = await productosApi.listar({ buscar: termino, limit: 100 })
      setProductos(lista)

      const pares = await Promise.all(
        lista.slice(0, 30).map(async (p) => {
          try {
            const { producto } = await productosApi.escanearBarcode(p.codigo_barras)
            return [p.id, producto]
          } catch {
            return [p.id, null]
          }
        })
      )
      const mapa = {}
      pares.forEach(([id, info]) => {
        if (info) mapa[id] = info
      })
      setStockFefoMap(mapa)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargarCatalogo()
  }, [cargarCatalogo])

  const abrirModalNuevo = () => {
    setEditandoProducto(null)
    setForm(FORM_INICIAL)
    setModalOpen(true)
  }

  const abrirModalEditar = (prod) => {
    setEditandoProducto(prod)
    setForm({
      codigo_barras: prod.codigo_barras || '',
      nombre: prod.nombre || '',
      principio_activo: prod.principio_activo || '',
      concentracion: prod.concentracion || '',
      laboratorio: prod.laboratorio || '',
      precio_venta_caja: prod.precio_venta_caja ?? '',
      precio_venta_blister: prod.precio_venta_blister ?? '',
      precio_venta_unitario: prod.precio_venta_unitario ?? '',
      fraccionable: Boolean(prod.fraccionable),
      unidades_por_caja: prod.unidades_por_caja ?? 1,
      unidades_por_blister: prod.unidades_por_blister ?? '',
      stock_minimo: prod.stock_minimo ?? 10,
      activo: Boolean(prod.activo),
    })
    setModalOpen(true)
  }

  const handleSubmitForm = async (e) => {
    e.preventDefault()
    setGuardando(true)
    setError(null)
    setSuccessMsg(null)

    try {
      const payload = {
        codigo_barras: form.codigo_barras.trim(),
        nombre: form.nombre.trim(),
        principio_activo: form.principio_activo.trim() || null,
        concentracion: form.concentracion.trim() || null,
        laboratorio: form.laboratorio.trim() || null,
        precio_venta_caja: Number(form.precio_venta_caja),
        precio_venta_blister:
          form.fraccionable && form.precio_venta_blister !== ''
            ? Number(form.precio_venta_blister)
            : null,
        precio_venta_unitario:
          form.fraccionable && form.precio_venta_unitario !== ''
            ? Number(form.precio_venta_unitario)
            : null,
        fraccionable: Boolean(form.fraccionable),
        unidades_por_caja: form.fraccionable ? Number(form.unidades_por_caja) : 1,
        unidades_por_blister:
          form.fraccionable && form.unidades_por_blister !== ''
            ? Number(form.unidades_por_blister)
            : null,
        stock_minimo: Number(form.stock_minimo || 0),
        activo: Boolean(form.activo),
      }

      if (editandoProducto) {
        const { codigo_barras: _omit, ...updatePayload } = payload
        await productosApi.actualizar(editandoProducto.id, updatePayload)
        setSuccessMsg(`Medicamento "${payload.nombre}" actualizado correctamente.`)
      } else {
        await productosApi.crear(payload)
        setSuccessMsg(`Medicamento "${payload.nombre}" registrado en el catálogo.`)
      }

      setModalOpen(false)
      await cargarCatalogo(buscar)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[12px] border border-ash bg-canvas-white px-5 py-4 shadow-xs">
        <div>
          <h1 className="font-satoshi text-[30px] font-bold leading-[1.15] text-midnight-ink">
            Catálogo Farmacéutico y Fraccionamiento
          </h1>
          <p className="mt-1 text-[14px] text-slate">
            Gestión de presentaciones comerciales (Caja, Blíster, Unidad suelta) y factores de conversión para el Kardex.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => cargarCatalogo(buscar)}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-[8px] border border-ash bg-canvas-white px-3.5 py-2 text-[14px] font-semibold text-midnight-ink hover:bg-paper-mist"
          >
            <RefreshCw className="h-4 w-4 text-electric-blue" />
            Actualizar
          </button>
          <button
            type="button"
            onClick={abrirModalNuevo}
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-[8px] bg-electric-blue px-4 py-2 text-[14px] font-semibold text-canvas-white shadow-xs hover:bg-deep-sapphire"
          >
            <Plus className="h-4 w-4" />
            Nuevo Medicamento
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

      {/* Barra de Búsqueda */}
      <div className="rounded-[12px] border border-ash bg-canvas-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-[260px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-electric-blue" />
            <input
              type="text"
              value={buscar}
              onChange={(e) => {
                setBuscar(e.target.value)
                cargarCatalogo(e.target.value)
              }}
              placeholder="Filtrar por código de barras EAN, nombre comercial o principio activo..."
              className="w-full rounded-[8px] border-2 border-slate-300 bg-canvas-white py-2 pl-9 pr-3 text-[14px] font-medium text-midnight-ink placeholder:text-fog focus:border-electric-blue focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 rounded-full border border-[#93c5fd] bg-[#eff6ff] px-3 py-1 font-geist-mono text-[12px] font-semibold text-deep-sapphire">
            <PackageCheck className="h-4 w-4 text-electric-blue" />
            <span>{productos.length} SKUs registrados</span>
          </div>
        </div>

        {/* Tabla de Productos */}
        <div className="mt-4 overflow-x-auto rounded-[8px] border border-ash">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-ash bg-paper-mist text-[11px] font-bold uppercase tracking-wider text-slate">
                <th className="whitespace-nowrap px-3 py-2.5">Código EAN</th>
                <th className="px-3 py-2.5">Medicamento / Laboratorio</th>
                <th className="whitespace-nowrap px-3 py-2.5">Fraccionamiento</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">Caja</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">Blíster</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">Unidad</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">Stock FEFO</th>
                <th className="whitespace-nowrap px-3 py-2.5">Lote Activo</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">Editar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ash text-[13px]">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center font-medium text-slate">
                    Cargando catálogo de medicamentos...
                  </td>
                </tr>
              ) : productos.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate">
                    No se encontraron medicamentos con ese criterio.
                  </td>
                </tr>
              ) : (
                productos.map((prod) => {
                  const infoFefo = stockFefoMap[prod.id]
                  const stockActual = infoFefo?.stock_total_vigente ?? 0
                  const bajoMinimo = stockActual < prod.stock_minimo

                  return (
                    <tr key={prod.id} className="transition hover:bg-[#eff6ff]/60">
                      <td className="whitespace-nowrap px-3 py-3 font-geist-mono text-[12px] font-semibold text-midnight-ink">
                        <span className="inline-flex items-center gap-1 rounded-[6px] border border-ash bg-paper-mist px-2 py-0.5">
                          <ScanBarcode className="h-3 w-3 text-electric-blue" />
                          {prod.codigo_barras}
                        </span>
                      </td>

                      <td className="px-3 py-3">
                        <div className="font-bold text-midnight-ink">{prod.nombre}</div>
                        <div className="text-[12px] text-slate">
                          {prod.principio_activo || 'Sin principio activo'} ·{' '}
                          {prod.concentracion || ''} ·{' '}
                          <span className="font-semibold text-deep-sapphire">
                            {prod.laboratorio || 'S/L'}
                          </span>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-3 py-3">
                        {prod.fraccionable ? (
                          <div className="space-y-0.5 font-geist-mono text-[11px]">
                            <StatusBadge variant="blue" mono withDot={false}>
                              Fraccionable
                            </StatusBadge>
                            <div className="font-medium text-slate">
                              Caja={prod.unidades_por_caja}u
                              {prod.unidades_por_blister
                                ? ` · Blís=${prod.unidades_por_blister}u`
                                : ''}
                            </div>
                          </div>
                        ) : (
                          <StatusBadge variant="neutral" mono withDot={false}>
                            Indivisible (1u)
                          </StatusBadge>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-3 py-3 text-right font-geist-mono text-[13px] font-bold text-midnight-ink">
                        S/ {Number(prod.precio_venta_caja).toFixed(2)}
                      </td>

                      <td className="whitespace-nowrap px-3 py-3 text-right font-geist-mono text-[13px] font-semibold text-deep-sapphire">
                        {prod.precio_venta_blister
                          ? `S/ ${Number(prod.precio_venta_blister).toFixed(2)}`
                          : '—'}
                      </td>

                      <td className="whitespace-nowrap px-3 py-3 text-right font-geist-mono text-[13px] font-semibold text-vivid-green">
                        {prod.precio_venta_unitario
                          ? `S/ ${Number(prod.precio_venta_unitario).toFixed(2)}`
                          : '—'}
                      </td>

                      <td className="whitespace-nowrap px-3 py-3 text-right font-geist-mono">
                        <div className="text-[14px] font-bold text-midnight-ink">
                          {stockActual}{' '}
                          <span className="text-[11px] font-normal text-slate">u.mín</span>
                        </div>
                        <div className="text-[11px] text-fog">
                          Mín: {prod.stock_minimo}u
                        </div>
                        {bajoMinimo && (
                          <StatusBadge variant="tangerine" mono>
                            Bajo Mínimo
                          </StatusBadge>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-3 py-3 font-geist-mono text-[12px]">
                        {infoFefo?.lote_fefo_numero ? (
                          <div>
                            <StatusBadge variant="mint" mono>
                              {infoFefo.lote_fefo_numero}
                            </StatusBadge>
                            <div className="mt-0.5 text-[11px] font-medium text-slate">
                              Vence: {infoFefo.proximo_vencimiento}
                            </div>
                          </div>
                        ) : (
                          <StatusBadge variant="danger" mono>
                            Sin Lote Vigente
                          </StatusBadge>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-3 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => abrirModalEditar(prod)}
                          className="inline-flex items-center gap-1 whitespace-nowrap rounded-[8px] border border-[#93c5fd] bg-[#eff6ff] px-2.5 py-1.5 text-[12px] font-semibold text-electric-blue hover:bg-electric-blue hover:text-canvas-white"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          Editar
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear / Editar Medicamento */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editandoProducto ? 'Editar Medicamento' : 'Registrar Nuevo Medicamento'}
        subtitle="Define las unidades mínimas de control y los precios por presentación comercial."
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmitForm} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[12px] font-semibold text-midnight-ink">
                Código de Barras (EAN-13 / Interno) *
              </label>
              <input
                type="text"
                required
                disabled={Boolean(editandoProducto)}
                value={form.codigo_barras}
                onChange={(e) =>
                  setForm({ ...form, codigo_barras: e.target.value })
                }
                placeholder="7750100000099"
                className="mt-1 w-full rounded-[6px] border-2 border-slate-300 bg-canvas-white px-3 py-1.5 font-geist-mono text-[13px] disabled:bg-paper-mist disabled:text-fog"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-midnight-ink">
                Laboratorio Farmacéutico
              </label>
              <input
                type="text"
                value={form.laboratorio}
                onChange={(e) =>
                  setForm({ ...form, laboratorio: e.target.value })
                }
                placeholder="Ej. Portugal, Genfar, GSK"
                className="mt-1 w-full rounded-[6px] border-2 border-slate-300 bg-canvas-white px-3 py-1.5 text-[13px]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[12px] font-semibold text-midnight-ink">
                Nombre Comercial Completo *
              </label>
              <input
                type="text"
                required
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Ej. Paracetamol 500mg Caja x 100 Tabletas"
                className="mt-1 w-full rounded-[6px] border-2 border-slate-300 bg-canvas-white px-3 py-1.5 text-[13px]"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-midnight-ink">
                Principio Activo (DCI)
              </label>
              <input
                type="text"
                value={form.principio_activo}
                onChange={(e) =>
                  setForm({ ...form, principio_activo: e.target.value })
                }
                placeholder="Ej. Paracetamol"
                className="mt-1 w-full rounded-[6px] border-2 border-slate-300 bg-canvas-white px-3 py-1.5 text-[13px]"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-midnight-ink">
                Concentración
              </label>
              <input
                type="text"
                value={form.concentracion}
                onChange={(e) =>
                  setForm({ ...form, concentracion: e.target.value })
                }
                placeholder="Ej. 500mg"
                className="mt-1 w-full rounded-[6px] border-2 border-slate-300 bg-canvas-white px-3 py-1.5 text-[13px]"
              />
            </div>
          </div>

          {/* Configuración de Fraccionamiento */}
          <div className="rounded-[12px] border border-[#93c5fd] bg-[#eff6ff] p-3.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[13px] font-bold text-midnight-ink">
                  ¿Medicamento Fraccionable en Mostrador?
                </span>
                <p className="text-[11px] text-slate">
                  Permite vender por Blíster o Unidad suelta descontando la unidad mínima del lote FEFO.
                </p>
              </div>
              <input
                type="checkbox"
                checked={form.fraccionable}
                onChange={(e) =>
                  setForm({ ...form, fraccionable: e.target.checked })
                }
                className="h-4 w-4 accent-electric-blue"
              />
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-[11px] font-semibold text-midnight-ink">
                  Unidades por Caja *
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  disabled={!form.fraccionable}
                  value={form.fraccionable ? form.unidades_por_caja : 1}
                  onChange={(e) =>
                    setForm({ ...form, unidades_por_caja: e.target.value })
                  }
                  className="mt-1 w-full rounded-[6px] border-2 border-slate-300 bg-canvas-white px-2.5 py-1.5 font-geist-mono text-[13px] disabled:bg-ash/40"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-midnight-ink">
                  Unidades por Blíster
                </label>
                <input
                  type="number"
                  min={1}
                  disabled={!form.fraccionable}
                  value={form.fraccionable ? form.unidades_por_blister : ''}
                  onChange={(e) =>
                    setForm({ ...form, unidades_por_blister: e.target.value })
                  }
                  placeholder="10"
                  className="mt-1 w-full rounded-[6px] border-2 border-slate-300 bg-canvas-white px-2.5 py-1.5 font-geist-mono text-[13px] disabled:bg-ash/40"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-midnight-ink">
                  Stock Mínimo (u. mín) *
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={form.stock_minimo}
                  onChange={(e) =>
                    setForm({ ...form, stock_minimo: e.target.value })
                  }
                  className="mt-1 w-full rounded-[6px] border-2 border-slate-300 bg-canvas-white px-2.5 py-1.5 font-geist-mono text-[13px]"
                />
              </div>
            </div>
          </div>

          {/* Precios por Presentación */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-[12px] font-semibold text-midnight-ink">
                Precio Venta Caja (S/) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={form.precio_venta_caja}
                onChange={(e) =>
                  setForm({ ...form, precio_venta_caja: e.target.value })
                }
                placeholder="25.00"
                className="mt-1 w-full rounded-[6px] border-2 border-slate-300 bg-canvas-white px-3 py-1.5 font-geist-mono text-[13px]"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-midnight-ink">
                Precio Venta Blíster (S/)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                disabled={!form.fraccionable}
                value={form.fraccionable ? form.precio_venta_blister : ''}
                onChange={(e) =>
                  setForm({ ...form, precio_venta_blister: e.target.value })
                }
                placeholder="3.00"
                className="mt-1 w-full rounded-[6px] border-2 border-slate-300 bg-canvas-white px-3 py-1.5 font-geist-mono text-[13px] disabled:bg-paper-mist"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-midnight-ink">
                Precio Venta Unidad (S/)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                disabled={!form.fraccionable}
                value={form.fraccionable ? form.precio_venta_unitario : ''}
                onChange={(e) =>
                  setForm({ ...form, precio_venta_unitario: e.target.value })
                }
                placeholder="0.35"
                className="mt-1 w-full rounded-[6px] border-2 border-slate-300 bg-canvas-white px-3 py-1.5 font-geist-mono text-[13px] disabled:bg-paper-mist"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-ash pt-4">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-[8px] border border-ash bg-canvas-white px-4 py-2 text-[14px] font-semibold text-midnight-ink hover:bg-paper-mist"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="rounded-[8px] bg-electric-blue px-4 py-2 text-[14px] font-semibold text-canvas-white hover:bg-deep-sapphire disabled:opacity-50"
            >
              {guardando ? 'Guardando...' : 'Guardar Medicamento'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
