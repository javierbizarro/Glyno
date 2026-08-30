import { describe, expect, it } from 'vitest'
import type { Stats } from './stats'
import { defaultProfile } from './types'
import { localReview } from './localReview'

const p = { ...defaultProfile, name: 'Javier', low: 70, high: 180 }

const stats = (s: Partial<Stats> = {}): Stats => ({
  n: 28,
  mean: 148,
  tir: 68,
  pctLow: 0,
  pctHigh: 32,
  fasting: 132,
  tagEffects: [],
  exerciseDelta: null,
  exerciseDays: 0,
  bpMean: null,
  sleepMean: null,
  sleepDelta: null,
  shortSleepDays: 0,
  stepsMean: null,
  ...s,
})

const words = (t: string) => t.trim().split(/\s+/).length

describe('localReview · the red lines, which is the whole point of writing it ourselves', () => {
  it('never says a dose, a unit or a medication change — it cannot, there is no sentence for it', () => {
    const text = localReview('Javier', { ...p, basal: true, meds: [{ name: 'Lantus', dose: '22 U', kind: 'basal' }] }, stats())
    expect(text).not.toMatch(/\bU\b|unidades|dosis|sube la|baja la|aumenta|reduce la/i)
    expect(text).not.toMatch(/Lantus/)
  })

  it('sends repeated lows to the medical team instead of explaining them away', () => {
    const text = localReview('Javier', p, stats({ pctLow: 14, tir: 60, mean: 118 }))
    expect(text).toMatch(/bajas|hipoglucemias/i)
    expect(text).toMatch(/equipo (médico|sanitario)|tu médic/i)
  })

  it('never talks about "tu diabetes" to someone without a diagnosis', () => {
    const text = localReview('Ana', { ...p, type: 'none', low: 70, high: 140 }, stats())
    expect(text).not.toMatch(/tu diabetes|tu diabetes/i)
  })

  it('never invents a pattern that is not in the numbers', () => {
    const text = localReview('Javier', p, stats())
    // no exercise, sleep or tag effects were measured: nothing may be claimed about them.
    // Word boundaries matter here: "quincena" ends in "cena"
    expect(text).not.toMatch(/\bejercicio|\bdormir|\bsueño|\bcena/i)
    expect(text).toMatch(/todavía|aún/i)
  })
})

describe('localReview · what it says when there is something to say', () => {
  const rich = stats({
    exerciseDelta: -13,
    exerciseDays: 5,
    sleepDelta: 10,
    shortSleepDays: 3,
    tagEffects: [{ label: 'Cena copiosa', delta: 19, n: 4 }],
  })

  it('opens with the numbers that matter', () => {
    const text = localReview('Javier', p, rich)
    expect(text).toMatch(/28/)
    expect(text).toMatch(/148/)
    expect(text).toMatch(/68/)
  })

  it('names each pattern with its own number, never rounded into vagueness', () => {
    const text = localReview('Javier', p, rich)
    expect(text).toMatch(/13/)
    expect(text).toMatch(/10/)
    expect(text).toMatch(/19/)
  })

  it('anchors its advice to the patterns it just named, and gives at most three', () => {
    const text = localReview('Javier', p, rich)
    const advice = text.split('\n\n')[2]
    expect(advice).toMatch(/Puedes probar/i)
    expect(advice.split('\n').length).toBeLessThanOrEqual(4) // heading + 3
  })

  it('greets by name and closes with encouragement, never with a reproach', () => {
    const text = localReview('Javier', p, rich)
    expect(text).toMatch(/Javier/)
    expect(text).not.toMatch(/deberías|tendrías que|mal hecho|fallo/i)
  })

  it('stays within the same budget the AI is given', () => {
    expect(words(localReview('Javier', p, rich))).toBeLessThanOrEqual(180)
  })

  it('keeps the four-part shape and no markdown', () => {
    const text = localReview('Javier', p, rich)
    expect(text.split('\n\n')).toHaveLength(4)
    expect(text).not.toMatch(/[*#_]/)
  })
})

describe('localReview · when the diary is thin', () => {
  it('does not put a percentage on two readings', () => {
    const text = localReview('Javier', p, stats({ n: 2, mean: 162, tir: 50, pctHigh: 50 }))
    expect(text).not.toMatch(/50\s*%/)
    expect(text).toMatch(/pocas|poco|todavía|aún/i)
  })

  it('says plainly that there is nothing yet rather than padding', () => {
    const text = localReview('Javier', p, stats({ n: 0, mean: null, tir: 0, pctHigh: 0, fasting: null }))
    expect(words(text)).toBeLessThan(80)
    expect(text).toMatch(/Javier/)
  })

  it('does not ask for glucose readings from someone who does not measure', () => {
    const text = localReview('Ana', { ...p, measurement: 'none' }, stats({ n: 0, mean: null, tir: 0, pctHigh: 0, fasting: null }))
    expect(text).not.toMatch(/glucem|medici[óo]n/i)
  })
})

describe('localReview · not the same words every fortnight', () => {
  it('changes its phrasing as the numbers change', () => {
    const a = localReview('Javier', p, stats({ n: 28, mean: 148, tir: 68 }))
    const b = localReview('Javier', p, stats({ n: 31, mean: 141, tir: 74 }))
    expect(a.split('\n\n')[0]).not.toBe(b.split('\n\n')[0])
  })

  it('is the same text for the same data: it can be tested, which the AI never can', () => {
    expect(localReview('Javier', p, stats())).toBe(localReview('Javier', p, stats()))
  })
})

describe('localReview · noise is not a pattern', () => {
  it('keeps quiet about differences too small to mean anything', () => {
    // "los días que te mueves tu media baja 1 mg/dl" makes Glyno look like she counts sand
    const text = localReview('Javier', p, stats({
      exerciseDelta: -1,
      exerciseDays: 5,
      sleepDelta: 2,
      shortSleepDays: 3,
      tagEffects: [{ label: 'Cena copiosa', delta: 3, n: 9 }],
    }))
    expect(text).toMatch(/Todavía no hay ningún patrón/)
    expect(text).not.toMatch(/1 mg\/dl|2 mg\/dl|3 mg\/dl/)
  })

  it('still tells the ones that are big enough, with their units', () => {
    const text = localReview('Javier', p, stats({ tagEffects: [{ label: 'Cena copiosa', delta: 19, n: 4 }] }))
    expect(text).toMatch(/19 mg\/dl por encima/)
  })
})

describe('localReview · no flattery on thin data', () => {
  it('does not congratulate anyone for two readings', () => {
    const text = localReview('Javier', p, stats({ n: 2, mean: 155, tir: 100, pctHigh: 0 }))
    expect(text).not.toMatch(/Vas bien|redonda|Buen trabajo/i)
    expect(text.split('\n\n')[3]).toMatch(/fundamento|adivinar/i)
  })
})
