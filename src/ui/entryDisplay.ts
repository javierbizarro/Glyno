import type { Entry } from '../domain/types'

export const KIND_ICO: Record<string, string> = {
  glucose: '🩸',
  bp: '🫀',
  insulin: '💉',
  med: '💊',
  meal: '🍽️',
  exercise: '👟',
  tag: '🏷️',
  weight: '⚖️',
}

/** short headers for the report tables, where "después de desayunar" doesn't fit */
export const MOMENT_SHORT: Record<string, string> = {
  ayunas: 'Ayunas',
  'después de desayunar': 'Post desayuno',
  'antes de comer': 'Pre comida',
  'después de comer': 'Post comida',
  'antes de cenar': 'Pre cena',
  'después de cenar': 'Post cena',
  'antes de dormir': 'Al dormir',
}

export function entryText(e: Entry): string {
  switch (e.kind) {
    case 'glucose': return `${e.value} mg/dl${e.note ? ` · ${e.note}` : ''}`
    case 'bp': return `${e.sys}/${e.dia} mmHg`
    case 'insulin': return `${e.value} U ${e.label ?? ''}`
    case 'med': return e.label ?? 'Medicación'
    case 'meal': return `${e.label}${e.carbs ? ` · ${e.carbs} g HC` : ''}`
    case 'exercise': return `${e.label ?? 'Ejercicio'} · ${e.value} min`
    case 'tag': return e.label ?? ''
    case 'weight': return `${e.value} kg`
    default: return ''
  }
}
