import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { daysAgo } from './time'

// Wednesday 5 Aug 2026, mid-afternoon (local time)
const NOW = new Date(2026, 7, 5, 15, 23, 45)

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('daysAgo', () => {
  it('returns the start of today for n = 0, dropping the time of day', () => {
    expect(daysAgo(0)).toBe(new Date(2026, 7, 5).getTime())
  })

  it('returns local midnight N calendar days back', () => {
    expect(daysAgo(1)).toBe(new Date(2026, 7, 4).getTime())
    expect(daysAgo(3)).toBe(new Date(2026, 7, 2).getTime())
  })

  it('crosses month boundaries', () => {
    expect(daysAgo(7)).toBe(new Date(2026, 6, 29).getTime())
  })

  it('crosses year boundaries', () => {
    vi.setSystemTime(new Date(2026, 0, 2, 8, 0, 0))
    expect(daysAgo(5)).toBe(new Date(2025, 11, 28).getTime())
  })

  it('counts calendar days, not 24h periods: right after midnight, 1 day ago is still yesterday', () => {
    vi.setSystemTime(new Date(2026, 7, 5, 0, 0, 1))
    expect(daysAgo(1)).toBe(new Date(2026, 7, 4).getTime())
  })

  it('accepts a negative n, returning the start of a future day (current behavior)', () => {
    expect(daysAgo(-1)).toBe(new Date(2026, 7, 6).getTime())
  })
})
