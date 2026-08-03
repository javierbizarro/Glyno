import type { Entry } from './types'
import { daysAgo } from './time'

export type MealMoment = 'desayuno' | 'entre horas' | 'comida' | 'merienda' | 'cena'

/** franjas pensadas para horarios españoles; «entre horas» recoge el picoteo */
export function mealMoment(ts: number): MealMoment {
  const h = new Date(ts).getHours()
  if (h >= 5 && h < 11) return 'desayuno'
  if (h >= 11 && h < 13) return 'entre horas'
  if (h >= 13 && h < 16) return 'comida'
  if (h >= 16 && h < 20) return 'merienda'
  if (h >= 20 && h < 23) return 'cena'
  return 'entre horas'
}

export const MEAL_MOMENT_LABEL: Record<MealMoment, string> = {
  desayuno: 'el desayuno',
  'entre horas': 'un tentempié',
  comida: 'la comida',
  merienda: 'la merienda',
  cena: 'la cena',
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
/**
 * MANDA LA HORA DEL DÍA. Haber apuntado una comida solo sirve para pasar de «antes» a
 * «después» dentro de la misma franja: a quien solo se mide antes de comer no se le puede
 * proponer «después» únicamente porque haya registrado el plato.
 */
export function suggestMoment(entries: Entry[], now = Date.now()): string {
  const meals = entries.filter(e => e.kind === 'meal' && e.ts >= daysAgo(0))
  const ate = (m: MealMoment) => meals.some(e => mealMoment(e.ts) === m)
  const d = new Date(now)
  const h = d.getHours() + d.getMinutes() / 60

  if (h >= 23 || h < 4.5) return 'antes de dormir'
  if (h < 11) return ate('desayuno') ? 'después de desayunar' : 'ayunas'
  if (h < 13) return ate('desayuno') ? 'después de desayunar' : ''
  if (h < 15.5) return ate('comida') ? 'después de comer' : 'antes de comer'
  if (h < 19) return 'después de comer'
  if (h < 21.5) return ate('cena') ? 'después de cenar' : 'antes de cenar'
  return ate('cena') ? 'después de cenar' : 'antes de dormir'
}
