import type { Range } from '../domain/glucose'

export const RANGE_LABEL: Record<Range, string> = { low: 'Baja', in: 'En rango', high: 'Alta' }
export const RANGE_VAR: Record<Range, string> = { low: 'var(--red)', in: 'var(--green)', high: 'var(--amber)' }

export const fmtTime = (ts: number) =>
  new Date(ts).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })

export const fmtDayShort = (ts: number) =>
  new Date(ts).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })

export const fmtDayLong = (ts: number) =>
  new Date(ts).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

export function greeting(): string {
  const h = new Date().getHours()
  if (h >= 6 && h < 13) return 'Buenos días'
  if (h >= 13 && h < 21) return 'Buenas tardes'
  return 'Buenas noches'
}

export function timeAgo(ts: number): string {
  const min = Math.round((Date.now() - ts) / 60000)
  if (min < 1) return 'ahora mismo'
  if (min < 60) return `hace ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `hace ${h} h`
  return `hace ${Math.round(h / 24)} d`
}

export function download(name: string, blob: Blob) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}
