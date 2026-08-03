import { describe, expect, it } from 'vitest'
import type { Entry } from './types'
import { defaultProfile } from './types'
import { lastGlucoseText, needsHypoCare, rangeOf } from './glucose'

const p = { ...defaultProfile, low: 70, high: 180 }
const MIN = 60_000
const NOW = new Date('2026-08-03T18:00:00').getTime()

const glucose = (value: number, minAgo: number, note?: string): Entry => ({
  ts: NOW - minAgo * MIN,
  kind: 'glucose',
  value,
  note,
})

describe('rangeOf', () => {
  it('treats the range bounds as in range', () => {
    expect(rangeOf(70, p)).toBe('in')
    expect(rangeOf(180, p)).toBe('in')
  })

  it('flags values outside the bounds', () => {
    expect(rangeOf(69, p)).toBe('low')
    expect(rangeOf(181, p)).toBe('high')
  })
})

describe('needsHypoCare', () => {
  it('is true for a below-range reading within the last 2 hours', () => {
    expect(needsHypoCare(p, glucose(58, 30), NOW)).toBe(true)
  })

  it('expires after 2 hours: the hypo is assumed handled', () => {
    expect(needsHypoCare(p, glucose(58, 121), NOW)).toBe(false)
  })

  it('ignores in-range readings, missing readings and other entry kinds', () => {
    expect(needsHypoCare(p, glucose(95, 10), NOW)).toBe(false)
    expect(needsHypoCare(p, undefined, NOW)).toBe(false)
    expect(needsHypoCare(p, { ts: NOW, kind: 'bp', sys: 130, dia: 80 }, NOW)).toBe(false)
  })
})

describe('lastGlucoseText', () => {
  it('says there is no recent reading when there is none', () => {
    expect(lastGlucoseText(undefined, NOW)).toBe('sin medición reciente')
  })

  it('uses minutes under 90 minutes', () => {
    expect(lastGlucoseText(glucose(134, 25), NOW)).toBe('134 mg/dl hace 25 min')
  })

  it('switches to hours from 90 minutes, and to days from 36 hours', () => {
    expect(lastGlucoseText(glucose(134, 120), NOW)).toBe('134 mg/dl hace 2 h')
    expect(lastGlucoseText(glucose(134, 3 * 24 * 60), NOW)).toBe('134 mg/dl hace 3 días')
  })

  it('appends the moment note so the prompt knows the context', () => {
    expect(lastGlucoseText(glucose(101, 40, 'ayunas'), NOW)).toBe('101 mg/dl hace 40 min (ayunas)')
  })
})
