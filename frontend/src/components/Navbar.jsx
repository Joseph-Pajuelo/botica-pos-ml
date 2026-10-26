import { NavLink } from 'react-router-dom'
import {
  ShoppingCart,
  Receipt,
  Package,
  CalendarClock,
  Sparkles,
} from 'lucide-react'
import { BoticaLogo } from './BoticaLogo'

const NAV_ITEMS = [
  {
    to: '/',
    label: 'Realizar Venta',
    icon: ShoppingCart,
  },
  {
    to: '/ventas',
    label: 'Ventas y Caja',
    icon: Receipt,
  },
  {
    to: '/inventario',
    label: 'Medicamentos',
    icon: Package,
  },
  {
    to: '/lotes-kardex',
    label: 'Lotes y Vencimientos',
    icon: CalendarClock,
  },
  {
    to: '/ml-dashboard',
    label: 'Compras Sugeridas',
    icon: Sparkles,
  },
]

/**
 * Barra de navegación superior cálida, limpia y centrada en el usuario farmacéutico.
 * Se eliminaron los indicadores técnicos (FEFO+ML, HID: ACTIVO, F1-F5) según Issue #9.
 */
export function Navbar() {
  return (
    <header className="no-print sticky top-0 z-30 border-b border-[#e5e0d8] border-t-4 border-t-[#0d9488] bg-[#ffffff]/95 backdrop-blur-xs shadow-2xs">
      <div className="mx-auto flex max-w-[1260px] flex-wrap items-center justify-between gap-4 px-6 py-3">
        {/* Logotipo Propio de la Botica */}
        <NavLink to="/" className="focus:outline-none">
          <BoticaLogo size="md" showTagline />
        </NavLink>

        {/* Navegación Principal Limpia y Amigable */}
        <nav className="flex flex-wrap items-center gap-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `inline-flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-[13.5px] font-semibold transition ${
                    isActive
                      ? 'bg-[#0d9488] text-white shadow-xs'
                      : 'text-[#475569] hover:bg-[#f0fdfa] hover:text-[#0f766e]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`h-4 w-4 ${
                        isActive ? 'text-white' : 'text-[#0d9488]'
                      }`}
                    />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
