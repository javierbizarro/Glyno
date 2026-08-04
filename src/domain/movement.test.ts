import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Entry } from './types'
import { defaultProfile } from './types'
import { daysAgo } from './time'
import { movementState } from './movement'

const p = { ...defaultProfile, low: 70, high: 180 }
const MIN = 60_000
const HOUR = 60 * MIN

const INVITE = 'Hoy aún no te has movido; con 20-30 minutos vale.'
const POST_MEAL = 'Acabas de comer: un paseo de 10-15 minutos ahora suaviza el pico de después.'

// day windows must come from the `now` parameter alone: the real clock is frozen on a
// FAR-AWAY day, so anything inside reading Date.now() would make these tests fail
const setNow = (iso: string): number => {
  vi.setSystemTime(new Date('2020-01-01T12:00:00'))
  return new Date(iso).getTime()
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

const glucose = (ts: number, value: number): Entry => ({ ts, kind: 'glucose', value })
const exercise = (ts: number, minutes?: number): Entry => ({ ts, kind: 'exercise', value: minutes })
const meal = (ts: number): Entry => ({ ts, kind: 'meal', label: 'lentejas' })
const steps = (ts: number, count: number): Entry => ({ ts, kind: 'steps', value: count, source: 'health' })

describe('movementState priority ladder', () => {
  it('suggests nothing after a recent hypo, even when every other rung applies', () => {
    const now = setNow('2026-08-05T18:00:00')
    const entries = [
      exercise(now - 8 * HOUR, 20),
      meal(now - 30 * MIN),
      glucose(now - 30 * MIN, 58),
    ]
    const s = movementState(p, entries, now)
    expect(s.nudge).toBeNull()
    // the counters are still reported: only the suggestion is withheld
    expect(s.minutesToday).toBe(20)
    expect(s.activeDays).toBe(1)
  })

  it('stops blocking once the hypo is more than 2 hours old', () => {
    const now = setNow('2026-08-05T18:00:00')
    expect(movementState(p, [glucose(now - 3 * HOUR, 58)], now).nudge).toBe(INVITE)
  })

  it('acknowledges when the user already moved today', () => {
    const now = setNow('2026-08-05T18:00:00')
    const s = movementState(p, [exercise(now - 9 * HOUR, 45)], now)
    expect(s.nudge).toBe('Ya te has movido hoy, 45 min.')
  })

  it('suggests a post-meal walk between 15 and 90 minutes after eating, both edges exclusive', () => {
    const now = setNow('2026-08-05T18:00:00')
    expect(movementState(p, [meal(now - 16 * MIN)], now).nudge).toBe(POST_MEAL)
    expect(movementState(p, [meal(now - 89 * MIN)], now).nudge).toBe(POST_MEAL)
    // at exactly 15 and 90 minutes the window is closed: falls through to the invite
    expect(movementState(p, [meal(now - 15 * MIN)], now).nudge).toBe(INVITE)
    expect(movementState(p, [meal(now - 90 * MIN)], now).nudge).toBe(INVITE)
  })

  it('ranks the post-meal walk above the high-glucose walk', () => {
    const now = setNow('2026-08-05T18:00:00')
    const entries = [glucose(now - 30 * MIN, 210), meal(now - 30 * MIN)]
    expect(movementState(p, entries, now).nudge).toBe(POST_MEAL)
  })

  it('suggests a calm walk when the last glucose is above range and fresher than 3 h', () => {
    const now = setNow('2026-08-05T18:00:00')
    expect(movementState(p, [glucose(now - HOUR, 210)], now).nudge).toBe(
      'Vas por 210 mg/dl. Un paseo tranquilo ayuda a que baje.',
    )
  })

  it('skips the high-glucose walk at the range bound or once the reading is 3 h old', () => {
    const now = setNow('2026-08-05T18:00:00')
    expect(movementState(p, [glucose(now - HOUR, 180)], now).nudge).toBe(INVITE)
    expect(movementState(p, [glucose(now - 3 * HOUR, 210)], now).nudge).toBe(INVITE)
  })

  it('judges highs on the most recent reading only', () => {
    const now = setNow('2026-08-05T18:00:00')
    const entries = [glucose(now - HOUR, 210), glucose(now - 10 * MIN, 140)]
    expect(movementState(p, entries, now).nudge).toBe(INVITE)
  })

  it('invites softly from 9:00 to 21:59 and stays silent outside those hours', () => {
    expect(movementState(p, [], setNow('2026-08-05T08:59:00')).nudge).toBeNull()
    expect(movementState(p, [], setNow('2026-08-05T09:00:00')).nudge).toBe(INVITE)
    expect(movementState(p, [], setNow('2026-08-05T21:59:00')).nudge).toBe(INVITE)
    expect(movementState(p, [], setNow('2026-08-05T22:00:00')).nudge).toBeNull()
  })

  it('counts a meal eaten shortly before midnight for the post-meal walk', () => {
    // dinner at 23:55, opened the app at 00:15: the 15-90 min window is about
    // digestion, not about the calendar day
    const now = setNow('2026-08-05T00:15:00')
    expect(movementState(p, [meal(now - 20 * MIN)], now).nudge).toBe(POST_MEAL)
  })
})

describe('movementState with automatic steps', () => {
  it('a day with 8000+ steps counts as an active day; below the bar it does not', () => {
    const now = setNow('2026-08-05T18:00:00')
    const entries = [
      steps(now - 30 * HOUR, 8000), // yesterday, exactly at the threshold
      steps(now - 54 * HOUR, 7999), // two days ago, just below: going to the fridge is not moving
    ]
    expect(movementState(p, entries, now).activeDays).toBe(1)
  })

  it("acknowledges today's steps over the threshold instead of inviting, and reports movedToday", () => {
    const now = setNow('2026-08-05T18:00:00')
    const s = movementState(p, [steps(now - 6 * HOUR, 9241)], now)
    expect(s.nudge).toBe('Hoy ya llevas 9.241 pasos.')
    expect(s.movedToday).toBe(true)
  })

  it('steps below the threshold leave the normal ladder untouched', () => {
    const now = setNow('2026-08-05T18:00:00')
    const s = movementState(p, [steps(now - 6 * HOUR, 3200)], now)
    expect(s.nudge).toBe(INVITE)
    expect(s.movedToday).toBe(false)
  })

  it('logged exercise wins over the steps acknowledgment', () => {
    const now = setNow('2026-08-05T18:00:00')
    const s = movementState(p, [steps(now - 6 * HOUR, 9241), exercise(now - 2 * HOUR, 30)], now)
    expect(s.nudge).toContain('Ya te has movido hoy, 30 min')
    expect(s.movedToday).toBe(true)
  })

  it('a recent hypo still silences everything, steps included', () => {
    const now = setNow('2026-08-05T18:00:00')
    const s = movementState(p, [steps(now - 6 * HOUR, 9241), glucose(now - 30 * MIN, 58)], now)
    expect(s.nudge).toBeNull()
  })
})

describe('movementState counters', () => {
  it('counts distinct exercise days within the 7-day midnight-based window', () => {
    const now = setNow('2026-08-05T18:00:00')
    const weekStart = daysAgo(6, now)
    const entries = [
      exercise(weekStart - 1, 30), // 7 days ago: outside the window
      exercise(weekStart, 30), // exactly at the window start: inside
      exercise(now - 20 * HOUR, 15), // yesterday, twice...
      exercise(now - 19 * HOUR, 15), // ...still one active day
    ]
    const s = movementState(p, entries, now)
    expect(s.activeDays).toBe(2)
    expect(s.minutesToday).toBe(0)
  })

  it('sums only today for minutesToday; an entry without minutes adds zero', () => {
    const now = setNow('2026-08-05T18:00:00')
    const entries = [
      exercise(now - 20 * HOUR, 40), // yesterday
      exercise(now - 6 * HOUR, 15),
      exercise(now - 2 * HOUR, 20),
      exercise(now - HOUR), // logged without minutes
    ]
    const s = movementState(p, entries, now)
    expect(s.minutesToday).toBe(35)
    expect(s.activeDays).toBe(2)
    expect(s.nudge).toBe('Ya te has movido hoy, 35 min.')
  })
})

describe('movementState personal pattern suffix', () => {
  const NOW = new Date('2026-08-05T18:00:00').getTime()
  const day = (n: number, h: number) => daysAgo(n, NOW) + h * HOUR

  it('appends the pattern when exercise days average >3 mg/dl lower over 2+ days', () => {
    const now = setNow('2026-08-05T18:00:00')
    const entries = [
      glucose(day(6, 10), 120),
      glucose(day(5, 10), 120),
      exercise(day(3, 9), 20),
      glucose(day(3, 10), 100),
      exercise(day(0, 8), 30),
      glucose(day(0, 10), 100),
    ]
    expect(movementState(p, entries, now).nudge).toBe(
      'Ya te has movido hoy, 30 min. Los días que te mueves tu media baja 20 mg/dl.',
    )
  })

  it('also decorates the soft invite when the user has not moved today', () => {
    const now = setNow('2026-08-05T18:00:00')
    const entries = [
      exercise(day(5, 9), 20),
      glucose(day(5, 10), 100),
      exercise(day(3, 9), 20),
      glucose(day(3, 10), 100),
      glucose(day(2, 10), 120),
      glucose(day(1, 10), 120),
    ]
    expect(movementState(p, entries, now).nudge).toBe(
      'Hoy aún no te has movido; con 20-30 minutos vale. Los días que te mueves tu media baja 20 mg/dl.',
    )
  })

  it('omits the pattern when the improvement is 3 mg/dl or less', () => {
    const now = setNow('2026-08-05T18:00:00')
    const entries = [
      glucose(day(6, 10), 120),
      glucose(day(5, 10), 120),
      exercise(day(3, 9), 20),
      glucose(day(3, 10), 117),
      exercise(day(0, 8), 30),
      glucose(day(0, 10), 117),
    ]
    expect(movementState(p, entries, now).nudge).toBe('Ya te has movido hoy, 30 min.')
  })

  it('omits the pattern with fewer than 2 exercise days, however big the drop', () => {
    const now = setNow('2026-08-05T18:00:00')
    const entries = [
      glucose(day(6, 10), 130),
      glucose(day(5, 10), 130),
      exercise(day(0, 8), 30),
      glucose(day(0, 10), 100),
    ]
    expect(movementState(p, entries, now).nudge).toBe('Ya te has movido hoy, 30 min.')
  })
})
