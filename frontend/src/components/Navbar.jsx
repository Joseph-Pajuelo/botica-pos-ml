import { NavLink, useNavigate } from 'react-router-dom'
import {
  ShoppingCart,
  Receipt,
  Package,
  CalendarClock,
  Sparkles,
  LogOut,
  UserCheck,
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

const ROL_AMIGABLE = {
  ADMIN: 'Administrador',
  FARMACEUTICO: 'Farmacéutico',
  CAJERO: 'Cajero',
}

/**
 * Barra de navegación superior cálida, limpia y centrada en el usuario farmacéutico.
 * Incluye usuario activo y botón discreto de "Cerrar Sesión" (Issue #15).
 */
export function Navbar({ usuario, onLogout }) {
  const navigate = useNavigate()

  const handleLogoutClick = () => {
    if (onLogout) {
      onLogout()
    }
    navigate('/login')
  }

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
                  `inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-2 text-[13.5px] font-semibold transition ${
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

        {/* Perfil de Usuario y Botón Discreto de Cerrar Sesión */}
        <div className="flex items-center gap-2.5">
          {usuario && (
            <div className="hidden items-center gap-2 rounded-full border border-[#e5e0d8] bg-[#faf8f5] px-3 py-1.5 sm:flex">
              <UserCheck className="h-3.5 w-3.5 text-[#0d9488]" />
              <div className="text-[12px] leading-tight">
                <span className="font-bold text-midnight-ink">
                  {usuario.username}
                </span>
                <span className="ml-1.5 rounded-full bg-[#ccfbf1] px-2 py-0.5 text-[10.5px] font-semibold text-[#0f766e]">
                  {ROL_AMIGABLE[usuario.rol] || usuario.rol}
                </span>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleLogoutClick}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[#e5e0d8] bg-white px-3 py-1.5 text-[12.5px] font-semibold text-[#64748b] transition hover:border-[#fca5a5] hover:bg-[#fef2f2] hover:text-[#b91c1c]"
            title="Cerrar sesión activa"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </header>
  )
}
