/** Glyno plano para tamaños pequeños (barra de pestañas), a juego con el icono de la app */
export function Mascot({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-label="Glyno" role="img">
      <path d="M50 30 C50 23 52 17 57 14" stroke="var(--green)" strokeWidth="4" fill="none" strokeLinecap="round" />
      <ellipse cx="65" cy="12" rx="8" ry="3.4" fill="var(--green)" transform="rotate(-16 65 12)" />
      <ellipse cx="48" cy="11" rx="7" ry="3.1" fill="var(--green)" transform="rotate(18 48 11)" />
      <ellipse cx="20" cy="62" rx="5.6" ry="9.5" fill="var(--green)" transform="rotate(18 20 62)" />
      <ellipse cx="80" cy="62" rx="5.6" ry="9.5" fill="var(--green)" transform="rotate(-18 80 62)" />
      <ellipse cx="38" cy="88" rx="9" ry="4.6" fill="var(--green)" />
      <ellipse cx="62" cy="88" rx="9" ry="4.6" fill="var(--green)" />
      <path d="M50 26 C64 26 73 39 74 54 C75 71 65 88 50 88 C35 88 25 71 26 54 C27 39 36 26 50 26 Z" fill="var(--green)" />
      <circle cx="41" cy="53" r="4.6" fill="var(--paper)" />
      <circle cx="59" cy="53" r="4.6" fill="var(--paper)" />
      <path d="M44 62 Q50 67 56 62" stroke="var(--paper)" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  )
}
