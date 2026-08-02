import { MOMENTS, type Entry, type Profile } from '../domain/types'
import { computeStats, type Stats } from '../domain/stats'
import { daysAgo } from '../domain/time'
import { entries as repo } from './container'

export interface MomentMean {
  label: string
  mean: number | null
  n: number
}

export interface ReportData {
  from: number
  to: number
  days: number
  entries: Entry[]
  glucose: Entry[]
  stats: Stats
  /** HbA1c estimada (GMI) a partir de la media — orientativa, no analítica */
  gmi: number | null
  momentMeans: MomentMean[]
  bp: { n: number; mean: { sys: number; dia: number } | null; high: number }
  weight: { first: Entry | null; last: Entry | null }
}

export async function getReportData(p: Profile, days: number): Promise<ReportData> {
  const from = daysAgo(days - 1)
  const to = Date.now()
  const all = await repo.all()
  const list = all.filter(e => e.ts >= from)
  const stats = computeStats(list, p)
  const glucose = list.filter(e => e.kind === 'glucose' && e.value != null)

  const momentMeans: MomentMean[] = MOMENTS.map(m => {
    const xs = glucose.filter(e => e.note === m).map(e => e.value!)
    return { label: m, mean: xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null, n: xs.length }
  })

  const bps = list.filter(e => e.kind === 'bp' && e.sys && e.dia)
  const weights = list.filter(e => e.kind === 'weight' && e.value != null)

  return {
    from,
    to,
    days,
    entries: list,
    glucose,
    stats,
    gmi: stats.mean != null ? 3.31 + 0.02392 * stats.mean : null,
    momentMeans,
    bp: {
      n: bps.length,
      mean: bps.length
        ? {
            sys: bps.reduce((s, e) => s + e.sys!, 0) / bps.length,
            dia: bps.reduce((s, e) => s + e.dia!, 0) / bps.length,
          }
        : null,
      high: bps.filter(e => e.sys! >= 140 || e.dia! >= 90).length,
    },
    weight: { first: weights[0] ?? null, last: weights[weights.length - 1] ?? null },
  }
}
