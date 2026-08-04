/** Spanish thousands separator (8.241) without relying on the runtime's ICU:
    Alpine's node ships a trimmed ICU where toLocaleString('es-ES') is a no-op */
export function thousands(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}
