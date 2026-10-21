export default function App() {
  return (
    <div className="min-h-screen bg-canvas-white text-charcoal">
      {/* Top Navbar following DesingBotica.md (Dub Style) */}
      <header className="border-b border-ash bg-canvas-white px-6 py-3">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-[8px] bg-midnight-ink font-geist-mono text-xs font-medium text-canvas-white">
              Rx
            </span>
            <span className="text-[16px] font-medium tracking-tight text-charcoal">
              Botica<span className="text-electric-blue">POS</span>
            </span>
            <span className="rounded-full bg-soft-mint px-2.5 py-0.5 font-geist-mono text-[11px] font-medium text-vivid-green">
              FEFO + ML Ready
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full border border-ash bg-paper-mist px-3 py-1 font-geist-mono text-[12px] text-steel">
              Lector HID: Activo
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-[1200px] px-6 py-10">
        <div className="rounded-[12px] border border-ash bg-canvas-white p-6">
          <h1 className="font-satoshi text-[36px] leading-[1.11] font-medium text-charcoal">
            Sistema Web de Inventario FEFO y Punto de Venta
          </h1>
          <p className="mt-2 text-[16px] leading-[1.5] text-steel">
            Estructura base inicializada bajo el sistema de diseño Dub (<code className="font-geist-mono text-[13px] text-charcoal">DesingBotica.md</code>).
          </p>
        </div>
      </main>
    </div>
  )
}
