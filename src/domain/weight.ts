import type { Entry } from './types'
import { weekRange } from './week'

/** the AI's weight mode switches on from this BMI; below it, weight stays a plain metric */
export const WEIGHT_FOCUS_BMI = 27

export function bmiOf(weightKg?: number, heightCm?: number): number | null {
  if (!weightKg || !heightCm) return null
  return weightKg / Math.pow(heightCm / 100, 2)
}

export interface WeeklyWeight {
  /** Monday of the week, local midnight */
  from: number
  mean: number
  n: number
}

const round1 = (x: number) => Math.round(x * 10) / 10

/**
 * Weekly means because the daily number bounces (water, salt, time of day):
 * the week is the honest granularity for a weight trend.
 */
export function weeklyWeights(entries: Entry[], now = Date.now(), maxWeeks = 12): WeeklyWeight[] {
  const cutoff = weekRange(1 - maxWeeks, now).from
  const byWeek = new Map<number, number[]>()
  for (const e of entries) {
    if (e.kind !== 'weight' || e.value == null || e.ts < cutoff) continue
    const monday = weekRange(0, e.ts).from
    byWeek.set(monday, [...(byWeek.get(monday) ?? []), e.value])
  }
  return [...byWeek.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([from, vals]) => ({ from, mean: round1(vals.reduce((a, b) => a + b, 0) / vals.length), n: vals.length }))
}

/** kg per week between the first and last weekly mean; needs at least 2 weeks */
export function weightTrendPerWeek(series: WeeklyWeight[]): number | null {
  if (series.length < 2) return null
  const first = series[0]
  const last = series[series.length - 1]
  const weeks = Math.round((last.from - first.from) / (7 * 86_400_000))
  return weeks > 0 ? (last.mean - first.mean) / weeks : null
}
