import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Entry, Profile } from './types'
import { defaultProfile } from './types'
import { daysAgo } from './time'
import { findGaps } from './gaps'

const HOUR = 3_600_000

// findGaps takes no `now`: its week/month windows come from daysAgo(), which
// reads the real clock, so the clock is frozen for every test
const NOW = new Date('2026-08-05T18:00:00').getTime()

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})
afterEach(() => vi.useRealTimers())

const glucose = (ts: number, value: number, note?: string): Entry => ({ ts, kind: 'glucose', value, note })
const tag = (ts: number, label: string): Entry => ({ ts, kind: 'tag', label })
const weight = (ts: number): Entry => ({ ts, kind: 'weight', value: 82 })

// profile with nothing missing: treatment listed in the med cabinet, age and height set
const complete: Profile = {
  ...defaultProfile,
  pills: true,
  meds: [{ name: 'Metformina', dose: '850 mg', kind: 'pill' }],
  birthYear: 1978,
  heightCm: 174,
}

// diary with nothing missing by default: a fasting reading this week, a context
// tag and 14 glucose readings in total (1 fasting + `extra`)
const diary = (opts: { ayunasTs?: number; extra?: number; tags?: boolean } = {}): Entry[] => {
  const { ayunasTs = NOW - 24 * HOUR, extra = 13, tags = true } = opts
  return [
    glucose(ayunasTs, 105, 'ayunas'),
    ...Array.from({ length: extra }, (_, i) => glucose(NOW - (i + 1) * HOUR, 110 + i)),
    ...(tags ? [tag(NOW - 30 * HOUR, 'Mal sueño')] : []),
  ]
}

const recentWeight = () => weight(NOW - 5 * 24 * HOUR)

describe('findGaps', () => {
  it('reports nothing when profile and diary are complete', () => {
    expect(findGaps(complete, diary(), recentWeight())).toEqual([])
  })

  it('caps at two notices, in declaration order', () => {
    const gaps = findGaps(defaultProfile, [], undefined)
    expect(gaps).toEqual([
      { text: 'Esta semana no tengo glucemias en ayunas — son la mejor foto de cómo amaneces. Con 2 o 3 ya puedo compararte las mañanas.' },
      { text: 'Si marcas contexto (mal sueño, estrés, comida fuera…), puedo explicarte los días raros en vez de solo señalarlos.' },
    ])
  })

  it('asks for the med cabinet when the treatment says there should be meds in it', () => {
    const p = { ...complete, basal: true, meds: [] }
    expect(findGaps(p, diary(), recentWeight())).toEqual([
      { text: 'Si apuntas tu medicación en el botiquín (Ajustes), podré tener en cuenta tu pauta al valorar tus días.' },
    ])
  })

  it('does not ask for the med cabinet on a diet-and-exercise treatment', () => {
    const p = { ...complete, pills: false, meds: [] }
    expect(findGaps(p, diary(), recentWeight())).toEqual([])
  })

  it('wants a fasting reading from this week; midnight 6 days ago still counts', () => {
    expect(findGaps(complete, diary({ ayunasTs: daysAgo(6) }), recentWeight())).toEqual([])
    expect(findGaps(complete, diary({ ayunasTs: daysAgo(6) - 1 }), recentWeight())).toEqual([
      { text: 'Esta semana no tengo glucemias en ayunas — son la mejor foto de cómo amaneces. Con 2 o 3 ya puedo compararte las mañanas.' },
    ])
  })

  it("silences both glucose nudges when the user doesn't measure", () => {
    const noGlucoseDiary = [tag(NOW - HOUR, 'Estrés')]
    const p = { ...complete, measurement: 'none' as const }
    expect(findGaps(p, noGlucoseDiary, recentWeight())).toEqual([])
    // same diary with a meter: the fasting gap comes back
    expect(findGaps(complete, noGlucoseDiary, recentWeight())).toEqual([
      { text: 'Esta semana no tengo glucemias en ayunas — son la mejor foto de cómo amaneces. Con 2 o 3 ya puedo compararte las mañanas.' },
    ])
  })

  it('asks for context tags when there are none', () => {
    expect(findGaps(complete, diary({ tags: false }), recentWeight())).toEqual([
      { text: 'Si marcas contexto (mal sueño, estrés, comida fuera…), puedo explicarte los días raros en vez de solo señalarlos.' },
    ])
  })

  it('asks for birth year and height when either is missing', () => {
    const aboutYou = { text: 'Con tu año de nacimiento y altura (Ajustes → Sobre ti) afino el contexto y calculo tu IMC.' }
    expect(findGaps({ ...complete, birthYear: undefined }, diary(), recentWeight())).toEqual([aboutYou])
    expect(findGaps({ ...complete, heightCm: undefined }, diary(), recentWeight())).toEqual([aboutYou])
  })

  it('asks for a weigh-in when there is none or the last one is over 30 days old', () => {
    const monthly = { text: 'Una pesada al mes me basta para vigilar la tendencia del peso, que mueve mucho la glucosa.' }
    expect(findGaps(complete, diary(), undefined)).toEqual([monthly])
    expect(findGaps(complete, diary(), weight(daysAgo(30) - 1))).toEqual([monthly])
    // exactly 30 days ago (midnight-based) is still fresh enough
    expect(findGaps(complete, diary(), weight(daysAgo(30)))).toEqual([])
  })

  it('nudges for more readings under 14, but only once there is at least one', () => {
    expect(findGaps(complete, diary({ extra: 12 }), recentWeight())).toEqual([
      { text: 'Con un par de mediciones al día los patrones salen mucho más nítidos.' },
    ])
    expect(findGaps(complete, diary({ extra: 13 }), recentWeight())).toEqual([])
  })
})
