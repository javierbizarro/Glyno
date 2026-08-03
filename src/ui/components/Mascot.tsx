/** Flat Glyno for small sizes (tab bar): heart with crown, no antennae */
export function Mascot({ size = 56 }: { size?: number }) {
  const heart = 'M50 78 C35 65 24 55 24 44 C24 35 30 29 38 29 C44 29 48 33 50 37 C52 33 56 29 62 29 C70 29 76 35 76 44 C76 55 65 65 50 78 Z'
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-label="Glyno" role="img">
      <path
        d="M40 31 L40 22 L44 26 L46.8 17 L50 22 L53.2 17 L56 26 L60 22 L60 31 Z"
        fill="#D99A3C"
        stroke="#2F3757"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d={heart} fill="#B792C0" stroke="#2F3757" strokeWidth="7" strokeLinejoin="round" />
      <path d={heart} transform="translate(50 52) scale(0.72) translate(-50 -52)" fill="#DE7A90" />
      <ellipse cx="43" cy="48" rx="3.6" ry="4.2" fill="#232743" />
      <ellipse cx="57" cy="48" rx="3.6" ry="4.2" fill="#232743" />
      <circle cx="44.4" cy="46.5" r="1.4" fill="#fff" />
      <circle cx="58.4" cy="46.5" r="1.4" fill="#fff" />
      <path d="M46 56 Q50 60 54 56" stroke="#232743" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </svg>
  )
}
