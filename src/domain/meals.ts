import type { Entry } from './types'

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
