/** Flat Glyno for small sizes (tab bar): rounded body, sprout and face, nothing else */
export function Mascot({ size = 56 }: { size?: number }) {
  const body = 'M50 24 C65 24 76 35 76 49 C76 65 64 80 50 80 C36 80 24 65 24 49 C24 35 35 24 50 24 Z'
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <path d={body} fill="#B792C0" stroke="#232743" strokeWidth="7" strokeLinejoin="round" />
      <path d={body} transform="translate(50 54) scale(0.74) translate(-50 -54)" fill="#DE7A90" />
      <g transform="translate(50 54) scale(1.18) translate(-50 -50)">
        <ellipse cx="43" cy="48" rx="4" ry="4.6" fill="#232743" />
        <ellipse cx="57" cy="48" rx="4" ry="4.6" fill="#232743" />
        <circle cx="44.6" cy="46.3" r="1.6" fill="#fff" />
        <circle cx="58.6" cy="46.3" r="1.6" fill="#fff" />
        <path d="M45 56.5 Q50 61.5 55 56.5" stroke="#232743" strokeWidth="2.8" fill="none" strokeLinecap="round" />
      </g>
      {/* the sprout is drawn LAST: under the body it would be eaten by it, which is what
          happened to the crown it replaces */}
      <path d="M50 29 L50 12" stroke="#232743" strokeWidth="8.5" strokeLinecap="round" fill="none" />
      <path d="M50 17 C56 6 70 8 70 8 C70 8 66 22 53 21 Z" fill="#3D8A5C" stroke="#232743" strokeWidth="4.5" strokeLinejoin="round" />
      <path d="M50 25 C44 14 32 17 32 17 C32 17 36 29 47 27 Z" fill="#2F7A50" stroke="#232743" strokeWidth="4.5" strokeLinejoin="round" />
      <path d="M50 28 L50 13.5" stroke="#3D8A5C" strokeWidth="4" strokeLinecap="round" fill="none" />
    </svg>
  )
}
