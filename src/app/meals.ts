import type { Entry, Profile } from '../domain/types'
import { computeStats } from '../domain/stats'
import { lastGlucoseText, needsHypoCare } from '../domain/glucose'
import {
  mealMoment,
  MEAL_MOMENT_LABEL,
  normalizeAnalysis,
  normalizeSuggestion,
  usualMeals,
  type MealAnalysis,
  type MealSuggestion,
} from '../domain/meals'
import { parseJsonReply, ReplyFormatError } from '../domain/jsonReply'
import type { AiImage } from '../ports/ai'
import { ai, entries } from './container'
import { buildContext, mealPrompt, suggestMealPrompt } from './prompts'

export type { MealAnalysis, MealSuggestion } from '../domain/meals'

/**
 * Asks and reads the answer. A garbled answer earns one second attempt — small models
 * fail at the format, not at the task — but a network or quota error does not: it would
 * only burn another call and make the user wait twice.
 */
async function askJson<T>(ask: () => Promise<string>, shape: (raw: unknown) => T): Promise<T> {
  try {
    return shape(parseJsonReply(await ask()))
  } catch (e) {
    if (!(e instanceof ReplyFormatError)) throw e
    return shape(parseJsonReply(await ask()))
  }
}

export async function analyzeMeal(
  p: Profile,
  input: { image?: AiImage; desc?: string },
  lastGlucose?: Entry,
): Promise<MealAnalysis> {
  const prompt = mealPrompt(p, !!input.image, input.desc?.trim() ?? '', {
    lastReading: lastGlucoseText(lastGlucose),
    hypo: needsHypoCare(p, lastGlucose),
  })
  return askJson(
    () => (input.image ? ai.completeWithImage(prompt, input.image) : ai.complete(prompt)),
    normalizeAnalysis,
  )
}

export async function logMeal(label: string, carbs?: number, note?: string): Promise<void> {
  await entries.add({ ts: Date.now(), kind: 'meal', label, carbs: carbs || undefined, note })
}

export async function saveMeal(analysis: MealAnalysis): Promise<void> {
  await logMeal(analysis.dish, analysis.carbs_g, 'analizada por Glyno')
}

export async function suggestMeal(
  p: Profile,
  recent: Entry[],
  lastGlucose?: Entry,
  weights: Entry[] = [],
): Promise<MealSuggestion> {
  const bucket = mealMoment(Date.now())
  const moment = MEAL_MOMENT_LABEL[bucket]
  const fmt = (m: { label: string; times: number; carbs: number | null }) =>
    `${m.label}${m.carbs ? ` (~${m.carbs} g HC)` : ''}${m.times > 1 ? ` ×${m.times}` : ''}`

  const usualForMoment = usualMeals(recent, bucket)
  const usual = usualForMoment.map(fmt)
  const usualLabels = new Set(usualForMoment.map(m => m.label.toLowerCase()))
  const others = usualMeals(recent)
    .filter(m => !usualLabels.has(m.label.toLowerCase()))
    .map(fmt)

  const lastReading = lastGlucoseText(lastGlucose)
  const ctx = buildContext(p, computeStats(recent, p), recent, weights)
  const time = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  return askJson(
    () => ai.complete(suggestMealPrompt(ctx, { moment, time, lastReading, usual, others })),
    normalizeSuggestion,
  )
}
