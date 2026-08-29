import { describe, expect, it } from 'vitest'
import { defaultProfile, type Entry, type Profile } from '../domain/types'
import type { Stats } from '../domain/stats'
import { buildContext, chatPrompt, mealPrompt, reviewPrompt, suggestMealPrompt } from './prompts'

// The AI that lives inside the phone (Apple's Foundation Models, Gemini Nano) works with a
// window of roughly 4k tokens SHARED between the question and the answer — a fraction of what
// Gemini in the cloud allows. In Spanish a token is about 3.5 characters, so these ceilings
// leave the answer comfortable room. Today every prompt fits with plenty to spare; this test
// exists so a future addition to buildContext does not quietly close the native door.
const CHARS_PER_TOKEN = 3.5
const budget = (chars: number) => Math.round(chars / CHARS_PER_TOKEN)

// the heaviest realistic case: every field filled, four drugs, four patterns, weight mode on
const p: Profile = {
  ...defaultProfile,
  name: 'Javier',
  type: 't2',
  measurement: 'sensor',
  basal: true,
  bolus: true,
  pills: true,
  hypertension: true,
  meds: [
    { name: 'Metformina', dose: '850 mg · desayuno y cena', kind: 'pill' },
    { name: 'Lantus', dose: '22 U · antes de dormir', kind: 'basal' },
    { name: 'Humalog', dose: 'según comida', kind: 'bolus' },
    { name: 'Ozempic', dose: '0,5 mg', kind: 'pill', weekday: 2 },
  ],
  birthYear: 1978,
  heightCm: 174,
  targetWeightKg: 85,
}

const stats: Stats = {
  n: 96,
  mean: 142,
  tir: 68,
  pctLow: 4,
  pctHigh: 28,
  fasting: 128,
  tagEffects: [
    { label: 'Mal sueño', delta: 10.4, n: 5 },
    { label: 'Estrés', delta: 8.1, n: 4 },
    { label: 'Alcohol', delta: -6.2, n: 3 },
    { label: 'Comida fuera', delta: 19.3, n: 6 },
  ],
  exerciseDelta: -13.2,
  exerciseDays: 6,
  bpMean: { sys: 138, dia: 84 },
  sleepMean: 402,
  sleepDelta: 11.5,
  shortSleepDays: 4,
  stepsMean: 7432,
}

const NOW = new Date('2026-08-03T12:00:00').getTime()
const DAY = 86_400_000
// BMI over the threshold, so the weight block is in play too
const weights: Entry[] = Array.from({ length: 8 }, (_, i) => ({
  ts: NOW - (7 - i) * 7 * DAY,
  kind: 'weight',
  value: 96 - i * 0.4,
}))
const entries: Entry[] = Array.from({ length: 200 }, (_, i) => ({
  ts: NOW - i * 3_600_000,
  kind: 'glucose',
  value: 60 + (i % 130),
}))

const ctx = buildContext(p, stats, entries, weights)

describe('prompt budget for an on-device model', () => {
  it('the shared context fits in about 700 tokens', () => {
    expect(budget(ctx.length)).toBeLessThan(700)
  })

  it('the fortnightly review fits', () => {
    expect(budget(reviewPrompt(ctx, p.name).length)).toBeLessThan(850)
  })

  it('the chat fits, with a full conversation behind it', () => {
    // coach.ts sends the last 7 turns; 200 characters each is a long message
    const history = Array.from({ length: 7 }, (_, i) => `${i % 2 ? 'Glyno' : 'Javier'}: ${'x'.repeat(200)}`).join('\n')
    expect(budget(chatPrompt(ctx, history, p.name).length)).toBeLessThan(1300)
  })

  it('the meal suggestion fits', () => {
    const info = {
      moment: 'la cena',
      time: '21:00',
      lastReading: '145 mg/dl hace 1 h',
      usual: ['Lentejas con arroz (~75 g HC) ×3', 'Pollo al horno (~20 g HC)', 'Ensalada de atún (~12 g HC)'],
      others: ['Tortilla de patatas (~35 g HC)', 'Merluza a la plancha (~5 g HC)'],
    }
    expect(budget(suggestMealPrompt(ctx, info).length)).toBeLessThan(1000)
  })

  it('the plate analysis fits (it also carries the photo)', () => {
    const prompt = mealPrompt(p, true, 'lentejas con arroz, ensalada y plátano', {
      lastReading: '145 mg/dl hace 1 h',
      hypo: true,
    })
    expect(budget(prompt.length)).toBeLessThan(750)
  })
})
