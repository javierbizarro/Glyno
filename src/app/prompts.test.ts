import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Entry, Profile } from '../domain/types'
import { defaultProfile } from '../domain/types'
import type { Stats } from '../domain/stats'
import { buildContext, chatPrompt, mealPrompt, medsPhotoPrompt, reviewPrompt, suggestMealPrompt } from './prompts'

const profile = (over: Partial<Profile> = {}): Profile => ({ ...defaultProfile, name: 'Javier', ...over })

const emptyStats: Stats = {
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
}

const stats = (over: Partial<Stats> = {}): Stats => ({ ...emptyStats, ...over })

const NOW = new Date('2026-08-03T12:00:00').getTime()
const weight = (kg: number): Entry => ({ ts: NOW, kind: 'weight', value: kg })

describe('buildContext', () => {
  it('opens with the unbreakable rules: no doses, no medication changes, no diagnoses', () => {
    const ctx = buildContext(profile(), emptyStats, [])
    expect(ctx).toContain('REGLAS INQUEBRANTABLES: nunca sugieras dosis, cambios de medicación ni diagnósticos')
    expect(ctx).toContain('llevárselo al equipo sanitario')
  })

  it('adds the no-diagnosis warning only for the "none" type', () => {
    const none = buildContext(profile({ type: 'none' }), emptyStats, [])
    expect(none).toContain('OJO: esta persona no tiene diabetes diagnosticada')
    expect(none).toContain('sin diagnóstico de diabetes (usa la app para cuidarse)')

    const t2 = buildContext(profile({ type: 't2' }), emptyStats, [])
    expect(t2).not.toContain('OJO')
    expect(t2).toContain('diabetes tipo 2')
  })

  it('lists the med cabinet with name, optional dose and what each drug is', () => {
    const p = profile({
      meds: [
        { name: 'Metformina', dose: '850 mg', kind: 'pill' },
        { name: 'Lantus', kind: 'basal' },
        { name: 'Humalog', dose: 'según comida', kind: 'bolus' },
      ],
    })
    expect(buildContext(p, emptyStats, [])).toContain(
      'BOTIQUÍN (pauta fija): Metformina 850 mg (no insulínica); Lantus (insulina basal); Humalog según comida (insulina rápida)',
    )
  })

  it('marks weekly meds with their day in the med cabinet', () => {
    const p = profile({
      meds: [{ name: 'Ozempic', dose: '0,5 mg', kind: 'pill', weekday: 2 }],
    })
    expect(buildContext(p, emptyStats, [])).toContain('Ozempic 0,5 mg (no insulínica, semanal: martes)')
  })

  it('says so when no medication is registered', () => {
    expect(buildContext(profile({ meds: [] }), emptyStats, [])).toContain(
      'BOTIQUÍN (pauta fija): sin medicación registrada',
    )
  })

  it('includes the BMI only when both a weight entry and a height exist', () => {
    // 80 kg / 1.75 m² = 26.1
    expect(buildContext(profile({ heightCm: 175 }), emptyStats, [], [weight(80)])).toContain('IMC 26.1')
    expect(buildContext(profile(), emptyStats, [], [weight(80)])).not.toContain('IMC')
    expect(buildContext(profile({ heightCm: 175 }), emptyStats, [])).not.toContain('IMC')
  })

  describe('weight mode', () => {
    const heavy = profile({ heightCm: 170 }) // 92 kg → BMI 31.8

    it('activates on its own from BMI 27: satiety and portions, never calories, plan with the team', () => {
      const ctx = buildContext(heavy, emptyStats, [], [weight(92)])
      expect(ctx).toContain('MODO PESO')
      expect(ctx).toContain('saciedad')
      expect(ctx).toContain('NUNCA cuentes ni menciones calorías')
      expect(ctx).toContain('perder un 5-10 %')
      expect(ctx).toContain('se pacta con su equipo sanitario')
    })

    it('stays off below BMI 27 and when the BMI is unknown', () => {
      expect(buildContext(profile({ heightCm: 175 }), emptyStats, [], [weight(80)])).not.toContain('MODO PESO')
      expect(buildContext(profile(), emptyStats, [], [weight(92)])).not.toContain('MODO PESO')
      expect(buildContext(heavy, emptyStats, [])).not.toContain('MODO PESO')
    })

    it('describes the weight line with the last weigh-in and the weekly trend', () => {
      const weights: Entry[] = [
        { ts: NOW - 14 * 86_400_000, kind: 'weight', value: 93.5 },
        { ts: NOW, kind: 'weight', value: 92.5 },
      ]
      const ctx = buildContext(heavy, emptyStats, [], weights)
      expect(ctx).toContain('PESO: última pesada 92,5 kg')
      expect(ctx).toContain('kg/semana')
    })

    it('adds the agreed target weight when the profile has one', () => {
      const ctx = buildContext(profile({ heightCm: 170, targetWeightKg: 85 }), emptyStats, [], [weight(92)])
      expect(ctx).toContain('objetivo pactado con su equipo: 85 kg')
    })

    it('omits the weight line entirely without weigh-ins', () => {
      expect(buildContext(heavy, emptyStats, [])).not.toContain('PESO:')
    })
  })

  describe('age', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-08-03T12:00:00'))
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it('includes the age only when the birth year is known', () => {
      expect(buildContext(profile({ birthYear: 1980 }), emptyStats, [])).toContain('46 años')
      expect(buildContext(profile(), emptyStats, [])).not.toContain('años')
    })
  })

  it('summarises the 14-day numbers with rounded values and the hypo count', () => {
    const s = stats({
      n: 42,
      mean: 131.4,
      tir: 71.6,
      pctLow: 4.2,
      pctHigh: 24.2,
      fasting: 118.5,
      bpMean: { sys: 128.4, dia: 79.6 },
    })
    const entries: Entry[] = [
      { ts: NOW, kind: 'glucose', value: 62 },
      { ts: NOW, kind: 'glucose', value: 69 },
      { ts: NOW, kind: 'glucose', value: 70 }, // at the low bound: not a hypo
      { ts: NOW, kind: 'meal', label: 'lentejas' },
    ]
    expect(buildContext(profile(), s, entries)).toContain(
      'ÚLTIMOS 14 DÍAS: 42 mediciones · media 131 · 72% en rango · 4% bajas · 24% altas · ayunas media 119 · tensión media 128/80 · 2 hipoglucemias',
    )
  })

  it('shows a placeholder when there are no patterns yet', () => {
    expect(buildContext(profile(), emptyStats, [])).toContain('- (aún no hay patrones con datos suficientes)')
  })

  it('says so instead of quoting percentages when there are no glucose readings', () => {
    const ctx = buildContext(profile(), emptyStats, [])
    expect(ctx).toContain('ÚLTIMOS 14 DÍAS: sin glucemias registradas\n')
    expect(ctx).not.toContain('% en rango')
    expect(ctx).not.toContain('0 hipoglucemias')
  })

  it('keeps the blood-pressure mean even without glucose readings', () => {
    const ctx = buildContext(profile(), stats({ bpMean: { sys: 128.4, dia: 79.6 } }), [])
    expect(ctx).toContain('ÚLTIMOS 14 DÍAS: sin glucemias registradas · tensión media 128/80')
  })

  it('summarises automatic sleep and steps when present', () => {
    const ctx = buildContext(profile(), stats({ sleepMean: 402, stepsMean: 7432.4 }), [])
    expect(ctx).toContain('sueño medio 6,7 h')
    expect(ctx).toContain('pasos medios 7.432/día')

    const none = buildContext(profile(), emptyStats, [])
    expect(none).not.toContain('sueño medio')
    expect(none).not.toContain('pasos medios')
  })

  it('needs at least 2 short nights to show the sleep pattern', () => {
    const one = buildContext(profile(), stats({ sleepDelta: 14.2, shortSleepDays: 1 }), [])
    expect(one).not.toContain('dormir menos de 6 h')

    const two = buildContext(profile(), stats({ sleepDelta: 14.2, shortSleepDays: 3 }), [])
    expect(two).toContain('- tras dormir menos de 6 h: +14 mg/dl (3 noches)')
  })

  it('needs at least 2 exercise days to show the exercise pattern', () => {
    const one = buildContext(profile(), stats({ exerciseDelta: -12.4, exerciseDays: 1 }), [])
    expect(one).not.toContain('días con ejercicio')

    const two = buildContext(profile(), stats({ exerciseDelta: -12.4, exerciseDays: 2 }), [])
    expect(two).toContain('- días con ejercicio: -12 mg/dl (2 días)')
  })

  it('renders at most 4 tag effects with an explicit sign on positive deltas', () => {
    const tagEffects = [
      { label: 'Mal sueño', delta: 17.6, n: 3 },
      { label: 'Alcohol', delta: -9.4, n: 2 },
      { label: 'Estrés', delta: 8, n: 2 },
      { label: 'Enfermo', delta: 6, n: 2 },
      { label: 'Regla', delta: 5, n: 2 },
    ]
    const ctx = buildContext(profile(), stats({ tagEffects }), [])
    expect(ctx).toContain('- tras "Mal sueño": +18 mg/dl (3 veces)')
    expect(ctx).toContain('- tras "Alcohol": -9 mg/dl (2 veces)')
    expect(ctx).not.toContain('Regla')
  })
})

