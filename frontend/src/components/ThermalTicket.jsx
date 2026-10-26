import { Printer, X, CheckCircle2 } from 'lucide-react'
import { BoticaLogo } from './BoticaLogo'

const PRESENTACION_AMIGABLE = {
  CAJA: 'Caja',
  BLISTER: 'Blíster',
  UNIDAD: 'Unidad',
}

const PAGO_AMIGABLE = {
  EFECTIVO: 'Efectivo',
  BILLETERA_DIGITAL: 'Yape / Plin',
  TARJETA: 'Tarjeta',
}

/**
 * Comprobante de Venta en formato Térmico (80mm / 58mm) con logotipo propio y lenguaje claro.
 */
export function ThermalTicket({ venta, productosMap = {}, onClose }) {
  if (!venta) return null

  const fechaFormateada = new Date(venta.fecha_hora).toLocaleString('es-PE', {
    dateStyle: 'short',
    timeStyle: 'short',
  })

  const handlePrint = () => {
    window.print()
  }

  return (
    <>
      {/* Modal de vista previa en pantalla */}
      <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-midnight-ink/40 p-4 backdrop-blur-[1px]">
        <div className="w-full max-w-md rounded-[16px] border border-[#e5e0d8] bg-canvas-white p-6 shadow-lg">
          <div className="flex items-center justify-between border-b border-[#e5e0d8] pb-3">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-[#059669]" />
              <div>
                <h3 className="text-[16px] font-bold text-midnight-ink">
                  ¡Venta Registrada con Éxito!
                </h3>
                <p className="text-[12px] text-slate">
                  Comprobante #{String(venta.id).padStart(6, '0')} listo para entregar al cliente
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-[8px] border border-ash p-1.5 text-steel hover:bg-paper-mist hover:text-charcoal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Vista previa del ticket con el Logotipo Propio */}
          <div className="my-4 max-h-[60vh] overflow-y-auto rounded-[12px] border border-[#e5e0d8] bg-[#faf8f5] p-4 font-geist-mono text-[12px] text-charcoal">
            <div className="flex flex-col items-center text-center">
              <BoticaLogo size="sm" showTagline={false} />
              <p className="mt-1 text-[11px] text-steel">RUC: 20609876541</p>
              <p className="text-[11px] text-steel">Atención Farmacéutica de Confianza</p>
              <p className="mt-2 w-full border-y border-dashed border-pebble py-1 text-[11px] font-bold">
                BOLETA DE VENTA #{String(venta.id).padStart(6, '0')}
              </p>
            </div>

            <div className="mt-2 space-y-0.5 text-[11px] text-steel">
              <div className="flex justify-between">
                <span>FECHA Y HORA:</span>
                <span className="font-semibold text-charcoal">{fechaFormateada}</span>
              </div>
              <div className="flex justify-between">
                <span>MEDIO DE PAGO:</span>
                <span className="font-semibold text-charcoal">
                  {PAGO_AMIGABLE[venta.metodo_pago] || venta.metodo_pago}
                </span>
              </div>
            </div>

            <div className="my-2 border-t border-dashed border-pebble pt-2">
              <div className="flex justify-between text-[10px] font-bold text-steel">
                <span>MEDICAMENTO / PRESENTACIÓN</span>
                <span>IMPORTE</span>
              </div>
              <div className="mt-1.5 space-y-2">
                {(venta.detalles || []).map((det) => {
                  const prod = productosMap[det.producto_id]
                  const nombreProd =
                    det.nombre_producto ||
                    prod?.nombre ||
                    `Medicamento #${det.producto_id}`
                  return (
                    <div key={det.id} className="text-[11px]">
                      <div className="font-semibold text-charcoal">{nombreProd}</div>
                      <div className="flex justify-between text-steel">
                        <span>
                          {det.cantidad_presentacion}{' '}
                          {PRESENTACION_AMIGABLE[det.tipo_presentacion] ||
                            det.tipo_presentacion}{' '}
                          ({det.cantidad_unidades} unds)
                        </span>
                        <span className="font-bold text-charcoal">
                          S/ {Number(det.subtotal).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-dashed border-charcoal pt-2 text-[14px] font-bold text-charcoal">
              <span>TOTAL PAGADO</span>
              <span>S/ {Number(venta.total).toFixed(2)}</span>
            </div>

            <p className="mt-3 text-center text-[10px] text-steel">
              ¡Gracias por su preferencia! · Conserve su comprobante
            </p>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[8px] border border-ash bg-canvas-white px-4 py-2 text-[14px] font-medium text-charcoal hover:bg-paper-mist"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-[8px] bg-[#0d9488] px-4 py-2 text-[14px] font-semibold text-white shadow-xs hover:bg-[#0f766e]"
            >
              <Printer className="h-4 w-4" />
              Imprimir Comprobante
            </button>
          </div>
        </div>
      </div>

      {/* Hoja exclusiva para disparo @media print en impresora térmica */}
      <div className="print-only hidden thermal-ticket-sheet">
        <div style={{ textAlign: 'center', marginBottom: '6px' }}>
          <BoticaLogo monochrome showTagline={false} />
          <div style={{ fontWeight: 700, fontSize: '13px', marginTop: '4px' }}>
            BOTICA SALUD & VIDA
          </div>
          <div>RUC: 20609876541</div>
          <div>COMPROBANTE #{String(venta.id).padStart(6, '0')}</div>
          <div>{fechaFormateada}</div>
          <div>PAGO: {PAGO_AMIGABLE[venta.metodo_pago] || venta.metodo_pago}</div>
        </div>
        <hr style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />
        {(venta.detalles || []).map((det) => {
          const prod = productosMap[det.producto_id]
          const nombreProd =
            det.nombre_producto || prod?.nombre || `Medicamento #${det.producto_id}`
          return (
            <div key={det.id} style={{ marginBottom: '4px' }}>
              <div>{nombreProd}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>
                  {det.cantidad_presentacion}{' '}
                  {PRESENTACION_AMIGABLE[det.tipo_presentacion] ||
                    det.tipo_presentacion}{' '}
                  ({det.cantidad_unidades} unds)
                </span>
                <span>S/ {Number(det.subtotal).toFixed(2)}</span>
              </div>
            </div>
          )
        })}
        <hr style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontWeight: 700,
            fontSize: '13px',
          }}
        >
          <span>TOTAL S/</span>
          <span>{Number(venta.total).toFixed(2)}</span>
        </div>
        <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '10px' }}>
          ¡Gracias por su compra! · Botica Salud & Vida
        </div>
      </div>
    </>
  )
}
