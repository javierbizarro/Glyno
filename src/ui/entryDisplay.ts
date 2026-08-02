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
