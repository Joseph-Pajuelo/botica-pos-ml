import { Printer, X, CheckCircle2 } from 'lucide-react'

/**
 * Comprobante de Venta en formato Térmico (80mm / 58mm) con soporte @media print.
 * Muestra el desglose de lotes FEFO descontados y el fraccionamiento aplicado.
 */
export function ThermalTicket({ venta, productosMap = {}, onClose }) {
  if (!venta) return null

  const fechaFormateada = new Date(venta.fecha_hora).toLocaleString('es-PE', {
    dateStyle: 'short',
    timeStyle: 'medium',
  })

  const handlePrint = () => {
    window.print()
  }

  return (
    <>
      {/* Modal de vista previa en pantalla */}
      <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-midnight-ink/40 p-4 backdrop-blur-[1px]">
        <div className="w-full max-w-md rounded-[16px] border border-ash bg-canvas-white p-6 shadow-[0_0_0_4px_rgba(0,0,0,0.08)]">
          <div className="flex items-center justify-between border-b border-ash pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-vivid-green" />
              <div>
                <h3 className="text-[16px] font-semibold text-charcoal">
                  Venta FEFO #{venta.id} Registrada
                </h3>
                <p className="text-[12px] text-steel">
                  Kardex actualizado y lotes descontados por vencimiento
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

          {/* Vista previa del ticket térmico */}
          <div className="my-4 max-h-[60vh] overflow-y-auto rounded-[12px] border border-ash bg-paper-mist p-4 font-geist-mono text-[12px] text-charcoal">
            <div className="text-center">
              <p className="text-[14px] font-semibold">BOTICA POS - SALUD & VIDA</p>
              <p className="text-[11px] text-steel">RUC: 20609876541</p>
              <p className="text-[11px] text-steel">Control Farmacéutico FEFO</p>
              <p className="mt-1 border-y border-dashed border-pebble py-1 text-[11px]">
                TICKET DE VENTA #{String(venta.id).padStart(6, '0')}
              </p>
            </div>

            <div className="mt-2 space-y-0.5 text-[11px] text-steel">
              <div className="flex justify-between">
                <span>FECHA:</span>
                <span className="text-charcoal">{fechaFormateada}</span>
              </div>
              <div className="flex justify-between">
                <span>PAGO:</span>
                <span className="text-charcoal">{venta.metodo_pago}</span>
              </div>
            </div>

            <div className="my-2 border-t border-dashed border-pebble pt-2">
              <div className="flex justify-between text-[10px] font-semibold text-steel">
                <span>DESCRIPCIÓN (LOTE FEFO)</span>
                <span>IMPORTE</span>
              </div>
              <div className="mt-1.5 space-y-2">
                {(venta.detalles || []).map((det) => {
                  const prod = productosMap[det.producto_id]
                  const nombreProd =
                    det.nombre_producto ||
                    prod?.nombre ||
                    `Medicamento ID #${det.producto_id}`
                  return (
                    <div key={det.id} className="text-[11px]">
                      <div className="font-medium text-charcoal">{nombreProd}</div>
                      <div className="flex justify-between text-steel">
                        <span>
                          {det.cantidad_presentacion} {det.tipo_presentacion} ({det.cantidad_unidades} u.mín) · Lote #{det.lote_id}
                        </span>
                        <span className="font-medium text-charcoal">
                          S/ {Number(det.subtotal).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-dashed border-charcoal pt-2 text-[14px] font-semibold text-charcoal">
              <span>TOTAL PAGADO</span>
              <span>S/ {Number(venta.total).toFixed(2)}</span>
            </div>

            <p className="mt-3 text-center text-[10px] text-steel">
              Conserve su ticket · Verifique su medicamento antes de retirarse
            </p>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[8px] border border-ash bg-canvas-white px-4 py-2 text-[14px] font-medium text-charcoal hover:bg-paper-mist"
            >
              Cerrar (Esc)
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-[8px] bg-primary-action-fill px-4 py-2 text-[14px] font-medium text-canvas-white shadow-[var(--shadow-subtle)] hover:bg-midnight-ink"
            >
              <Printer className="h-4 w-4" />
              Imprimir Ticket 80mm
            </button>
          </div>
        </div>
      </div>

      {/* Hoja exclusiva para disparo @media print en impresora térmica */}
      <div className="print-only hidden thermal-ticket-sheet">
        <div style={{ textAlign: 'center', marginBottom: '6px' }}>
          <div style={{ fontWeight: 700, fontSize: '13px' }}>BOTICA POS - SALUD & VIDA</div>
          <div>RUC: 20609876541</div>
          <div>TICKET #{String(venta.id).padStart(6, '0')}</div>
          <div>{fechaFormateada}</div>
          <div>PAGO: {venta.metodo_pago}</div>
        </div>
        <hr style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />
        {(venta.detalles || []).map((det) => {
          const prod = productosMap[det.producto_id]
          const nombreProd =
            det.nombre_producto || prod?.nombre || `Producto #${det.producto_id}`
          return (
            <div key={det.id} style={{ marginBottom: '4px' }}>
              <div>{nombreProd}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>
                  {det.cantidad_presentacion} {det.tipo_presentacion} ({det.cantidad_unidades}u) L#{det.lote_id}
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
          Dispensado bajo norma FEFO · Gracias por su compra
        </div>
      </div>
    </>
  )
}
