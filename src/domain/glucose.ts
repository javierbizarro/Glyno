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
