import type { Entry } from './types'
import { daysAgo } from './time'
import { ReplyFormatError } from './jsonReply'

export type MealMoment = 'breakfast' | 'between-meals' | 'lunch' | 'afternoon-snack' | 'dinner'

/** time slots follow Spanish meal schedules; 'between-meals' covers grazing */
export function mealMoment(ts: number): MealMoment {
  const h = new Date(ts).getHours()
  if (h >= 5 && h < 11) return 'breakfast'
  if (h >= 11 && h < 13) return 'between-meals'
  if (h >= 13 && h < 16) return 'lunch'
  if (h >= 16 && h < 20) return 'afternoon-snack'
  if (h >= 20 && h < 23) return 'dinner'
  return 'between-meals'
}

export const MEAL_MOMENT_LABEL: Record<MealMoment, string> = {
  breakfast: 'el desayuno',
  'between-meals': 'un tentempié',
  lunch: 'la comida',
  'afternoon-snack': 'la merienda',
  dinner: 'la cena',
}

export interface UsualMeal {
  label: string
  times: number
  carbs: number | null
}

/**
 * Dishes already logged, grouped by frequency. They act as an implicit pantry:
 * if the user has eaten them, they have them at hand and like them.
 */
export function usualMeals(entries: Entry[], moment?: MealMoment, limit = 8): UsualMeal[] {
  const meals = entries.filter(e => e.kind === 'meal' && e.label?.trim())
  const relevant = moment ? meals.filter(e => mealMoment(e.ts) === moment) : meals

  const byLabel = new Map<string, { label: string; count: number; carbs: number[] }>()
  for (const e of relevant) {
    const key = e.label!.trim().toLowerCase()
    const acc = byLabel.get(key) ?? { label: e.label!.trim(), count: 0, carbs: [] }
    acc.count++
    if (e.carbs) acc.carbs.push(e.carbs)
    byLabel.set(key, acc)
  }

  return [...byLabel.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map(m => ({
      label: m.label,
      times: m.count,
      carbs: m.carbs.length ? Math.round(m.carbs.reduce((a, b) => a + b, 0) / m.carbs.length) : null,
    }))
}

export interface UsualDose {
  value: number
  times: number
}

/** most repeated bolus doses at this time of day, offered as one-tap logging */
export function usualDoses(entries: Entry[], moment?: MealMoment, limit = 3): UsualDose[] {
  const all = entries.filter(e => e.kind === 'insulin' && e.value)
  const relevant = moment ? all.filter(e => mealMoment(e.ts) === moment) : all
  const source = relevant.length ? relevant : all

  const byValue = new Map<number, number>()
  for (const e of source) byValue.set(e.value!, (byValue.get(e.value!) ?? 0) + 1)

  return [...byValue.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([value, times]) => ({ value, times }))
}

export interface UsualExercise {
  label: string
  minutes: number
  times: number
}

export function usualExercises(entries: Entry[], limit = 3): UsualExercise[] {
  const ex = entries.filter(e => e.kind === 'exercise' && e.value)
  const byLabel = new Map<string, { label: string; count: number; mins: number[] }>()
  for (const e of ex) {
    const label = (e.label ?? 'Ejercicio').trim()
    const acc = byLabel.get(label.toLowerCase()) ?? { label, count: 0, mins: [] }
    acc.count++
    acc.mins.push(e.value!)
    byLabel.set(label.toLowerCase(), acc)
  }
  return [...byLabel.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map(x => ({
      label: x.label,
      times: x.count,
      // rounded to the nearest step of 5: nobody walks exactly 37 minutes
      minutes: Math.max(5, Math.round(x.mins.reduce((a, b) => a + b, 0) / x.mins.length / 5) * 5),
    }))
}

/**
 * Likely moment for the glucose reading about to be logged, so it comes pre-selected.
 * TIME OF DAY RULES. A logged meal only flips "before" to "after" within the same slot:
 * someone who only measures before meals must not get "after" suggested merely because
 * they logged the dish. Return values are diary data and stay in Spanish.
 */
export function suggestMoment(entries: Entry[], now = Date.now()): string {
  const meals = entries.filter(e => e.kind === 'meal' && e.ts >= daysAgo(0, now))
  const ate = (m: MealMoment) => meals.some(e => mealMoment(e.ts) === m)
  const d = new Date(now)
  const h = d.getHours() + d.getMinutes() / 60

  if (h >= 23 || h < 4.5) return 'antes de dormir'
  if (h < 11) return ate('breakfast') ? 'después de desayunar' : 'ayunas'
  if (h < 13) return ate('breakfast') ? 'después de desayunar' : ''
  if (h < 15.5) return ate('lunch') ? 'después de comer' : 'antes de comer'
  if (h < 19) return 'después de comer'
  if (h < 21.5) return ate('dinner') ? 'después de cenar' : 'antes de cenar'
  return ate('dinner') ? 'después de cenar' : 'antes de dormir'
}

// ---- what the AI answers about a meal ----
// The shape is ours, not the model's: a small model gets the labels wrong, answers in Spanish
// or runs out of room. Everything here is repaired quietly, EXCEPT the numbers the user reads
// as health data — those are never invented.

export interface MealAnalysis {
  dish: string
  carbs_g: number
  glycemic_index: 'low' | 'medium' | 'high'
  traffic_light: 'green' | 'amber' | 'red'
  advice: string
  better_avoid: string[]
  // informative extras: the traffic light is NEVER decided by calories
  fiber_g?: number
  calories_kcal?: number
  processing?: 'homemade' | 'processed' | 'ultraprocessed'
}

export interface MealSuggestion {
  options: { dish: string; carbs_g: number; why: string }[]
  avoid: string[]
  note: string
}

const LIGHT: Record<string, MealAnalysis['traffic_light']> = {
  green: 'green', verde: 'green',
  amber: 'amber', ambar: 'amber', amarillo: 'amber', naranja: 'amber',
  red: 'red', rojo: 'red',
}
const INDEX: Record<string, MealAnalysis['glycemic_index']> = {
  low: 'low', bajo: 'low',
  medium: 'medium', medio: 'medium', moderado: 'medium',
  high: 'high', alto: 'high',
}
const PROCESSING: Record<string, NonNullable<MealAnalysis['processing']>> = {
  homemade: 'homemade', casero: 'homemade',
  processed: 'processed', procesado: 'processed',
  ultraprocessed: 'ultraprocessed', ultraprocesado: 'ultraprocessed',
}

const record = (x: unknown): Record<string, unknown> => {
  if (!x || typeof x !== 'object' || Array.isArray(x)) throw new ReplyFormatError()
  return x as Record<string, unknown>
}

/** accents and case out of the way, so "Ámbar" and "amber" land in the same bucket */
const key = (x: unknown): string =>
  typeof x === 'string' ? x.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') : ''

const text = (x: unknown): string => (typeof x === 'string' ? x.trim() : '')

/** "75 g" and "75,4" are still numbers; anything else is not */
function num(x: unknown): number | null {
  if (typeof x === 'number' && Number.isFinite(x)) return x
  if (typeof x === 'string') {
    const m = x.replace(',', '.').match(/-?\d+(\.\d+)?/)
    if (m) return Number(m[0])
  }
  return null
}

const grams = (x: unknown, max: number): number | null => {
  const n = num(x)
  return n == null || n < 0 || n > max ? null : Math.round(n)
}

const list = (x: unknown, limit: number): string[] =>
  (typeof x === 'string' ? [x] : Array.isArray(x) ? x : [])
    .filter((s): s is string => typeof s === 'string' && s.trim() !== '')
    .map(s => s.trim())
    .slice(0, limit)

export function normalizeAnalysis(raw: unknown): MealAnalysis {
  const r = record(raw)
  // the grams of carbohydrate are the headline number of the card: a wrong or invented one
  // is worse than asking again
  const carbs = grams(r.carbs_g, 400)
  if (carbs == null) throw new ReplyFormatError()
  return {
    dish: text(r.dish) || 'Plato',
    carbs_g: carbs,
    glycemic_index: INDEX[key(r.glycemic_index)] ?? 'medium',
    traffic_light: LIGHT[key(r.traffic_light)] ?? 'amber',
    advice: text(r.advice),
    better_avoid: list(r.better_avoid, 3),
    fiber_g: grams(r.fiber_g, 200) ?? undefined,
    calories_kcal: grams(r.calories_kcal, 5000) ?? undefined,
    processing: PROCESSING[key(r.processing)],
  }
}

export function normalizeSuggestion(raw: unknown): MealSuggestion {
  const r = record(raw)
  const options = (Array.isArray(r.options) ? r.options : [])
    .map(o => {
      if (!o || typeof o !== 'object') return null
      const opt = o as Record<string, unknown>
      const dish = text(opt.dish)
      const carbs = grams(opt.carbs_g, 400)
      // an idea without its grams would show "· g HC" on the card
      return dish && carbs != null ? { dish, carbs_g: carbs, why: text(opt.why) } : null
    })
    .filter((o): o is MealSuggestion['options'][number] => o != null)
    .slice(0, 3)
  if (!options.length) throw new ReplyFormatError()
  return { options, avoid: list(r.avoid, 2), note: text(r.note) }
}
