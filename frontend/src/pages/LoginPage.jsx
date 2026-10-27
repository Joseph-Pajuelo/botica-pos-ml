import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Lock,
  User,
  LogIn,
  AlertTriangle,
  ShieldCheck,
  UserCheck,
  Store,
} from 'lucide-react'
import { BoticaLogo } from '../components'
import { authApi, getErrorMessage } from '../services/api'

const CUENTAS_DEMO = [
  {
    username: 'cajero',
    password: 'caja123',
    rol: 'CAJERO',
    titulo: 'Cajero de Mostrador',
    descripcion: 'Atención rápida y ventas',
    icon: Store,
  },
  {
    username: 'farmaceutico',
    password: 'farma123',
    rol: 'FARMACEUTICO',
    titulo: 'Químico Farmacéutico',
    descripcion: 'Control de lotes y compras',
    icon: UserCheck,
  },
  {
    username: 'admin',
    password: 'admin123',
    rol: 'ADMIN',
    titulo: 'Administrador',
    descripcion: 'Acceso total a la botica',
    icon: ShieldCheck,
  },
]

export function LoginPage({ onLoginSuccess }) {
  const navigate = useNavigate()
  const [username, setUsername] = useState('cajero')
  const [password, setPassword] = useState('caja123')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const ejecutarLogin = async (userValue, passValue) => {
    setLoading(true)
    setError(null)
    try {
      const data = await authApi.login({
        username: userValue,
        password: passValue,
      })
      if (onLoginSuccess) {
        onLoginSuccess(data.usuario)
      }
      navigate('/', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username.trim() || !password) return
    await ejecutarLogin(username, password)
  }

  const seleccionarCuentaRapida = async (cuenta) => {
    setUsername(cuenta.username)
    setPassword(cuenta.password)
    await ejecutarLogin(cuenta.username, cuenta.password)
  }

  return (
    <div className="flex min-h-[82vh] items-center justify-center px-4 py-8">
      <div className="w-full max-w-[460px] rounded-[18px] border border-[#e5e0d8] border-t-4 border-t-[#0d9488] bg-canvas-white p-7 shadow-sm">
        {/* Cabecera con Logotipo Propio */}
        <div className="flex flex-col items-center text-center">
          <BoticaLogo size="lg" showTagline />
          <h1 className="mt-5 font-satoshi text-[24px] font-bold text-midnight-ink">
            Bienvenido al Sistema de la Botica
          </h1>
          <p className="mt-1 text-[13.5px] text-slate">
            Ingresa con tu usuario para atender en mostrador y gestionar medicamentos
          </p>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-[10px] border border-[#fca5a5] bg-[#fee2e2] px-3.5 py-2.5 text-[13px] font-medium text-[#b91c1c]">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Formulario de Inicio de Sesión */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-slate">
              Usuario
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-[#0d9488]" />
              <input
                type="text"
                required
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ej. cajero, farmaceutico o admin"
                className="w-full rounded-[10px] border-2 border-[#cbd5e1] bg-[#faf8f5] py-2.5 pl-10 pr-3.5 text-[14px] font-medium text-midnight-ink focus:border-[#0d9488] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-slate">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-[#0d9488]" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa tu contraseña"
                className="w-full rounded-[10px] border-2 border-[#cbd5e1] bg-[#faf8f5] py-2.5 pl-10 pr-3.5 text-[14px] font-medium text-midnight-ink focus:border-[#0d9488] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#0d9488] px-4 py-3 text-[15px] font-semibold text-white shadow-xs transition hover:bg-[#0f766e] disabled:opacity-50"
          >
            <LogIn className="h-4 w-4" />
            <span>{loading ? 'Ingresando...' : 'Iniciar Sesión'}</span>
          </button>
        </form>

        {/* Cuentas rápidas disponibles */}
        <div className="mt-6 border-t border-[#e5e0d8] pt-4">
          <p className="text-center text-[11.5px] font-bold uppercase tracking-wider text-slate">
            Ingreso rápido con cuentas de prueba
          </p>
          <div className="mt-2.5 grid grid-cols-1 gap-2">
            {CUENTAS_DEMO.map((cuenta) => {
              const Icon = cuenta.icon
              const activa = username === cuenta.username
              return (
                <button
                  key={cuenta.username}
                  type="button"
                  disabled={loading}
                  onClick={() => seleccionarCuentaRapida(cuenta)}
                  className={`flex items-center justify-between rounded-[10px] border px-3.5 py-2 text-left transition ${
                    activa
                      ? 'border-[#0d9488] bg-[#f0fdfa]'
                      : 'border-[#e5e0d8] bg-[#faf8f5] hover:border-[#99f6e4] hover:bg-[#f0fdfa]/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ccfbf1] text-[#0f766e]">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-[13px] font-bold text-midnight-ink">
                        {cuenta.titulo}
                      </div>
                      <div className="text-[11px] text-slate">
                        {cuenta.descripcion}
                      </div>
                    </div>
                  </div>
                  <div className="text-right font-geist-mono text-[11px] text-[#0f766e]">
                    <span className="font-bold">{cuenta.username}</span> /{' '}
                    <span>{cuenta.password}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
