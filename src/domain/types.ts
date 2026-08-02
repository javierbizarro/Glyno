export type DiabetesType = 't1' | 't2' | 'pre' | 'gest'
export type Measurement = 'sensor' | 'meter'

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
