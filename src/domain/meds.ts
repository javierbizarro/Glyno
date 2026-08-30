import type { Med } from './types'

// Reading the med cabinet off a photo of the boxes (or the prescription). The AI only
// TRANSCRIBES: it never proposes, corrects or completes a dose — that is the doctor's job and
// our red line. Everything here is about pairing what was read with what is already saved,
// so the user confirms instead of trusting a photo.

/** names compare without case, accents, symbols or spare spaces: "Ozempic®" is "ozempic" */
const key = (name: string): string =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

export const sameMedName = (a: string, b: string): boolean => {
  const [ka, kb] = [key(a), key(b)]
  return !!ka && ka === kb
}

const KIND: Record<string, Med['kind']> = {
  pill: 'pill', pastilla: 'pill', pastillas: 'pill', oral: 'pill', comprimido: 'pill', otra: 'pill',
  basal: 'basal', 'insulina basal': 'basal', lenta: 'basal', 'insulina lenta': 'basal',
  bolus: 'bolus', bolo: 'bolus', rapida: 'bolus', 'insulina rapida': 'bolus',
}

const text = (x: unknown): string => (typeof x === 'string' ? x.trim() : '')

/** what the model answered, turned into meds we can show; anything unreadable is dropped */
export function normalizeFoundMeds(raw: unknown): Med[] {
  const list = (raw as { meds?: unknown })?.meds
  if (!Array.isArray(list)) return []
  return list
    .map((item): Med | null => {
      const m = (item ?? {}) as Record<string, unknown>
      const name = text(m.name)
      if (!name) return null
      const weekday = m.weekday
      return {
        name,
        // the dose is copied exactly as printed: no arithmetic, no unit conversion, no guessing
        dose: text(m.dose) || undefined,
        // an unknown type lands on "otra medicación", the one that changes nothing in the UI
        kind: KIND[key(text(m.kind))] ?? 'pill',
        weekday: typeof weekday === 'number' && Number.isInteger(weekday) && weekday >= 0 && weekday <= 6 ? weekday : undefined,
      }
    })
    .filter((m): m is Med => m != null)
}

export interface MedMatch {
  /** the medication as the photo read it */
  med: Med
  status: 'new' | 'same' | 'changed'
  /** where it pairs in the cabinet, when it does */
  at?: number
  /** what is saved today, so the user can compare before replacing it */
  mine?: Med
}

const sameDose = (a?: string, b?: string) => (a ?? '').trim().toLowerCase() === (b ?? '').trim().toLowerCase()

/**
 * Pairs what was read with the cabinet. It never proposes removing anything: a photo of two
 * boxes says nothing about the other four medications, and losing one the doctor prescribed
 * would be far worse than a duplicate line the user can uncheck.
 */
export function mergeMeds(existing: Med[], found: Med[]): MedMatch[] {
  const taken = new Set<number>()
  return found.map(med => {
    const at = existing.findIndex((e, i) => !taken.has(i) && sameMedName(e.name, med.name))
    if (at < 0) return { med, status: 'new' as const }
    taken.add(at)
    const mine = existing[at]
    return { med, status: sameDose(mine.dose, med.dose) ? ('same' as const) : ('changed' as const), at, mine }
  })
}
