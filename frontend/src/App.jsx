import { useState } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from 'react-router-dom'
import { Navbar } from './components'
import {
  POSPage,
  VentasPage,
  InventarioPage,
  LotesKardexPage,
  MLDashboardPage,
  LoginPage,
} from './pages'
import { useKeyboardShortcuts } from './hooks'
import { authApi } from './services/api'

function AppShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const [usuario, setUsuario] = useState(() => authApi.getStoredUser())
  const isAuthenticated = Boolean(usuario && authApi.getStoredToken())
  const isLoginRoute = location.pathname === '/login'

  const handleLogout = () => {
    authApi.logout()
    setUsuario(null)
  }

  // Atajos de teclado discretos en segundo plano (activos solo dentro de sesión)
  useKeyboardShortcuts({
    F1: () => isAuthenticated && navigate('/'),
    F2: () => isAuthenticated && navigate('/ventas'),
    F3: () => isAuthenticated && navigate('/inventario'),
    F4: () => isAuthenticated && navigate('/lotes-kardex'),
    F5: () => isAuthenticated && navigate('/ml-dashboard'),
  })

  if (!isAuthenticated && !isLoginRoute) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-dub-dots text-charcoal">
      {!isLoginRoute && <Navbar usuario={usuario} onLogout={handleLogout} />}

      <main className="mx-auto max-w-[1260px] px-6 py-7">
        <Routes>
          <Route
            path="/login"
            element={
              isAuthenticated ? (
                <Navigate to="/" replace />
              ) : (
                <LoginPage onLoginSuccess={(user) => setUsuario(user)} />
              )
            }
          />
          <Route path="/" element={<POSPage />} />
          <Route path="/ventas" element={<VentasPage />} />
          <Route path="/inventario" element={<InventarioPage />} />
          <Route path="/lotes-kardex" element={<LotesKardexPage />} />
          <Route path="/ml-dashboard" element={<MLDashboardPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}
