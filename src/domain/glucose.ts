import type { Entry, Profile } from './types'

export type Range = 'low' | 'in' | 'high'

export const rangeOf = (v: number, p: Profile): Range =>
  v < p.low ? 'low' : v > p.high ? 'high' : 'in'

/**
 * If the last glucose reading is below range and recent, treating the hypo comes
 * first: the app suggests no meals and makes no AI calls in that case.
 */
export function needsHypoCare(p: Profile, last: Entry | undefined, now = Date.now()): boolean {
  if (last?.kind !== 'glucose' || last.value == null) return false
  return last.value < p.low && now - last.ts < 2 * 3600e3
}

/**
 * «134 mg/dl hace 25 min (ayunas)» for the prompts. The age is always included: a
 * value from three days ago must not weigh the same as one from a while ago.
 */
export function lastGlucoseText(last: Entry | undefined, now = Date.now()): string {
  if (last?.kind !== 'glucose' || last.value == null) return 'sin medición reciente'
  const min = Math.round((now - last.ts) / 60000)
  const ago =
    min < 90 ? `hace ${min} min` : min < 36 * 60 ? `hace ${Math.round(min / 60)} h` : `hace ${Math.round(min / 1440)} días`
  return `${last.value} mg/dl ${ago}${last.note ? ` (${last.note})` : ''}`
}
