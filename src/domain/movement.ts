import type { Entry, Profile } from './types'
import { thousands } from './number'
import { daysAgo } from './time'
import { needsHypoCare } from './glucose'
import { computeStats } from './stats'

export interface MovementState {
  activeDays: number
  minutesToday: number
  /** already moved today, by logged exercise, the steps threshold or detected activity */
  movedToday: boolean
  /** activity minutes over the last 7 days: per day, max(logged, detected) — never the sum */
  weekMinutes: number
  /** suggestion for right now; null when nothing should be suggested */
  nudge: string | null
}

/** a day counts as active from this many automatic steps; below it, walking to the
    fridge is not "moving". Deliberately high — the goal is movement, not the button */
export const STEP_ACTIVE_THRESHOLD = 8000
/** detected exercise minutes (Apple ring) that make a day active */
export const ACTIVITY_ACTIVE_MIN = 30
/** cycling km that make a day active: steps cannot see the bike */
export const CYCLING_ACTIVE_KM = 3
/** ADA/WHO recommendation: weekly minutes of moderate activity */
export const WEEKLY_TARGET_MIN = 150

/**
 * Minutes of movement the phone has already seen today, so nobody writes down what is
 * already written. Detected exercise minutes and imported workouts overlap — the ring counts
 * the walk it also filed as a workout — so this takes the MAX, never the sum.
 */
export function detectedMinutesToday(entries: Entry[], now = Date.now()): number {
  const today = entries.filter(e => e.ts >= daysAgo(0, now))
  const ring = Math.max(0, ...today.filter(e => e.kind === 'activity').map(e => e.value ?? 0))
  const workouts = today
    .filter(e => e.kind === 'exercise' && e.source === 'health')
    .reduce((sum, e) => sum + (e.value ?? 0), 0)
  return Math.round(Math.max(ring, workouts))
}

/**
 * Movement as a lever on glucose, never as compensation for what was eaten:
 * no calorie counting, no talk of "burning". No streaks, no reproaches.
 */
export function movementState(p: Profile, entries: Entry[], now = Date.now()): MovementState {
  const dayKey = (ts: number) => new Date(ts).toDateString()
  const week = entries.filter(e => e.ts >= daysAgo(6, now))
  const active = (e: Entry) =>
    e.kind === 'exercise' ||
    (e.kind === 'steps' && (e.value ?? 0) >= STEP_ACTIVE_THRESHOLD) ||
    (e.kind === 'activity' && (e.value ?? 0) >= ACTIVITY_ACTIVE_MIN) ||
    (e.kind === 'cycling' && (e.value ?? 0) >= CYCLING_ACTIVE_KM)
  const activeDays = new Set(week.filter(active).map(e => dayKey(e.ts))).size

  // weekly minutes toward the 150-min recommendation: logged and detected overlap
  // (the phone sees your logged walk too), so each day contributes the MAX of both
  const perDay = new Map<string, { logged: number; detected: number }>()
  for (const e of week) {
    if (e.kind !== 'exercise' && e.kind !== 'activity') continue
    const d = perDay.get(dayKey(e.ts)) ?? { logged: 0, detected: 0 }
    if (e.kind === 'exercise') d.logged += e.value ?? 0
    else d.detected = Math.max(d.detected, e.value ?? 0)
    perDay.set(dayKey(e.ts), d)
  }
  const weekMinutes = [...perDay.values()].reduce((s, d) => s + Math.max(d.logged, d.detected), 0)

  const today = entries.filter(e => e.ts >= daysAgo(0, now))
  const minutesToday = today
    .filter(e => e.kind === 'exercise')
    .reduce((sum, e) => sum + (e.value ?? 0), 0)
  const stepsToday = Math.max(0, ...today.filter(e => e.kind === 'steps').map(e => e.value ?? 0))
  const activityToday = Math.max(0, ...today.filter(e => e.kind === 'activity').map(e => e.value ?? 0))
  const movedToday =
    minutesToday > 0 || stepsToday >= STEP_ACTIVE_THRESHOLD || activityToday >= ACTIVITY_ACTIVE_MIN

  const base = { activeDays, minutesToday, movedToday, weekMinutes }

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

  if (stepsToday >= STEP_ACTIVE_THRESHOLD)
    return { ...base, nudge: `Hoy ya llevas ${thousands(stepsToday)} pasos.${pattern}` }

  if (activityToday >= ACTIVITY_ACTIVE_MIN)
    return { ...base, nudge: `Ya llevas ${activityToday} min de actividad hoy.${pattern}` }

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
