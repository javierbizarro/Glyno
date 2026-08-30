import type { Entry } from './types'

/**
 * The AGP (ambulatory glucose profile): every day of the period folded onto a single
 * 24 hours, drawn as percentile bands. It is how a sensor's data is read in consultation —
 * the median line says where you usually are at each hour, and the width of the band says
 * how much that hour varies, which is the part a line chart of 4.000 dots cannot show.
 *
 * It only makes sense with sensor density. Over four finger pricks a day, percentiles are
 * arithmetic with no meaning behind it, and the fortnight curve tells the truth better.
 */

export interface AgpBand {
  /** minutes since midnight where the bucket starts */
  minute: number
  p5: number
  p25: number
  p50: number
  p75: number
  p95: number
  n: number
}

/** readings a day from which percentiles start meaning something; a sensor gives ~288 */
export const AGP_MIN_PER_DAY = 12
/** an hour ranked on fewer readings than this is noise pretending to be a distribution */
const MIN_PER_BUCKET = 3
/** one band per hour: finer than this and the bands get spiky without saying more */
const BUCKET_MIN = 60

/** linear-interpolated percentile over a sorted-or-not list; null when there is nothing */
export function percentile(values: number[], p: number): number | null {
  if (!values.length) return null
  const xs = [...values].sort((a, b) => a - b)
  if (xs.length === 1) return xs[0]
  const pos = ((xs.length - 1) * p) / 100
  const low = Math.floor(pos)
  const high = Math.ceil(pos)
  if (low === high) return xs[low]
  return xs[low] + (xs[high] - xs[low]) * (pos - low)
}

const glucose = (entries: Entry[]) => entries.filter(e => e.kind === 'glucose' && e.value != null)

/** whether this diary is being fed by a sensor rather than by a fingertip */
export function hasSensorDensity(entries: Entry[], days: number): boolean {
  if (days <= 0) return false
  return glucose(entries).length / days >= AGP_MIN_PER_DAY
}

/**
 * One band per hour of the day. Hours with too few readings are left OUT rather than
 * interpolated: an empty stretch on the chart is honest, an invented band is not.
 */
export function agpProfile(entries: Entry[]): AgpBand[] {
  const buckets = new Map<number, number[]>()
  for (const e of glucose(entries)) {
    const d = new Date(e.ts)
    const minute = Math.floor((d.getHours() * 60 + d.getMinutes()) / BUCKET_MIN) * BUCKET_MIN
    const list = buckets.get(minute)
    if (list) list.push(e.value!)
    else buckets.set(minute, [e.value!])
  }

  return [...buckets.entries()]
    .filter(([, values]) => values.length >= MIN_PER_BUCKET)
    .sort(([a], [b]) => a - b)
    .map(([minute, values]) => ({
      minute,
      p5: percentile(values, 5)!,
      p25: percentile(values, 25)!,
      p50: percentile(values, 50)!,
      p75: percentile(values, 75)!,
      p95: percentile(values, 95)!,
      n: values.length,
    }))
}
