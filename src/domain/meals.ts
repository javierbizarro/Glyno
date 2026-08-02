import type { Entry } from './types'
import { daysAgo } from './time'

export type MealMoment = 'desayuno' | 'comida' | 'merienda' | 'cena'

export function mealMoment(ts: number): MealMoment {
  const h = new Date(ts).getHours()
  if (h >= 5 && h < 12) return 'desayuno'
  if (h >= 12 && h < 17) return 'comida'
  if (h >= 17 && h < 20) return 'merienda'
  return 'cena'
}

export interface UsualMeal {
  label: string
  times: number
  carbs: number | null
}

/**
 * Platos que ya ha registrado, agrupados por frecuencia. Sirven de despensa implícita:
 * si los ha comido, es que los tiene a mano y le gustan.
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

/** dosis de rápida que más repite a esta hora, para ofrecerlas de un toque */
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
      // a la baja de 5 en 5: nadie sale a andar exactamente 37 minutos
      minutes: Math.max(5, Math.round(x.mins.reduce((a, b) => a + b, 0) / x.mins.length / 5) * 5),
    }))
}

/**
 * Momento del día que probablemente corresponde a la glucemia que va a apuntar,
 * para traerlo ya marcado: en ayunas si aún no ha comido, tras una comida reciente, etc.
 */
export function suggestMoment(entries: Entry[], now = Date.now()): string {
  const meals = entries.filter(e => e.kind === 'meal' && e.ts >= daysAgo(0))
  const lastMeal = meals[meals.length - 1]

  // posprandial: entre 45 min y 3 h y media desde la última comida
  if (lastMeal) {
    const since = now - lastMeal.ts
    if (since > 45 * 60e3 && since < 3.5 * 3600e3) {
      const m = mealMoment(lastMeal.ts)
      if (m === 'desayuno') return 'después de desayunar'
      if (m === 'comida') return 'después de comer'
      if (m === 'cena') return 'después de cenar'
    }
  }

  const eaten = (m: MealMoment) => meals.some(e => mealMoment(e.ts) === m)
  const h = new Date(now).getHours()
  // la madrugada va primero: a la 1:00 no estás "en ayunas", estás por acostarte
  if (h >= 22 || h < 4) return 'antes de dormir'
  if (h < 11 && !eaten('desayuno')) return 'ayunas'
  if (h >= 12 && h < 15 && !eaten('comida')) return 'antes de comer'
  if (h >= 19 && h < 22 && !eaten('cena')) return 'antes de cenar'
  return ''
}
