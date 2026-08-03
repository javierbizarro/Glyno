import type { Entry, Profile } from './types'

export type Range = 'low' | 'in' | 'high'

export const rangeOf = (v: number, p: Profile): Range =>
  v < p.low ? 'low' : v > p.high ? 'high' : 'in'

/**
 * Si la última glucemia está bajo rango y es reciente, lo primero es atender la
 * hipoglucemia: la app no propone comidas ni consulta a la IA en ese caso.
 */
export function needsHypoCare(p: Profile, last: Entry | undefined, now = Date.now()): boolean {
  if (last?.kind !== 'glucose' || last.value == null) return false
  return last.value < p.low && now - last.ts < 2 * 3600e3
}

/**
 * «134 mg/dl hace 25 min (ayunas)» para los prompts. La antigüedad va siempre: un
 * valor de hace tres días no debe pesar igual que el de hace un rato.
 */
export function lastGlucoseText(last: Entry | undefined, now = Date.now()): string {
  if (last?.kind !== 'glucose' || last.value == null) return 'sin medición reciente'
  const min = Math.round((now - last.ts) / 60000)
  const cuando =
    min < 90 ? `hace ${min} min` : min < 36 * 60 ? `hace ${Math.round(min / 60)} h` : `hace ${Math.round(min / 1440)} días`
  return `${last.value} mg/dl ${cuando}${last.note ? ` (${last.note})` : ''}`
}
