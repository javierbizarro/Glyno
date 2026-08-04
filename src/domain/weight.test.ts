import { describe, expect, it } from 'vitest'
import type { Entry } from './types'
import { bmiOf, WEIGHT_FOCUS_BMI, weeklyWeights, weightTrendPerWeek } from './weight'

// timestamps built from local-time ISO strings, so tests are TZ-independent
const at = (iso: string) => new Date(iso).getTime()
const w = (kg: number, iso: string): Entry => ({ ts: at(iso), kind: 'weight', value: kg })

// Wednesday; its week starts Monday 3 Aug 2026
const NOW = at('2026-08-05T12:00:00')

describe('bmiOf', () => {
  it('computes kg/m² from kilograms and centimetres', () => {
    expect(bmiOf(80, 175)).toBeCloseTo(26.1, 1)
    expect(bmiOf(92, 170)).toBeCloseTo(31.8, 1)
  })

  it('is null when either the weight or the height is missing', () => {
    expect(bmiOf(undefined, 175)).toBeNull()
    expect(bmiOf(80, undefined)).toBeNull()
    expect(bmiOf(0, 175)).toBeNull()
    expect(bmiOf(80, 0)).toBeNull()
  })
})

describe('WEIGHT_FOCUS_BMI', () => {
  it('is the agreed threshold for the AI weight mode', () => {
    expect(WEIGHT_FOCUS_BMI).toBe(27)
  })
})

describe('weeklyWeights', () => {
  it('averages the weigh-ins of each Monday-to-Sunday week', () => {
    const series = weeklyWeights(
      [w(93.8, '2026-07-28T08:00:00'), w(92.6, '2026-07-31T08:00:00'), w(92.4, '2026-08-04T08:00:00')],
      NOW,
    )
    expect(series).toEqual([
      { from: at('2026-07-27T00:00:00'), mean: 93.2, n: 2 },
      { from: at('2026-08-03T00:00:00'), mean: 92.4, n: 1 },
    ])
  })

  it('skips weeks without weigh-ins instead of filling them with zeros', () => {
    const series = weeklyWeights([w(94, '2026-07-14T08:00:00'), w(93, '2026-08-04T08:00:00')], NOW)
    expect(series.map(s => s.from)).toEqual([at('2026-07-13T00:00:00'), at('2026-08-03T00:00:00')])
  })

  it('returns the weeks oldest first regardless of entry order', () => {
    const series = weeklyWeights([w(93, '2026-08-04T08:00:00'), w(94, '2026-07-14T08:00:00')], NOW)
    expect(series[0].mean).toBe(94)
    expect(series[1].mean).toBe(93)
  })

  it('ignores weigh-ins older than the window (12 weeks by default)', () => {
    const series = weeklyWeights([w(99, '2026-05-01T08:00:00'), w(93, '2026-08-04T08:00:00')], NOW)
    expect(series).toHaveLength(1)
    expect(series[0].mean).toBe(93)
  })

  it('ignores other kinds and weight entries without a value', () => {
    const entries: Entry[] = [
      { ts: at('2026-08-04T08:00:00'), kind: 'glucose', value: 120 },
      { ts: at('2026-08-04T08:30:00'), kind: 'weight' },
      w(93, '2026-08-04T09:00:00'),
    ]
    expect(weeklyWeights(entries, NOW)).toEqual([{ from: at('2026-08-03T00:00:00'), mean: 93, n: 1 }])
  })

  it('rounds each weekly mean to one decimal', () => {
    const series = weeklyWeights([w(92.1, '2026-08-03T08:00:00'), w(92.2, '2026-08-04T08:00:00')], NOW)
    expect(series[0].mean).toBe(92.2) // 92.15 → 92.2
  })
})

describe('weightTrendPerWeek', () => {
  it('is null with fewer than 2 weekly means', () => {
    expect(weightTrendPerWeek([])).toBeNull()
    expect(weightTrendPerWeek([{ from: at('2026-08-03T00:00:00'), mean: 92, n: 1 }])).toBeNull()
  })

  it('computes kg per week between the first and the last weekly mean', () => {
    const series = [
      { from: at('2026-07-20T00:00:00'), mean: 93.5, n: 2 },
      { from: at('2026-08-03T00:00:00'), mean: 92.5, n: 1 },
    ]
    expect(weightTrendPerWeek(series)).toBeCloseTo(-0.5, 5)
  })

  it('uses the real span in weeks, not the number of points', () => {
    const series = [
      { from: at('2026-07-13T00:00:00'), mean: 94, n: 1 },
      { from: at('2026-07-20T00:00:00'), mean: 93.8, n: 1 },
      { from: at('2026-08-03T00:00:00'), mean: 93.1, n: 1 },
    ]
    // 0.9 kg over 3 weeks
    expect(weightTrendPerWeek(series)).toBeCloseTo(-0.3, 5)
  })
})