describe('reviewPrompt', () => {
  it('embeds the context and the name, and caps the length', () => {
    const prompt = reviewPrompt('CTX-MARKER', 'Javier')
    expect(prompt.startsWith('CTX-MARKER')).toBe(true)
    expect(prompt).toContain('valoración quincenal para Javier')
    expect(prompt).toContain('Máximo 180 palabras.')
  })

  it('keeps the red line: advice may cover habits, never medication', () => {
    expect(reviewPrompt('ctx', 'Javier')).toContain('jamás medicación')
  })
})

describe('chatPrompt', () => {
  it('embeds the context, the recent conversation and the name, and caps the length', () => {
    const prompt = chatPrompt('CTX-MARKER', 'Usuario: ¿qué tal voy?', 'Javier')
    expect(prompt.startsWith('CTX-MARKER')).toBe(true)
    expect(prompt).toContain('CONVERSACIÓN RECIENTE:\nUsuario: ¿qué tal voy?')
    expect(prompt).toContain('responde al último mensaje de Javier')
    expect(prompt).toContain('máximo 120 palabras')
  })

  it('redirects medical or dose questions to the healthcare team', () => {
    expect(chatPrompt('ctx', '', 'Javier')).toContain(
      'Si la pregunta pide consejo médico o de dosis, recuérdale con cariño que eso es de su equipo sanitario.',
    )
  })
})

