import { describe, expect, it } from 'vitest'
import type { Entry } from './types'
import { agpProfile, AGP_MIN_PER_DAY, hasSensorDensity, percentile } from './agp'

const DAY = 86_400_000
const NOW = new Date('2026-08-30T12:00:00').getTime()

/** `perDay` readings a day for `days` days, all at the same hour unless spread is asked for */
const sensor = (days: number, perDay: number, at = 8): Entry[] => {
  const out: Entry[] = []
  for (let d = 0; d < days; d++) {
    for (let i = 0; i < perDay; i++) {
      const t = new Date(NOW - d * DAY)
      t.setHours(at, 0, 0, 0)
      out.push({ ts: t.getTime(), kind: 'glucose', value: 100 + i })
    }
  }
  return out
}

describe('percentile', () => {
  it('picks the value at the position, interpolating between neighbours', () => {
    const xs = [100, 200, 300, 400, 500]
    expect(percentile(xs, 0)).toBe(100)
    expect(percentile(xs, 100)).toBe(500)
    expect(percentile(xs, 50)).toBe(300)
    expect(percentile(xs, 25)).toBe(200)
  })

  it('survives a single value and an empty list', () => {
    expect(percentile([140], 50)).toBe(140)
    expect(percentile([], 50)).toBeNull()
  })
})

describe('hasSensorDensity', () => {
  it('is false for finger pricks: percentiles over 4 readings a day are a lie', () => {
    expect(hasSensorDensity(sensor(14, 4), 14)).toBe(false)
  })

  it('is true once the readings arrive at sensor rate', () => {
    expect(hasSensorDensity(sensor(14, AGP_MIN_PER_DAY + 2), 14)).toBe(true)
  })

  it('does not count anything that is not a glucose reading', () => {
    const steps: Entry[] = Array.from({ length: 500 }, (_, i) => ({
      ts: NOW - i * 60_000,
      kind: 'steps',
      value: 9000,
    }))
    expect(hasSensorDensity(steps, 14)).toBe(false)
  })
})

describe('agpProfile', () => {
  const spread = (days: number, perHour: number): Entry[] => {
    const out: Entry[] = []
    for (let d = 0; d < days; d++) {
      for (let h = 0; h < 24; h++) {
        for (let i = 0; i < perHour; i++) {
          const t = new Date(NOW - d * DAY)
          t.setHours(h, i * 10, 0, 0)
          // a daily shape: higher after meals, lower at dawn
          out.push({ ts: t.getTime(), kind: 'glucose', value: 90 + h * 3 + i * 5 + d })
        }
      }
    }
    return out
  }

  it('gives one band per hour of the day, in order', () => {
    const bands = agpProfile(spread(14, 4))
    expect(bands).toHaveLength(24)
    expect(bands.map(b => b.minute)).toEqual(Array.from({ length: 24 }, (_, h) => h * 60))
  })

  it('keeps the percentiles in order within each band', () => {
    for (const b of agpProfile(spread(14, 4))) {
      expect(b.p5).toBeLessThanOrEqual(b.p25)
      expect(b.p25).toBeLessThanOrEqual(b.p50)
      expect(b.p50).toBeLessThanOrEqual(b.p75)
      expect(b.p75).toBeLessThanOrEqual(b.p95)
    }
  })

  it('shows the shape of the day: a band it never saw is left out, not invented', () => {
    // only mornings were measured; the rest of the day has no band at all
    const bands = agpProfile(sensor(14, 20, 8))
    expect(bands).toHaveLength(1)
    expect(bands[0].minute).toBe(8 * 60)
  })

  it('ignores an hour with too few readings to rank', () => {
    const thin: Entry[] = [{ ts: NOW, kind: 'glucose', value: 130 }]
    expect(agpProfile(thin)).toHaveLength(0)
  })
})
