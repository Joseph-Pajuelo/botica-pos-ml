/**
 * Logotipo original vectorial (SVG) para el sistema de la Botica.
 * Se adapta tanto a la barra de navegación superior como al comprobante térmico de venta.
 */
export function BoticaLogo({ size = 'md', showTagline = true, monochrome = false }) {
  const dimensions =
    size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-11 w-11' : 'h-10 w-10'

  if (monochrome) {
    return (
      <div className="inline-flex flex-col items-center justify-center">
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: '34px', height: '34px', margin: '0 auto' }}
        >
          <rect
            x="4"
            y="4"
            width="40"
            height="40"
            rx="11"
            stroke="#000000"
            strokeWidth="3"
          />
          <path
            d="M21 13H27V21H35V27H27V35H21V27H13V21H21V13Z"
            fill="#000000"
          />
          <path
            d="M31 12C34.5 12 36 14.5 36 17C33.5 17 31 15.5 31 12Z"
            fill="#000000"
          />
        </svg>
      </div>
    )
  }

  return (
    <div className="inline-flex items-center gap-3 select-none">
      {/* Emblema SVG original: Cruz Farmacéutica + Hoja de Salud y Cápsula */}
      <div
        className={`relative inline-flex ${dimensions} shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br from-[#0d9488] via-[#059669] to-[#047857] shadow-xs ring-2 ring-[#ccfbf1]`}
      >
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-7 w-7"
        >
          {/* Cruz médica redondeada */}
          <path
            d="M20 10C20 8.89543 20.8954 8 22 8H26C27.1046 8 28 8.89543 28 10V20H38C39.1046 20 40 20.8954 40 22V26C40 27.1046 39.1046 28 38 28H28V38C28 39.1046 27.1046 40 26 40H22C20.8954 40 20 39.1046 20 38V28H10C8.89543 28 8 27.1046 8 26V22C8 20.8954 8.89543 20 10 20H20V10Z"
            fill="#ffffff"
          />
          {/* Hoja cálida de bienestar en el cuadrante superior derecho */}
          <path
            d="M30 11C35.5 11 38 14 38 18.5C33.5 18.5 30 16 30 11Z"
            fill="#fde68a"
          />
          {/* Corazón/Centro de salud */}
          <circle cx="24" cy="24" r="3.2" fill="#0d9488" />
        </svg>
      </div>

      {/* Tipografía de Marca */}
      <div className="flex flex-col">
        <div className="flex items-baseline gap-1 leading-none">
          <span className="font-satoshi text-[19px] font-bold tracking-tight text-[#1e293b]">
            Botica
          </span>
          <span className="font-satoshi text-[19px] font-bold tracking-tight text-[#0d9488]">
            Salud&Vida
          </span>
        </div>
        {showTagline && (
          <span className="mt-0.5 text-[11px] font-medium text-[#64748b]">
            Gestión Farmacéutica y Atención en Mostrador
          </span>
        )}
      </div>
    </div>
  )
}
