export type DiabetesType = 't1' | 't2' | 'pre' | 'gest' | 'none'
export type Measurement = 'sensor' | 'meter' | 'none'

export interface Med {
  name: string
  dose?: string
  kind: 'pill' | 'basal' | 'bolus'
}

export interface Profile {
  name: string
  type: DiabetesType
  measurement: Measurement
  basal: boolean
  bolus: boolean
  pills: boolean
  meds: Med[]
  hypertension: boolean
  low: number   // mg/dl
  high: number  // mg/dl
  birthYear?: number
  heightCm?: number
  geminiKey: string
  onboarded: boolean
}

export const defaultProfile: Profile = {
  name: '',
  type: 't2',
  measurement: 'meter',
  basal: false,
  bolus: false,
  pills: false,
  meds: [],
  hypertension: false,
  low: 70,
  high: 180,
  geminiKey: '',
  onboarded: false,
}

export const TYPE_LABEL: Record<DiabetesType, string> = {
  t1: 'Tipo 1',
  t2: 'Tipo 2',
  pre: 'Prediabetes',
  gest: 'Gestacional',
  none: 'Control general',
}

// etiqueta completa para menús y encabezados: "Tipo 2" solo se entiende junto a "Diabetes"
export const TYPE_FULL: Record<DiabetesType, string> = {
  t1: 'Diabetes tipo 1',
  t2: 'Diabetes tipo 2',
  pre: 'Prediabetes',
  gest: 'Diabetes gestacional',
  none: 'Sin diagnóstico',
}

// rangos objetivo por defecto en mg/dl: sin diagnóstico de diabetes se usa
// la referencia de una persona sana, más estrecha que la de un diabético
export const DEFAULT_TARGETS: Record<DiabetesType, { low: number; high: number }> = {
  t1: { low: 70, high: 180 },
  t2: { low: 70, high: 180 },
  pre: { low: 70, high: 140 },
  gest: { low: 70, high: 180 },
  none: { low: 70, high: 140 },
}

export type EntryKind = 'glucose' | 'bp' | 'meal' | 'insulin' | 'med' | 'exercise' | 'tag' | 'weight'

export interface Entry {
  id?: number
  ts: number
  kind: EntryKind
  value?: number   // glucosa mg/dl · insulina U · ejercicio min
  sys?: number
  dia?: number
  label?: string
  carbs?: number   // gramos
  note?: string
}

export const MOMENTS = ['ayunas', 'antes de comer', 'después de comer', 'antes de dormir'] as const

export const PRESET_TAGS = ['Mal sueño', 'Estrés', 'Alcohol', 'Enfermo', 'Comida fuera', 'Regla', 'Olvido medicación']

export function treatmentSummary(p: Profile): string {
  const parts: string[] = []
  if (p.basal) parts.push('insulina basal')
  if (p.bolus) parts.push('insulina en comidas (bolo)')
  if (p.pills) parts.push('medicación oral')
  return parts.length ? parts.join(' + ') : 'dieta y ejercicio'
}
