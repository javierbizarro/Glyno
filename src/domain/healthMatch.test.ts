import { describe, expect, it } from 'vitest'
import type { Entry } from './types'
import { CLAIMABLE, sameReading } from './healthMatch'

const at = (iso: string) => new Date(iso).getTime()
const mine = (e: Partial<Entry>): Entry => ({ ts: at('2026-08-30T08:10:00'), kind: 'glucose', source: 'manual', ...e })
const theirs = (e: Partial<Entry>): Entry => ({ ...mine(e), source: 'health', extId: 'health:x' })

describe('sameReading · glucose', () => {
  it('is the same reading when the number matches and the clocks are minutes apart', () => {
    // you write down 137 the moment you prick; the meter dumps it into Salud a bit later
    expect(sameReading(mine({ value: 137 }), theirs({ value: 137, ts: at('2026-08-30T08:19:00') }))).toBe(true)
  })

  it('is a different reading when the number differs', () => {
    expect(sameReading(mine({ value: 137 }), theirs({ value: 152 }))).toBe(false)
  })

  it('is a different reading hours later, however equal the number', () => {
    expect(sameReading(mine({ value: 137 }), theirs({ value: 137, ts: at('2026-08-30T12:10:00') }))).toBe(false)
  })
})

describe('sameReading · other kinds', () => {
  it('matches blood pressure on both numbers', () => {
    const bp = { kind: 'bp' as const, sys: 138, dia: 84 }
    expect(sameReading(mine(bp), theirs({ ...bp, ts: at('2026-08-30T08:20:00') }))).toBe(true)
    expect(sameReading(mine(bp), theirs({ ...bp, dia: 90 }))).toBe(false)
  })

  it('matches a weighing anywhere in the same day, allowing for rounding', () => {
    // you type 92 and the scale says 92.1: one weighing, not two
    const day = { kind: 'weight' as const, ts: at('2026-08-30T08:00:00'), value: 92 }
    expect(sameReading(mine(day), theirs({ ...day, ts: at('2026-08-30T21:30:00'), value: 92.1 }))).toBe(true)
    expect(sameReading(mine(day), theirs({ ...day, ts: at('2026-08-31T08:00:00') }))).toBe(false)
    expect(sameReading(mine(day), theirs({ ...day, value: 95 }))).toBe(false)
  })

  it('matches a walk you wrote down with the workout the phone saw', () => {
    const walk = { kind: 'exercise' as const, ts: at('2026-08-30T18:30:00'), value: 40 }
    expect(sameReading(mine(walk), theirs({ ...walk, ts: at('2026-08-30T18:50:00') }))).toBe(true)
    expect(sameReading(mine(walk), theirs({ ...walk, ts: at('2026-08-30T21:00:00') }))).toBe(false)
  })

  it('never touches what nobody writes by hand', () => {
    for (const kind of ['steps', 'sleep', 'activity', 'cycling'] as const) {
      expect(CLAIMABLE.includes(kind as never)).toBe(false)
    }
  })
})

describe('sameReading · what must never be claimed', () => {
  it('leaves alone a row that already came from Salud', () => {
    // it has its own id and is deduped by it; claiming it would merge two real readings
    expect(sameReading(theirs({ value: 137, extId: 'health:glucose:OTHER' }), theirs({ value: 137 }))).toBe(false)
  })

  it('never matches across kinds', () => {
    expect(sameReading(mine({ kind: 'weight', value: 92 }), theirs({ kind: 'glucose', value: 92 }))).toBe(false)
  })
})
