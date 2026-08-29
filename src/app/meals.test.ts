import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Entry } from '../domain/types'
import { defaultProfile } from '../domain/types'
import type { AiImage } from '../ports/ai'
import type { MealAnalysis, MealSuggestion } from './meals'
import { analyzeMeal, logMeal, saveMeal, suggestMeal } from './meals'
import { ai, entries } from './container'

vi.mock('./container', () => ({
  ai: { complete: vi.fn(), completeWithImage: vi.fn() },
  entries: { add: vi.fn() },
}))

const complete = vi.mocked(ai.complete)
const completeWithImage = vi.mocked(ai.completeWithImage)
const add = vi.mocked(entries.add)

const p = { ...defaultProfile, low: 70, high: 180 }
const MIN = 60_000
// local time on purpose: meal moments and the prompt clock use the local timezone
const NOW = new Date('2026-08-03T14:00:00').getTime() // 14:00 → lunch

const glucose = (value: number, minAgo: number): Entry => ({
  ts: NOW - minAgo * MIN,
  kind: 'glucose',
  value,
})

const mealAt = (iso: string, label: string, carbs?: number): Entry => ({
  ts: new Date(iso).getTime(),
  kind: 'meal',
  label,
  carbs,
})

const ANALYSIS: MealAnalysis = {
  dish: 'Lentejas con arroz',
  carbs_g: 75,
  glycemic_index: 'medium',
  traffic_light: 'amber',
  advice: 'Empieza por la ensalada.',
  better_avoid: ['arroz'],
}

