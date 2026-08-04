import type { Entry } from '../domain/types'
import { thousands } from '../domain/number'

export const KIND_ICO: Record<string, string> = {
  glucose: '🩸',
  bp: '🫀',
  insulin: '💉',
  med: '💊',
  meal: '🍽️',
  exercise: '👟',
  tag: '🏷️',
  weight: '⚖️',
  steps: '👣',
  sleep: '🌙',
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
  const base = (() => {
    switch (e.kind) {
      case 'glucose': return `${e.value} mg/dl${e.note ? ` · ${e.note}` : ''}`
      case 'bp': return `${e.sys}/${e.dia} mmHg`
      case 'insulin': return `${e.value} U ${e.label ?? ''}`
      case 'med': return e.label ?? 'Medicación'
      case 'meal': return `${e.label}${e.carbs ? ` · ${e.carbs} g HC` : ''}`
      case 'exercise':
        return `${e.label ?? 'Ejercicio'} · ${e.value} min${e.distanceKm ? ` · ${String(e.distanceKm).replace('.', ',')} km` : ''}`
      case 'tag': return e.label ?? ''
      case 'weight': return `${e.value} kg`
      case 'steps': return `${thousands(e.value ?? 0)} pasos`
      case 'sleep': return `Sueño · ${Math.floor((e.value ?? 0) / 60)} h ${(e.value ?? 0) % 60} min`
      default: return ''
    }
  })()
  // automatic entries say where they came from, so the diary stays trustworthy
  return e.source === 'health' ? `${base} · Salud` : base
}
