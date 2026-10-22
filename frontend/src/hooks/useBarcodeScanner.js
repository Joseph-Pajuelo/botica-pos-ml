import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * Hook global para capturar ráfagas de un Lector de Código de Barras USB (HID).
 * El lector HID emula un teclado de alta velocidad inyectando dígitos (< 55ms entre teclas)
 * seguidos de la tecla Enter.
 *
 * @param {Object} options
 * @param {(barcode: string) => void} options.onScan Callback ejecutado al detectar un código válido
 * @param {boolean} [options.enabled=true] Si el listener está activo
 * @param {number} [options.minLength=4] Longitud mínima de código de barras
 * @param {number} [options.maxInterKeyDelay=65] Tiempo máximo en ms entre pulsaciones de ráfaga HID
 */
export function useBarcodeScanner({
  onScan,
  enabled = true,
  minLength = 4,
  maxInterKeyDelay = 65,
} = {}) {
  const bufferRef = useRef('')
  const lastKeyTimeRef = useRef(0)
  const [lastScannedCode, setLastScannedCode] = useState(null)
  const [scannerStatus, setScannerStatus] = useState('LISTO') // 'LISTO' | 'ESCANEANDO'

  const triggerScan = useCallback(
    (code) => {
      const clean = String(code || '').trim()
      if (!clean) return
      setLastScannedCode(clean)
      setScannerStatus('ESCANEANDO')
      setTimeout(() => setScannerStatus('LISTO'), 450)
      if (onScan) {
        onScan(clean)
      }
    },
    [onScan]
  )

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event) => {
      // Ignorar combinaciones con Ctrl, Alt o Meta
      if (event.ctrlKey || event.altKey || event.metaKey) return

      const target = event.target
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)

      // Si el usuario está escribiendo en un input que NO es el input de código de barras,
      // solo capturamos si es una ráfaga rápida de hardware HID
      const isBarcodeInput = target?.dataset?.barcodeInput === 'true'

      const now = performance.now()
      const delta = now - lastKeyTimeRef.current

      if (event.key === 'Enter') {
        if (bufferRef.current.length >= minLength && (!isInput || isBarcodeInput || delta < maxInterKeyDelay * 2)) {
          event.preventDefault()
          const scanned = bufferRef.current
          bufferRef.current = ''
          lastKeyTimeRef.current = 0
          triggerScan(scanned)
          return
        }
        bufferRef.current = ''
        return
      }

      if (event.key.length === 1) {
        if (delta > maxInterKeyDelay && bufferRef.current.length > 0) {
          // Si pasó demasiado tiempo entre teclas, reiniciamos el buffer a la tecla actual
          bufferRef.current = event.key
        } else {
          bufferRef.current += event.key
        }
        lastKeyTimeRef.current = now
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled, minLength, maxInterKeyDelay, triggerScan])

  return {
    lastScannedCode,
    scannerStatus,
    triggerScan,
  }
}
