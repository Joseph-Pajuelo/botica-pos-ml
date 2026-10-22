import { NavLink } from 'react-router-dom'
import {
  ShoppingCart,
  Receipt,
  Package,
  Layers,
  Sparkles,
  ScanBarcode,
  DatabaseZap,
} from 'lucide-react'
import { StatusBadge } from './StatusBadge'

const NAV_ITEMS = [
  {
    to: '/',
    label: 'Mostrador POS',
    shortcut: 'F1',
    icon: ShoppingCart,
  },
  {
    to: '/ventas',
    label: 'Ventas y Caja',
    shortcut: 'F2',
    icon: Receipt,
  },
  {
    to: '/inventario',
    label: 'Catálogo',
    shortcut: 'F3',
    icon: Package,
  },
  {
    to: '/lotes-kardex',
    label: 'Lotes FEFO & Kardex',
    shortcut: 'F4',
    icon: Layers,
  },
  {
    to: '/ml-dashboard',
    label: 'Predicción ML',
    shortcut: 'F5',
    icon: Sparkles,
  },
]

/**
 * Barra de navegación superior con alto contraste visual.
 */
export function Navbar({
  scannerStatus = 'LISTO',
  lastScannedCode = null,
  onSeedColdStart,
  isSeeding = false,
}) {
  return (
    <header className="no-print sticky top-0 z-30 border-b border-ash border-t-4 border-t-electric-blue bg-canvas-white shadow-xs">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-3 px-6 py-3">
        {/* Identidad de Marca */}
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-[8px] bg-electric-blue font-geist-mono text-[14px] font-bold text-canvas-white shadow-xs">
            Rx
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[18px] font-bold tracking-tight text-midnight-ink">
              Botica<span className="text-electric-blue">POS</span>
            </span>
            <StatusBadge variant="mint" mono>
              FEFO + ML
            </StatusBadge>
          </div>
        </div>

        {/* Navegación Principal con estado activo en Azul Eléctrico */}
        <nav className="flex flex-wrap items-center gap-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition ${
                    isActive
                      ? 'bg-electric-blue text-canvas-white shadow-xs'
                      : 'text-slate hover:bg-paper-mist hover:text-midnight-ink'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`h-4 w-4 ${
                        isActive ? 'text-canvas-white' : 'text-electric-blue'
                      }`}
                    />
                    <span>{item.label}</span>
                    <kbd
                      className={`rounded-[6px] px-1.5 py-0.2 font-geist-mono text-[10px] font-semibold ${
                        isActive
                          ? 'bg-deep-sapphire text-canvas-white'
                          : 'border border-ash bg-paper-mist text-steel'
                      }`}
                    >
                      {item.shortcut}
                    </kbd>
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Estado de Hardware HID y Seed Demo */}
        <div className="flex items-center gap-2">
          <div
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 font-geist-mono text-[12px] font-semibold transition ${
              scannerStatus === 'ESCANEANDO'
                ? 'border-[#16a34a] bg-[#dcfce7] text-[#15803d]'
                : 'border-[#86efac] bg-[#f0fdf4] text-[#15803d]'
            }`}
            title="El lector de código de barras USB (HID) es escuchado globalmente"
          >
            <ScanBarcode className="h-3.5 w-3.5" />
            <span>
              HID: {scannerStatus === 'ESCANEANDO' ? 'LECTURA OK' : 'ACTIVO'}
            </span>
            {lastScannedCode && (
              <span className="font-bold text-midnight-ink">· {lastScannedCode}</span>
            )}
          </div>

          {onSeedColdStart && (
            <button
              type="button"
              onClick={onSeedColdStart}
              disabled={isSeeding}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-[8px] border border-[#c4b5fd] bg-[#f5f3ff] px-3 py-1.5 text-[12px] font-semibold text-[#6d28d9] transition hover:bg-[#ede9fe] disabled:opacity-50"
              title="Inyectar catálogo semilla y 12 meses de ventas simuladas (Cold Start)"
            >
              <DatabaseZap className="h-3.5 w-3.5 text-[#7c3aed]" />
              <span>{isSeeding ? 'Cargando datos...' : 'Datos Demo'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
