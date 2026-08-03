import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { weekRange } from './week'

const DAY = 86_400_000
// Wednesday 5 Aug 2026, mid-afternoon (local time)
const WEDNESDAY = new Date(2026, 7, 5, 15, 23, 45)

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(WEDNESDAY)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('weekRange', () => {
  it('offset 0 is the current week, starting Monday at local midnight', () => {
    const w = weekRange(0)
    expect(w.from).toBe(new Date(2026, 7, 3).getTime()) // Monday 3 Aug 00:00
    expect(w.to).toBe(new Date(2026, 7, 10).getTime()) // next Monday 00:00
  })

  it('spans exactly 7 days, `to` being the start of the following Monday', () => {
    const w = weekRange(0)
    expect(w.to - w.from).toBe(7 * DAY)
  })

  it('goes back one week per negative offset', () => {
    expect(weekRange(-1)).toEqual({
      from: new Date(2026, 6, 27).getTime(),
      to: new Date(2026, 7, 3).getTime(),
    })
    expect(weekRange(-2).from).toBe(new Date(2026, 6, 20).getTime())
  })

  it('goes forward with positive offsets', () => {
    expect(weekRange(1)).toEqual({
      from: new Date(2026, 7, 10).getTime(),
      to: new Date(2026, 7, 17).getTime(),
    })
  })

  it('tiles adjacent weeks with no gap or overlap', () => {
    expect(weekRange(-1).to).toBe(weekRange(0).from)
  })

  it('keeps Sunday night inside the week that started the previous Monday', () => {
    vi.setSystemTime(new Date(2026, 7, 9, 23, 59, 59)) // Sunday, last second
    expect(weekRange(0).from).toBe(new Date(2026, 7, 3).getTime())
  })

  it('starts a new week exactly at Monday midnight', () => {
    vi.setSystemTime(new Date(2026, 7, 10, 0, 0, 0)) // Monday 00:00:00
    expect(weekRange(0).from).toBe(new Date(2026, 7, 10).getTime())
  })

  it('crosses month and year boundaries correctly', () => {
    vi.setSystemTime(new Date(2026, 0, 1, 12, 0, 0)) // Thursday 1 Jan 2026
    const w = weekRange(0)
    expect(w.from).toBe(new Date(2025, 11, 29).getTime()) // Monday 29 Dec 2025
    expect(w.to).toBe(new Date(2026, 0, 5).getTime())
  })
})