const SUGGESTION: MealSuggestion = {
  options: [{ dish: 'Tortilla y ensalada', carbs_g: 42, why: 'tu cena habitual más ligera' }],
  avoid: ['zumo'],
  note: 'Buen provecho.',
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('analyzeMeal', () => {
  it('uses the text model when only a description is given', async () => {
    complete.mockResolvedValue(JSON.stringify(ANALYSIS))
    const result = await analyzeMeal(p, { desc: '  lentejas con arroz  ' })
    expect(result).toEqual(ANALYSIS)
    expect(completeWithImage).not.toHaveBeenCalled()
    expect(complete.mock.calls[0][0]).toContain('el usuario dice: "lentejas con arroz"')
  })

  it('uses the image model only when an image is passed', async () => {
    completeWithImage.mockResolvedValue(JSON.stringify(ANALYSIS))
    const image: AiImage = { mimeType: 'image/jpeg', base64: 'aGVsbG8=' }
    const result = await analyzeMeal(p, { image })
    expect(result).toEqual(ANALYSIS)
    expect(complete).not.toHaveBeenCalled()
    expect(completeWithImage).toHaveBeenCalledWith(expect.stringContaining('comida de la foto'), image)
  })

  it('unwraps the JSON from markdown fences', async () => {
    complete.mockResolvedValue('```json\n' + JSON.stringify(ANALYSIS) + '\n```')
    expect(await analyzeMeal(p, { desc: 'lentejas' })).toEqual(ANALYSIS)
  })

  it('extracts the JSON object out of surrounding prose', async () => {
    complete.mockResolvedValue(`Claro, aquí tienes el análisis: ${JSON.stringify(ANALYSIS)} ¡Que aproveche!`)
    expect(await analyzeMeal(p, { desc: 'lentejas' })).toEqual(ANALYSIS)
  })

  it('throws in Spanish when the response has no JSON object', async () => {
    complete.mockResolvedValue('No puedo analizar esa comida.')
    await expect(analyzeMeal(p, { desc: 'lentejas' })).rejects.toThrow('No he podido leer la respuesta. Inténtalo otra vez.')
  })

  it('asks again when the answer comes garbled: small models fail at the format, not the task', async () => {
    complete.mockResolvedValueOnce('Mmm, a ver...').mockResolvedValueOnce(JSON.stringify(ANALYSIS))
    expect(await analyzeMeal(p, { desc: 'lentejas' })).toEqual(ANALYSIS)
    expect(complete).toHaveBeenCalledTimes(2)
  })

  it('does not ask again when the network or the quota is the problem', async () => {
    complete.mockRejectedValue(new Error('Se agotó la cuota gratuita de hoy.'))
    await expect(analyzeMeal(p, { desc: 'lentejas' })).rejects.toThrow('cuota')
    expect(complete).toHaveBeenCalledTimes(1)
  })

  it('activates the hypo safeguard in the prompt for a recent below-range reading', async () => {
    complete.mockResolvedValue(JSON.stringify(ANALYSIS))
    await analyzeMeal(p, { desc: 'tostada con miel' }, glucose(58, 30))
    const prompt = complete.mock.calls[0][0]
    expect(prompt).toContain('última glucemia: 58 mg/dl hace 30 min')
    expect(prompt).toContain('lo primero es resolver la hipoglucemia')
    expect(prompt).toContain('deja "better_avoid" vacío')
  })

  it('omits the hypo block when the low reading is more than 2 hours old', async () => {
    complete.mockResolvedValue(JSON.stringify(ANALYSIS))
    await analyzeMeal(p, { desc: 'tostada con miel' }, glucose(58, 121))
    const prompt = complete.mock.calls[0][0]
    expect(prompt).toContain('última glucemia: 58 mg/dl hace 2 h')
    expect(prompt).not.toContain('resolver la hipoglucemia')
  })
})

describe('logMeal', () => {
  it('stamps the entry with the current time', async () => {
    await logMeal('Tortilla', 40, 'sugerida por Glyno')
    expect(add).toHaveBeenCalledWith({
      ts: NOW,
      kind: 'meal',
      label: 'Tortilla',
      carbs: 40,
      note: 'sugerida por Glyno',
    })
  })

  it('drops zero carbs instead of storing 0', async () => {
    await logMeal('Café solo', 0)
    expect(add).toHaveBeenCalledWith({ ts: NOW, kind: 'meal', label: 'Café solo' })
  })
})

describe('saveMeal', () => {
  it("logs the analyzed dish and carbs with Glyno's signature note", async () => {
    await saveMeal(ANALYSIS)
    expect(add).toHaveBeenCalledWith({
      ts: NOW,
      kind: 'meal',
      label: 'Lentejas con arroz',
      carbs: 75,
      note: 'analizada por Glyno',
    })
  })
})

describe('suggestMeal', () => {
  it('returns the parsed suggestion even when fenced', async () => {
    complete.mockResolvedValue('```json\n' + JSON.stringify(SUGGESTION) + '\n```')
    expect(await suggestMeal(p, [])).toEqual(SUGGESTION)
  })

  it('tells the model the current moment and time from the clock', async () => {
    complete.mockResolvedValue(JSON.stringify(SUGGESTION))
    await suggestMeal(p, [])
    expect(complete.mock.calls[0][0]).toContain('son las 14:00, toca la comida')
  })

  it('flips from lunch to afternoon snack at 16:00 sharp', async () => {
    complete.mockResolvedValue(JSON.stringify(SUGGESTION))
    vi.setSystemTime(new Date('2026-08-03T15:59:00'))
    await suggestMeal(p, [])
    vi.setSystemTime(new Date('2026-08-03T16:00:00'))
    await suggestMeal(p, [])
    expect(complete.mock.calls[0][0]).toContain('son las 15:59, toca la comida')
    expect(complete.mock.calls[1][0]).toContain('son las 16:00, toca la merienda')
  })

  it('separates usual-for-this-moment dishes (with averaged carbs and counts) from the rest', async () => {
    complete.mockResolvedValue(JSON.stringify(SUGGESTION))
    const recent = [
      mealAt('2026-08-01T14:00:00', 'Lentejas', 40),
      mealAt('2026-08-02T13:30:00', 'Lentejas', 50),
      mealAt('2026-08-01T21:00:00', 'Pizza', 90),
    ]
    await suggestMeal(p, recent)
    const prompt = complete.mock.calls[0][0]
    expect(prompt).toContain('los tiene a mano y le gustan): Lentejas (~45 g HC) ×2')
    expect(prompt).toContain('OTROS PLATOS DE SU DIARIO: Pizza (~90 g HC)')
  })

  it('shows Spanish placeholders when the diary has no meals yet', async () => {
    complete.mockResolvedValue(JSON.stringify(SUGGESTION))
    await suggestMeal(p, [])
    const prompt = complete.mock.calls[0][0]
    expect(prompt).toContain('le gustan): (todavía ninguno)')
    expect(prompt).toContain('OTROS PLATOS DE SU DIARIO: (ninguno)')
  })

  it('keeps an "other" dish whose name is a prefix of a usual dish', async () => {
    // the de-dupe must compare dish labels, not formatted strings: "Tort" at dinner
    // is a different dish from the lunch "Tortilla" and belongs in OTROS PLATOS
    complete.mockResolvedValue(JSON.stringify(SUGGESTION))
    const recent = [
      mealAt('2026-08-01T14:00:00', 'Tortilla', 40),
      mealAt('2026-08-01T21:00:00', 'Tort', 20),
    ]
    await suggestMeal(p, recent)
    expect(complete.mock.calls[0][0]).toContain('OTROS PLATOS DE SU DIARIO: Tort (~20 g HC)')
  })

  it('includes the last glucose reading text in the prompt', async () => {
    complete.mockResolvedValue(JSON.stringify(SUGGESTION))
    await suggestMeal(p, [], glucose(120, 45))
    expect(complete.mock.calls[0][0]).toContain('ÚLTIMA GLUCEMIA: 120 mg/dl hace 45 min')
  })

  it('passes the weights into the context: BMI appears when the profile has a height', async () => {
    complete.mockResolvedValue(JSON.stringify(SUGGESTION))
    const weights: Entry[] = [{ ts: NOW - 24 * 60 * MIN, kind: 'weight', value: 80 }]
    await suggestMeal({ ...p, heightCm: 175 }, [], undefined, weights)
    await suggestMeal(p, [], undefined, weights) // no height → no BMI
    expect(complete.mock.calls[0][0]).toContain('IMC 26.1')
    expect(complete.mock.calls[1][0]).not.toContain('IMC')
  })
})
