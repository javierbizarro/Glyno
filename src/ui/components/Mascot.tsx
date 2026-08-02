export function Mascot({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-label="Glyno" role="img">
      <path d="M33 16 q0.5 -7 7 -8" stroke="var(--green)" strokeWidth="3.2" fill="none" strokeLinecap="round" />
      <circle cx="40" cy="8" r="2.4" fill="var(--amber)" />
      <circle cx="32" cy="36" r="18" fill="var(--green)" />
      <circle cx="25.5" cy="33" r="2.7" fill="var(--paper)" />
      <circle cx="38.5" cy="33" r="2.7" fill="var(--paper)" />
      <path d="M26.5 41.5 q5.5 4.5 11 0" stroke="var(--paper)" strokeWidth="2.6" fill="none" strokeLinecap="round" />
    </svg>
  )
}
