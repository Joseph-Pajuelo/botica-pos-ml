import { useEffect } from 'react'
import { X } from 'lucide-react'

/**
 * Modal Border-First siguiendo DesingBotica.md (16px radius, 1px border #e5e5e5, ring 4px sutil).
 */
export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-lg',
}) {
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose?.()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-midnight-ink/35 p-4 backdrop-blur-[1px]">
      <div
        className={`w-full ${maxWidth} rounded-[16px] border border-ash bg-canvas-white p-6 shadow-[0_0_0_4px_rgba(0,0,0,0.08)]`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-ash pb-4">
          <div>
            <h2 className="text-[18px] font-semibold leading-[1.4] text-charcoal">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-0.5 text-[13px] text-steel">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-ash bg-canvas-white text-steel transition hover:bg-paper-mist hover:text-charcoal"
            title="Cerrar (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}