describe('suggestMealPrompt', () => {
  const info = {
    moment: 'la comida',
    time: '14:05',
    lastReading: '134 mg/dl hace 25 min',
    usual: ['lentejas con verduras', 'tortilla francesa'],
    others: ['pisto', 'merluza a la plancha'],
  }

  it('states the moment, the time and the last reading', () => {
    const prompt = suggestMealPrompt('CTX-MARKER', info)
    expect(prompt.startsWith('CTX-MARKER')).toBe(true)
    expect(prompt).toContain('MOMENTO: son las 14:05, toca la comida.')
    expect(prompt).toContain('ÚLTIMA GLUCEMIA: 134 mg/dl hace 25 min')
    expect(prompt).toContain('propón 2 o 3 ideas para la comida')
  })

  it('renders the usual and other dishes from the diary', () => {
    const prompt = suggestMealPrompt('ctx', info)
    expect(prompt).toContain('lentejas con verduras · tortilla francesa')
    expect(prompt).toContain('OTROS PLATOS DE SU DIARIO: pisto · merluza a la plancha')
  })

  it('falls back to placeholders when the diary is empty', () => {
    const prompt = suggestMealPrompt('ctx', { ...info, usual: [], others: [] })
    expect(prompt).toContain('(todavía ninguno)')
    expect(prompt).toContain('OTROS PLATOS DE SU DIARIO: (ninguno)')
  })

  it('asks for the JSON contract with English keys', () => {
    const prompt = suggestMealPrompt('ctx', info)
    expect(prompt).toContain('SOLO JSON válido')
    expect(prompt).toContain('{"options":[{"dish":"nombre corto","carbs_g":número entero,"why":')
    expect(prompt).toContain('"avoid":')
    expect(prompt).toContain('"note":')
  })

  it('keeps the red line: never talk about medication or doses', () => {
    expect(suggestMealPrompt('ctx', info)).toContain('Nunca hables de medicación ni dosis.')
  })
})

