import { describe, expect, it } from 'vitest'
import type { Entry } from './types'
import { defaultProfile } from './types'
import { computeStats } from './stats'

const p = { ...defaultProfile, low: 70, high: 180 }

// timestamps built from local-time ISO strings round-trip through toDateString,
// so the calendar-day grouping is deterministic in any timezone
const at = (iso: string) => new Date(iso).getTime()

const glucose = (value: number, iso: string, note?: string): Entry => ({
  ts: at(iso),
  kind: 'glucose',
  value,
  note,
})
const tag = (label: string, iso: string): Entry => ({ ts: at(iso), kind: 'tag', label })
const exercise = (iso: string, min = 30): Entry => ({ ts: at(iso), kind: 'exercise', value: min })
const bp = (sys: number, dia: number, iso: string): Entry => ({ ts: at(iso), kind: 'bp', sys, dia })
const sleep = (iso: string, minutes: number): Entry => ({ ts: at(iso), kind: 'sleep', value: minutes })
const steps = (iso: string, count: number): Entry => ({ ts: at(iso), kind: 'steps', value: count })

describe('computeStats with an empty diary', () => {
  it('returns the neutral shape', () => {
    expect(computeStats([], p)).toEqual({
      n: 0,
      mean: null,
      tir: 0,
      pctLow: 0,
      pctHigh: 0,
      fasting: null,
      tagEffects: [],
      exerciseDelta: null,
      exerciseDays: 0,
      bpMean: null,
      sleepMean: null,
      sleepDelta: null,
      shortSleepDays: 0,
      stepsMean: null,
    })
  })
})

describe('glucose count and mean', () => {
  it('counts only glucose entries that carry a value', () => {
    const stats = computeStats(
      [
        glucose(100, '2026-07-20T08:00:00'),
        { ts: at('2026-07-20T09:00:00'), kind: 'glucose' }, // reading without a value
        { ts: at('2026-07-20T14:00:00'), kind: 'meal', carbs: 40 },
        bp(130, 80, '2026-07-20T11:00:00'),
      ],
      p,
    )
    expect(stats.n).toBe(1)
    expect(stats.mean).toBe(100)
  })

  it('averages all glucose readings', () => {
    const stats = computeStats(
      [
        glucose(80, '2026-07-20T08:00:00'),
        glucose(120, '2026-07-20T14:00:00'),
        glucose(160, '2026-07-20T21:00:00'),
      ],
      p,
    )
    expect(stats.n).toBe(3)
    expect(stats.mean).toBe(120)
  })
})

describe('time in range', () => {
  it('treats readings exactly at the range bounds as in range', () => {
    const stats = computeStats(
      [glucose(70, '2026-07-20T08:00:00'), glucose(180, '2026-07-20T14:00:00')],
      p,
    )
    expect(stats.tir).toBe(100)
    expect(stats.pctLow).toBe(0)
    expect(stats.pctHigh).toBe(0)
  })

  it('splits low / in range / high as percentages of the readings', () => {
    const stats = computeStats(
      [
        glucose(69, '2026-07-20T08:00:00'),
        glucose(181, '2026-07-20T14:00:00'),
        glucose(100, '2026-07-21T08:00:00'),
        glucose(140, '2026-07-21T14:00:00'),
      ],
      p,
    )
    expect(stats.pctLow).toBe(25)
    expect(stats.pctHigh).toBe(25)
    expect(stats.tir).toBe(50)
  })
})

describe('fasting mean', () => {
  it("averages only readings whose note is exactly 'ayunas'", () => {
    const stats = computeStats(
      [
        glucose(95, '2026-07-20T07:30:00', 'ayunas'),
        glucose(110, '2026-07-21T07:45:00', 'ayunas'),
        glucose(200, '2026-07-20T22:00:00', 'después de cenar'),
        glucose(150, '2026-07-21T12:00:00'),
      ],
      p,
    )
    expect(stats.fasting).toBe(102.5)
  })

  it('is null when no reading is marked as fasting', () => {
    expect(computeStats([glucose(100, '2026-07-20T08:00:00')], p).fasting).toBeNull()
  })
})

describe('bpMean', () => {
  it('averages systolic and diastolic separately, skipping incomplete readings', () => {
    const stats = computeStats(
      [
        bp(130, 80, '2026-07-20T09:00:00'),
        bp(140, 90, '2026-07-21T09:00:00'),
        { ts: at('2026-07-22T09:00:00'), kind: 'bp', sys: 150 }, // no diastolic: skipped entirely
      ],
      p,
    )
    expect(stats.bpMean).toEqual({ sys: 135, dia: 85 })
  })

  it('is null when there is no complete blood-pressure reading', () => {
    const stats = computeStats(
      [{ ts: at('2026-07-20T09:00:00'), kind: 'bp', sys: 150 }, glucose(100, '2026-07-20T08:00:00')],
      p,
    )
    expect(stats.bpMean).toBeNull()
  })
})

