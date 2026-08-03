import type { Entry, Profile } from '../domain/types'
import { computeStats } from '../domain/stats'
import { mealMoment, usualMeals } from '../domain/meals'
import type { AiImage } from '../ports/ai'
import { ai, entries } from './container'
import { buildContext, mealPrompt, suggestMealPrompt } from './prompts'

export interface MealAnalysis {
  plato: string
  hidratos_g: number
  indice_glucemico: 'bajo' | 'medio' | 'alto'
  semaforo: 'verde' | 'ambar' | 'rojo'
  consejo: string
  mejor_evitar: string[]
  // orientativos y secundarios: el semáforo NO se decide por las calorías
  fibra_g?: number
  calorias_kcal?: number
  procesado?: 'casero' | 'procesado' | 'ultraprocesado'
}

function extractJson<T>(s: string): T {
  const m = s.match(/\{[\s\S]*\}/)
  if (!m) throw new Error('La respuesta no contiene JSON.')
  return JSON.parse(m[0]) as T
}

export async function analyzeMeal(p: Profile, input: { image?: AiImage; desc?: string }): Promise<MealAnalysis> {
  const prompt = mealPrompt(p, !!input.image, input.desc?.trim() ?? '')
  const raw = input.image ? await ai.completeWithImage(prompt, input.image) : await ai.complete(prompt)
  return extractJson<MealAnalysis>(raw)
}

export async function logMeal(label: string, carbs?: number, note?: string): Promise<void> {
  await entries.add({ ts: Date.now(), kind: 'meal', label, carbs: carbs || undefined, note })
}

export async function saveMeal(analysis: MealAnalysis): Promise<void> {
  await logMeal(analysis.plato, analysis.hidratos_g, 'analizada por Glyno')
}

export interface MealSuggestion {
  opciones: { plato: string; hidratos_g: number; por_que: string }[]
  evitar: string[]
  nota: string
}

export async function suggestMeal(
  p: Profile,
  recent: Entry[],
  lastGlucose?: Entry,
): Promise<MealSuggestion> {
  const moment = mealMoment(Date.now())
  const fmt = (m: { label: string; times: number; carbs: number | null }) =>
    `${m.label}${m.carbs ? ` (~${m.carbs} g HC)` : ''}${m.times > 1 ? ` ×${m.times}` : ''}`

  const habituales = usualMeals(recent, moment).map(fmt)
  const otros = usualMeals(recent)
    .filter(m => !habituales.some(h => h.startsWith(m.label)))
    .map(fmt)

  const ultima = lastGlucose?.value
    ? `${lastGlucose.value} mg/dl hace ${Math.round((Date.now() - lastGlucose.ts) / 60000)} min` +
      (lastGlucose.note ? ` (${lastGlucose.note})` : '')
    : 'sin medición reciente'

  const ctx = buildContext(p, computeStats(recent, p), recent)
  const hora = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  const raw = await ai.complete(suggestMealPrompt(ctx, { moment, hora, ultima, habituales, otros }))
  return extractJson<MealSuggestion>(raw)
}