describe('mealPrompt', () => {
  const reading = { lastReading: '134 mg/dl hace 25 min', hypo: false }

  it('describes a diagnosed user by type and treatment', () => {
    const p = profile({ type: 't1', basal: true, bolus: true })
    expect(mealPrompt(p, false, '', reading)).toContain(
      'Eres el nutricionista de bolsillo de una persona con diabetes tipo 1 (tratamiento: insulina basal + insulina en comidas (bolo)).',
    )
  })

  it('describes a "none" user without assuming a diagnosis', () => {
    expect(mealPrompt(profile({ type: 'none' }), false, '', reading)).toContain(
      'una persona sin diabetes que vigila su glucosa para cuidarse',
    )
  })

  it('mentions the photo and the user description only when present', () => {
    const p = profile()
    expect(mealPrompt(p, true, 'lentejas con chorizo', reading)).toContain(
      'Analiza esta comida de la foto (el usuario dice: "lentejas con chorizo").',
    )
    expect(mealPrompt(p, false, '', reading)).toContain('Analiza esta comida.')
  })

  it('carries the target range and the last reading in the CONTEXTO line', () => {
    expect(mealPrompt(profile(), false, '', reading)).toContain(
      'CONTEXTO: rango objetivo 70–180 mg/dl · última glucemia: 134 mg/dl hace 25 min',
    )
  })

  it('adds the salt clause only for hypertensive users', () => {
    const hyper = mealPrompt(profile({ hypertension: true }), false, '', reading)
    expect(hyper).toContain('tiene además hipertensión')
    expect(hyper).toContain('Tiene hipertensión: si el plato lleva bastante sal')

    const normo = mealPrompt(profile(), false, '', reading)
    expect(normo).not.toContain('hipertensión')
    expect(normo).not.toContain('bastante sal')
  })

  it('injects the hypo safeguard block only when the last reading is a recent hypo', () => {
    const hypo = mealPrompt(profile(), false, '', { ...reading, hypo: true })
    expect(hypo).toContain('ATENCIÓN — su última glucemia está POR DEBAJO de su rango y es reciente')
    expect(hypo).toContain('deja "better_avoid" vacío')

    expect(mealPrompt(profile(), false, '', reading)).not.toContain('ATENCIÓN')
  })

  it('asks for the JSON contract with English keys', () => {
    const prompt = mealPrompt(profile(), false, '', reading)
    for (const key of [
      '"dish"',
      '"carbs_g"',
      '"fiber_g"',
      '"calories_kcal"',
      '"processing"',
      '"glycemic_index"',
      '"traffic_light"',
      '"advice"',
      '"better_avoid"',
    ]) {
      expect(prompt).toContain(key)
    }
    expect(prompt).toContain('SOLO un JSON válido')
  })

  it('grades the traffic light by glucose impact, never by calories', () => {
    expect(mealPrompt(profile(), false, '', reading)).toContain('NUNCA las calorías')
  })

  it('specifies the exact fallback JSON for non-food images', () => {
    expect(mealPrompt(profile(), false, '', reading)).toContain(
      'Si la imagen no parece comida, devuelve {"dish": "no es comida", "carbs_g": 0, "fiber_g": 0, "calories_kcal": 0, "processing": "homemade", "glycemic_index": "low", "traffic_light": "green", "advice": "No he reconocido comida ahí.", "better_avoid": []}',
    )
  })

  it('keeps the red lines: no med cabinet in front of the model, no medication talk', () => {
    const p = profile({ meds: [{ name: 'Metformina', dose: '850 mg', kind: 'pill' }] })
    const prompt = mealPrompt(p, false, '', reading)
    expect(prompt).not.toContain('Metformina')
    expect(prompt).toContain('Nunca hables de medicación ni dosis, tampoco si su glucemia está fuera de rango.')
  })
})

describe('medsPhotoPrompt', () => {
  const prompt = medsPhotoPrompt()

  it('asks for a transcription, not for an opinion', () => {
    expect(prompt).toMatch(/COPIAR lo que ponga/)
    expect(prompt).toMatch(/no propongas ni corrijas dosis/i)
    expect(prompt).toMatch(/no digas si la pauta es adecuada/i)
  })

  it('forbids filling in what cannot be read', () => {
    expect(prompt).toMatch(/no añadas medicación que no aparezca/i)
    expect(prompt).toMatch(/déjalo vacío/i)
    expect(prompt).toMatch(/dato inventado/i)
  })

  it('asks for the exact JSON keys the parser expects', () => {
    expect(prompt).toContain('{"meds":[{"name"')
    expect(prompt).toContain('"kind"')
    expect(prompt).toContain('"weekday"')
    expect(prompt).toMatch(/SOLO JSON válido, sin markdown/)
  })

  it('explains which insulin is which, with the names people actually carry', () => {
    expect(prompt).toMatch(/basal.*Lantus/)
    expect(prompt).toMatch(/bolus.*Humalog/)
    expect(prompt).toMatch(/Ozempic/)
  })

  it('does not let it guess the weekly day', () => {
    expect(prompt).toMatch(/SOLO si en la imagen se lee el día concreto/)
    expect(prompt).toMatch(/No lo deduzcas/)
  })

  it('has an answer for a photo with no medication in it', () => {
    expect(prompt).toContain('{"meds":[]}')
  })
})