describe('exercise effect', () => {
  it('compares the mean on exercise days against the other days', () => {
    const stats = computeStats(
      [
        exercise('2026-07-20T18:00:00', 45),
        glucose(100, '2026-07-20T08:00:00'),
        glucose(110, '2026-07-20T20:00:00'),
        glucose(130, '2026-07-21T08:00:00'),
        glucose(140, '2026-07-21T20:00:00'),
      ],
      p,
    )
    expect(stats.exerciseDelta).toBe(-30) // 105 on the exercise day vs 135 on the rest
    expect(stats.exerciseDays).toBe(1)
  })

  it('groups by calendar day, not by cause: a reading taken before the exercise still counts as an exercise-day reading', () => {
    const stats = computeStats(
      [
        glucose(100, '2026-07-20T08:00:00'), // 15 h before the exercise, same day
        exercise('2026-07-20T23:00:00'),
        glucose(120, '2026-07-21T08:00:00'),
      ],
      p,
    )
    expect(stats.exerciseDelta).toBe(-20)
  })

  it('counts distinct exercise days even when nothing else was logged that day', () => {
    const stats = computeStats(
      [
        exercise('2026-07-20T18:00:00'),
        exercise('2026-07-20T20:00:00'), // same day, counted once
        exercise('2026-07-22T18:00:00'),
      ],
      p,
    )
    expect(stats.exerciseDays).toBe(2)
    expect(stats.exerciseDelta).toBeNull() // no glucose readings to compare
  })

  it('is null when there is no day without exercise to compare against', () => {
    const stats = computeStats(
      [exercise('2026-07-20T18:00:00'), glucose(100, '2026-07-20T08:00:00')],
      p,
    )
    expect(stats.exerciseDelta).toBeNull()
    expect(stats.exerciseDays).toBe(1)
  })
})

describe('sleep and steps from automatic data', () => {
  it('averages nightly sleep minutes and daily steps', () => {
    const stats = computeStats(
      [
        sleep('2026-07-20T07:30:00', 420),
        sleep('2026-07-21T07:30:00', 380),
        steps('2026-07-20T12:00:00', 9000),
        steps('2026-07-21T12:00:00', 5000),
      ],
      p,
    )
    expect(stats.sleepMean).toBe(400)
    expect(stats.stepsMean).toBe(7000)
  })

  it('compares the glucose mean on short-sleep days (<6 h) against the other days', () => {
    const stats = computeStats(
      [
        sleep('2026-07-20T07:30:00', 320), // short night → its day
        glucose(150, '2026-07-20T10:00:00'),
        glucose(160, '2026-07-20T16:00:00'),
        sleep('2026-07-21T07:30:00', 450),
        glucose(110, '2026-07-21T10:00:00'),
        glucose(120, '2026-07-21T16:00:00'),
      ],
      p,
    )
    expect(stats.sleepDelta).toBe(40) // 155 vs 115
    expect(stats.shortSleepDays).toBe(1)
  })

  it('sleepDelta is null without both short-sleep days and normal days to compare', () => {
    const onlyShort = computeStats(
      [sleep('2026-07-20T07:30:00', 300), glucose(150, '2026-07-20T10:00:00')],
      p,
    )
    expect(onlyShort.sleepDelta).toBeNull()
    expect(onlyShort.shortSleepDays).toBe(1)

    const noSleepData = computeStats([glucose(120, '2026-07-20T10:00:00')], p)
    expect(noSleepData.sleepDelta).toBeNull()
    expect(noSleepData.shortSleepDays).toBe(0)
  })

  it('exactly 6 hours is not a short night', () => {
    const stats = computeStats([sleep('2026-07-20T07:30:00', 360)], p)
    expect(stats.shortSleepDays).toBe(0)
  })
})

