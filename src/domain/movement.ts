import type { Entry, Profile } from './types'
import { daysAgo } from './time'
import { needsHypoCare } from './glucose'
import { computeStats } from './stats'

export interface MovementState {
  activeDays: number
  minutesToday: number
  /** suggestion for right now; null when nothing should be suggested */
  nudge: string | null
}

/**
 * Movement as a lever on glucose, never as compensation for what was eaten:
 * no calorie counting, no talk of "burning". No streaks, no reproaches.
 */
export function movementState(p: Profile, entries: Entry[], now = Date.now()): MovementState {
  const dayKey = (ts: number) => new Date(ts).toDateString()
  const week = entries.filter(e => e.ts >= daysAgo(6, now))
  const activeDays = new Set(week.filter(e => e.kind === 'exercise').map(e => dayKey(e.ts))).size

  const today = entries.filter(e => e.ts >= daysAgo(0, now))
  const minutesToday = today
    .filter(e => e.kind === 'exercise')
    .reduce((sum, e) => sum + (e.value ?? 0), 0)

  const base = { activeDays, minutesToday }

  const glucose = entries.filter(e => e.kind === 'glucose' && e.value != null)
  const last = glucose[glucose.length - 1]

  // after a recent low, moving is the opposite of what's needed
  if (needsHypoCare(p, last, now)) return { ...base, nudge: null }

  const stats = computeStats(entries.filter(e => e.ts >= daysAgo(13, now)), p)
  const drop =
    stats.exerciseDelta != null && stats.exerciseDelta < -3 && stats.exerciseDays >= 2
      ? Math.abs(Math.round(stats.exerciseDelta))
      : null
  const pattern = drop ? ` Los días que te mueves tu media baja ${drop} mg/dl.` : ''

  if (minutesToday > 0) return { ...base, nudge: `Ya te has movido hoy, ${minutesToday} min.${pattern}` }

  // a short walk after eating is what trims the postprandial spike the most; the
  // 15-90 min window is about digestion, so a dinner before midnight still counts
  const meals = entries.filter(e => e.kind === 'meal')
  const lastMeal = meals[meals.length - 1]
  if (lastMeal && now - lastMeal.ts > 15 * 60e3 && now - lastMeal.ts < 90 * 60e3)
    return { ...base, nudge: 'Acabas de comer: un paseo de 10-15 minutos ahora suaviza el pico de después.' }

  if (last?.value != null && last.value > p.high && now - last.ts < 3 * 3600e3)
    return { ...base, nudge: `Vas por ${last.value} mg/dl. Un paseo tranquilo ayuda a que baje.${pattern}` }

  // not right after waking nor at night: between mid-morning and dinner
  const h = new Date(now).getHours()
  if (h >= 9 && h < 22) return { ...base, nudge: `Hoy aún no te has movido; con 20-30 minutos vale.${pattern}` }

  return { ...base, nudge: null }
}
