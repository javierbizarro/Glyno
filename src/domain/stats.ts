import type { Entry, Profile } from './types'

export interface Stats {
  n: number
  mean: number | null
  tir: number
  pctLow: number
  pctHigh: number
  fasting: number | null
  tagEffects: { label: string; delta: number; n: number }[]
  exerciseDelta: number | null
  exerciseDays: number
  bpMean: { sys: number; dia: number } | null
  /** nightly sleep minutes, averaged (automatic data) */
  sleepMean: number | null
  /** glucose mean on short-sleep days minus the other days' mean */
  sleepDelta: number | null
  shortSleepDays: number
  /** daily steps, averaged (automatic data) */
  stepsMean: number | null
}

/** a night under 6 h counts as short sleep for the pattern */
export const SHORT_SLEEP_MIN = 360

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)

export function computeStats(entries: Entry[], p: Profile): Stats {
  const gl = entries.filter(e => e.kind === 'glucose' && e.value != null)
  const vals = gl.map(e => e.value!)
  const n = gl.length
  const lo = vals.filter(v => v < p.low).length
  const hi = vals.filter(v => v > p.high).length

  const dayKey = (ts: number) => new Date(ts).toDateString()
  const exDays = new Set(entries.filter(e => e.kind === 'exercise').map(e => dayKey(e.ts)))
  const exAvg = avg(gl.filter(e => exDays.has(dayKey(e.ts))).map(e => e.value!))
  const restAvg = avg(gl.filter(e => !exDays.has(dayKey(e.ts))).map(e => e.value!))

  const mean = avg(vals)
  const tags = entries.filter(e => e.kind === 'tag' && e.label)
  const tagEffects = [...new Set(tags.map(t => t.label!))]
    .map(label => {
      const marks = tags.filter(t => t.label === label)
      // glucose readings within 14 h after the tag
      const after = gl.filter(g => marks.some(t => g.ts > t.ts && g.ts - t.ts < 14 * 3600e3))
      return { label, delta: after.length && mean != null ? avg(after.map(e => e.value!))! - mean : 0, n: after.length }
    })
    .filter(t => t.n >= 2)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))

  const bps = entries.filter(e => e.kind === 'bp' && e.sys && e.dia)

  // automatic data: sleep nights and step days, grouped like exercise (calendar day)
  const sleeps = entries.filter(e => e.kind === 'sleep' && e.value != null)
  const stepDays = entries.filter(e => e.kind === 'steps' && e.value != null)
  const shortDays = new Set(sleeps.filter(e => e.value! < SHORT_SLEEP_MIN).map(e => dayKey(e.ts)))
  const normalDays = new Set(sleeps.filter(e => e.value! >= SHORT_SLEEP_MIN).map(e => dayKey(e.ts)))
  const shortAvg = avg(gl.filter(e => shortDays.has(dayKey(e.ts))).map(e => e.value!))
  const normalAvg = avg(gl.filter(e => normalDays.has(dayKey(e.ts))).map(e => e.value!))

  return {
    n,
    mean,
    tir: n ? ((n - lo - hi) / n) * 100 : 0,
    pctLow: n ? (lo / n) * 100 : 0,
    pctHigh: n ? (hi / n) * 100 : 0,
    fasting: avg(gl.filter(e => e.note === 'ayunas').map(e => e.value!)),
    tagEffects,
    exerciseDelta: exAvg != null && restAvg != null ? exAvg - restAvg : null,
    exerciseDays: exDays.size,
    bpMean: bps.length
      ? { sys: avg(bps.map(e => e.sys!))!, dia: avg(bps.map(e => e.dia!))! }
      : null,
    sleepMean: avg(sleeps.map(e => e.value!)),
    sleepDelta: shortAvg != null && normalAvg != null ? shortAvg - normalAvg : null,
    shortSleepDays: shortDays.size,
    stepsMean: avg(stepDays.map(e => e.value!)),
  }
}