describe('tagEffects', () => {
  it('measures each tag as the mean of readings within 14 h after it minus the overall mean, sorted by absolute effect', () => {
    // overall mean = (150+170+90+100+110+130)/6 = 125
    const stats = computeStats(
      [
        tag('Mal sueño', '2026-07-19T23:00:00'),
        glucose(150, '2026-07-20T07:00:00'), // 8 h after
        glucose(170, '2026-07-20T09:00:00'), // 10 h after
        tag('Estrés', '2026-07-21T08:00:00'),
        glucose(90, '2026-07-21T10:00:00'),
        glucose(100, '2026-07-21T12:00:00'),
        glucose(110, '2026-07-23T08:00:00'),
        glucose(130, '2026-07-23T12:00:00'),
      ],
      p,
    )
    // |+35| ranks above |-30|
    expect(stats.tagEffects).toEqual([
      { label: 'Mal sueño', delta: 35, n: 2 },
      { label: 'Estrés', delta: -30, n: 2 },
    ])
  })

  it('drops tags with fewer than 2 readings in their window', () => {
    const stats = computeStats(
      [
        tag('Alcohol', '2026-07-20T21:00:00'),
        glucose(160, '2026-07-21T08:00:00'), // the only reading within 14 h
        glucose(100, '2026-07-23T08:00:00'),
        glucose(120, '2026-07-23T12:00:00'),
      ],
      p,
    )
    expect(stats.tagEffects).toEqual([])
  })

  it('excludes readings exactly at the tag time and exactly 14 h later', () => {
    const stats = computeStats(
      [
        tag('Alcohol', '2026-07-20T08:00:00'),
        glucose(40, '2026-07-20T08:00:00'), // same instant: out
        glucose(120, '2026-07-20T10:00:00'), // 2 h: in
        glucose(140, '2026-07-20T12:00:00'), // 4 h: in
        glucose(40, '2026-07-20T22:00:00'), // exactly 14 h: out
      ],
      p,
    )
    // overall mean = 85, window mean = 130
    expect(stats.tagEffects).toEqual([{ label: 'Alcohol', delta: 45, n: 2 }])
  })

  it('counts the very reading a tag was written on: that is the point of writing it there', () => {
    const stats = computeStats(
      [
        { ...glucose(200, '2026-07-20T08:00:00'), tags: ['Mal sueño'] },
        glucose(160, '2026-07-20T12:00:00'), // same day, inside the 14 h window
        glucose(100, '2026-07-23T08:00:00'),
        glucose(100, '2026-07-23T12:00:00'),
      ],
      p,
    )
    // overall mean = 140, tagged window = (200+160)/2 = 180
    expect(stats.tagEffects).toEqual([{ label: 'Mal sueño', delta: 40, n: 2 }])
  })

  it('a tag written on a reading still colours the hours that follow', () => {
    const stats = computeStats(
      [
        { ...glucose(150, '2026-07-20T08:00:00'), tags: ['Estrés'] },
        glucose(190, '2026-07-20T21:00:00'), // 13 h later: in
        glucose(110, '2026-07-20T23:00:00'), // 15 h later: out
        glucose(110, '2026-07-23T12:00:00'),
      ],
      p,
    )
    expect(stats.tagEffects[0]).toEqual({ label: 'Estrés', delta: 30, n: 2 })
  })

  it('mixes both ways of writing context into a single pattern', () => {
    const stats = computeStats(
      [
        tag('Alcohol', '2026-07-20T21:00:00'),
        glucose(180, '2026-07-21T08:00:00'), // from the standalone tag
        { ...glucose(160, '2026-07-22T09:00:00'), tags: ['Alcohol'] }, // written on the reading
        glucose(100, '2026-07-25T08:00:00'),
        glucose(100, '2026-07-25T12:00:00'),
      ],
      p,
    )
    // overall mean = 135, tagged = (180+160)/2 = 170
    expect(stats.tagEffects).toEqual([{ label: 'Alcohol', delta: 35, n: 2 }])
  })

  it('merges repeated occurrences of the same label into one effect, counting each reading once', () => {
    const stats = computeStats(
      [
        tag('Estrés', '2026-07-20T08:00:00'),
        tag('Estrés', '2026-07-20T09:00:00'), // overlapping windows
        glucose(150, '2026-07-20T10:00:00'), // inside both windows
        glucose(170, '2026-07-20T12:00:00'), // inside both windows
        glucose(100, '2026-07-22T08:00:00'),
      ],
      p,
    )
    // overall mean = 140, window mean = 160
    expect(stats.tagEffects).toEqual([{ label: 'Estrés', delta: 20, n: 2 }])
  })

  it('ignores tag entries without a label', () => {
    const stats = computeStats(
      [
        { ts: at('2026-07-20T08:00:00'), kind: 'tag' },
        glucose(100, '2026-07-20T10:00:00'),
        glucose(120, '2026-07-20T12:00:00'),
      ],
      p,
    )
    expect(stats.tagEffects).toEqual([])
  })
})
