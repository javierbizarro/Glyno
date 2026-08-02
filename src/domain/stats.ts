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
}

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
      // glucemias en las 14 h posteriores a la etiqueta
      const after = gl.filter(g => marks.some(t => g.ts > t.ts && g.ts - t.ts < 14 * 3600e3))
      return { label, delta: after.length && mean != null ? avg(after.map(e => e.value!))! - mean : 0, n: after.length }
    })
    .filter(t => t.n >= 2)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))

  const bps = entries.filter(e => e.kind === 'bp' && e.sys && e.dia)

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
  }
}
