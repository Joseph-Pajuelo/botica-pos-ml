const VARIANT_STYLES = {
  mint: {
    container: 'bg-[#dcfce7] text-[#15803d] border border-[#86efac]',
    dot: 'bg-[#16a34a]',
  },
  tangerine: {
    container: 'bg-[#ffedd5] text-[#c2410c] border border-[#fdba74]',
    dot: 'bg-[#ea580c]',
  },
  lavender: {
    container: 'bg-[#ede9fe] text-[#6d28d9] border border-[#c4b5fd]',
    dot: 'bg-[#7c3aed]',
  },
  blue: {
    container: 'bg-[#dbeafe] text-[#1d4ed8] border border-[#93c5fd]',
    dot: 'bg-[#2563eb]',
  },
  danger: {
    container: 'bg-[#fee2e2] text-[#b91c1c] border border-[#fca5a5]',
    dot: 'bg-[#dc2626]',
  },
  neutral: {
    container: 'bg-[#e2e8f0] text-[#334155] border border-[#cbd5e1]',
    dot: 'bg-[#64748b]',
  },
}

/**
 * Pill Badge / Status Badge con contraste mejorado y sin saltos de línea.
 */
export function StatusBadge({
  children,
  variant = 'neutral',
  withDot = true,
  mono = false,
  className = '',
}) {
  const style = VARIANT_STYLES[variant] || VARIANT_STYLES.neutral

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold leading-[1.4] ${
        mono ? 'font-geist-mono' : 'font-inter'
      } ${style.container} ${className}`}
    >
      {withDot && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} />}
      {children}
    </span>
  )
}
