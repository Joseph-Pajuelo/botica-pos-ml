import { useState, useCallback } from 'react'
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
import { mlApi, getErrorMessage } from './services/api'

function AppShell() {
  const navigate = useNavigate()
  const [lastScannedCode, setLastScannedCode] = useState(null)
  const [scannerStatus, setScannerStatus] = useState('LISTO')
  const [isSeeding, setIsSeeding] = useState(false)
  const [seedBanner, setSeedBanner] = useState(null)

  // Atajos globales de navegación F1-F5 entre módulos de la botica
  useKeyboardShortcuts({
    F1: () => navigate('/'),
    F2: () => navigate('/ventas'),
    F3: () => navigate('/inventario'),
    F4: () => navigate('/lotes-kardex'),
    F5: () => navigate('/ml-dashboard'),
  })

  const handleBarcodeEvent = useCallback((code) => {
    setLastScannedCode(code)
    setScannerStatus('ESCANEANDO')
    setTimeout(() => setScannerStatus('LISTO'), 600)
  }, [])

  const handleSeedColdStart = async () => {
    setIsSeeding(true)
    setSeedBanner(null)
    try {
      const res = await mlApi.seedColdStart(12)
      setSeedBanner({
        type: 'success',
        text: `${res.mensaje} (${res.productos_creados} productos, ${res.lotes_creados} lotes FEFO, ${res.ventas_simuladas} ventas).`,
      })
      setTimeout(() => window.location.reload(), 900)
    } catch (err) {
      setSeedBanner({
        type: 'error',
        text: getErrorMessage(err),
      })
    } finally {
      setIsSeeding(false)
    }
  }

  return (
    <div className="min-h-screen bg-dub-dots text-charcoal">
      <Navbar
        scannerStatus={scannerStatus}
        lastScannedCode={lastScannedCode}
        onSeedColdStart={handleSeedColdStart}
        isSeeding={isSeeding}
      />

      {seedBanner && (
        <div className="no-print mx-auto mt-4 max-w-[1280px] px-6">
          <div
            className={`flex items-center justify-between rounded-[12px] border px-4 py-2.5 text-[13px] font-medium shadow-xs ${
              seedBanner.type === 'success'
                ? 'border-[#86efac] bg-[#dcfce7] text-[#15803d]'
                : 'border-[#fca5a5] bg-[#fee2e2] text-[#b91c1c]'
            }`}
          >
            <span>{seedBanner.text}</span>
            <button
              type="button"
              onClick={() => setSeedBanner(null)}
              className="font-geist-mono text-[11px] font-semibold underline"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-[1280px] px-6 py-7">
        <Routes>
          <Route
            path="/"
            element={<POSPage onBarcodeEvent={handleBarcodeEvent} />}
          />
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
