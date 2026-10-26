import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { Navbar } from './components'
import {
  POSPage,
  VentasPage,
  InventarioPage,
  LotesKardexPage,
  MLDashboardPage,
} from './pages'
import { useKeyboardShortcuts } from './hooks'

function AppShell() {
  const navigate = useNavigate()

  // Atajos de teclado discretos en segundo plano (sin ensuciar la interfaz visual)
  useKeyboardShortcuts({
    F1: () => navigate('/'),
    F2: () => navigate('/ventas'),
    F3: () => navigate('/inventario'),
    F4: () => navigate('/lotes-kardex'),
    F5: () => navigate('/ml-dashboard'),
  })

  return (
    <div className="min-h-screen bg-dub-dots text-charcoal">
      <Navbar />

      <main className="mx-auto max-w-[1260px] px-6 py-7">
        <Routes>
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
