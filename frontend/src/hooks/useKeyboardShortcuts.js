import { useEffect } from 'react'

/**
 * Hook para operación 100% por teclado en mostrador (F1-F12, Escape, Enter, etc.).
 *
 * @param {Record<string, (event: KeyboardEvent) => void>} keyMap Mapa de tecla -> handler
 * @param {boolean} [enabled=true]
 */
export function useKeyboardShortcuts(keyMap, enabled = true) {
  useEffect(() => {
    if (!enabled || !keyMap) return

    const handleKeyDown = (event) => {
      const key = event.key
      const handler = keyMap[key]

      if (!handler) return

      const isFunctionKey = /^F([1-9]|1[0-2])$/.test(key)
      const isEscape = key === 'Escape'

      const target = event.target
      const isEditingField =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)

      // Las teclas de función (F1-F12) y Escape siempre se ejecutan aun estando dentro de un input
      if (isFunctionKey || isEscape || !isEditingField) {
        event.preventDefault()
        handler(event)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [keyMap, enabled])
}
