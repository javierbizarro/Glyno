import type { Profile } from '../domain/types'
import type { AiImage } from '../ports/ai'
import { ai, entries } from './container'
import { mealPrompt } from './prompts'

export interface MealAnalysis {
  plato: string
  hidratos_g: number
  indice_glucemico: 'bajo' | 'medio' | 'alto'
  semaforo: 'verde' | 'ambar' | 'rojo'
  consejo: string
  mejor_evitar: string[]
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

export async function saveMeal(analysis: MealAnalysis): Promise<void> {
  await entries.add({
    ts: Date.now(),
    kind: 'meal',
    label: analysis.plato,
    carbs: analysis.hidratos_g || undefined,
    note: 'analizada por Glyno',
  })
}
