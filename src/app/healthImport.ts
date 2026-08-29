import type { Entry } from '../domain/types'
import { entries } from './container'

// STAGED PLUMBING — no UI feeds this module today. The iOS Shortcut route was retired
// (2026-08-29) in favour of the upcoming native HealthKit sync, which will reuse this
// tested pipeline: sample validation, extId dedupe, daily-refresh semantics and the
// Spanish import summary. The text/JSON contracts stay as documentation of the format.
//
// Contract of the payload any bridge builds. JSON keys are English (they are code);
// sample kinds match EntryKind. Daily kinds carry a `date` (YYYY-MM-DD); point kinds
// carry a `ts` (ISO local).
interface RawSample {
  kind?: string
  ts?: string
  date?: string
  value?: number
  minutes?: number
  label?: string
  km?: number
}

export interface HealthImportResult {
  added: number
  updated: number
  ignored: number
  invalid: number
}

const BAD_PAYLOAD = 'No he reconocido ahí datos de Salud para Glyno.'

// representative local times for daily aggregates: the exact hour is meaningless,
// these just place the row sensibly in the diary
const DAILY_HOUR: Record<string, string> = {
  steps: 'T12:00:00',
  sleep: 'T07:30:00', // the night is filed on the morning it ended
  weight: 'T08:00:00',
  activity: 'T19:00:00',
  cycling: 'T19:30:00',
}

const isDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)
const round1 = (x: number) => Math.round(x * 10) / 10

/** null when the sample is malformed or out of any plausible range */
function toEntry(s: RawSample): Entry | null {
  if (s.kind === 'glucose') {
    const ts = new Date(s.ts ?? '').getTime()
    if (!Number.isFinite(ts) || s.value == null || s.value < 20 || s.value > 600) return null
    return { ts, kind: 'glucose', value: s.value, source: 'health', extId: `health:glucose:${ts}` }
  }
  if (s.kind === 'exercise') {
    const ts = new Date(s.ts ?? '').getTime()
    if (!Number.isFinite(ts) || s.minutes == null || s.minutes < 1 || s.minutes > 600) return null
    return {
      ts,
      kind: 'exercise',
      value: Math.round(s.minutes),
      label: s.label?.trim() || 'Ejercicio',
      ...(s.km != null && s.km > 0 ? { distanceKm: round1(s.km) } : {}),
      source: 'health',
      extId: `health:exercise:${ts}`,
    }
  }
  if (s.kind === 'steps' || s.kind === 'sleep' || s.kind === 'weight' || s.kind === 'activity' || s.kind === 'cycling') {
    if (!isDate(s.date)) return null
    const value = s.kind === 'sleep' || s.kind === 'activity' ? s.minutes : s.value
    const RANGE: Record<string, [number, number]> = {
      steps: [1, 100_000],
      sleep: [30, 960],
      weight: [30, 300],
      activity: [1, 600],
      cycling: [0.3, 300],
    }
    const [lo, hi] = RANGE[s.kind]
    if (value == null || value < lo || value > hi) return null
    return {
      ts: new Date(s.date + DAILY_HOUR[s.kind]).getTime(),
      kind: s.kind,
      value: s.kind === 'weight' || s.kind === 'cycling' ? round1(value) : Math.round(value),
      source: 'health',
      extId: `health:${s.kind}:${s.date}`,
    }
  }
  return null
}

/** daily aggregates may be re-imported with fresher values; point samples never change */
const isDaily = (e: Entry) =>
  e.kind === 'steps' || e.kind === 'sleep' || e.kind === 'weight' || e.kind === 'activity' || e.kind === 'cycling'

const localDate = (now: number): string => {
  const d = new Date(now)
  const p = (x: number) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const TIME = /^\d{1,2}:\d{2}$/
const num = (s: string) => Number(s.replace(',', '.'))

/** one line of the plain-text format → a raw sample; null when the line makes no sense */
function parseLine(line: string, today: string): RawSample | null {
  const tokens = line.trim().split(/\s+/)
  const keyword = tokens.shift()?.toLowerCase().replace('ñ', 'n')
  const date = isDate(tokens[0]) ? tokens.shift()! : today

  if (keyword === 'pasos' && /^[\d.]+$/.test(tokens[0] ?? ''))
    return { kind: 'steps', date, value: Number(tokens[0].replace(/\./g, '')) }

  if (keyword === 'sueno' && tokens.length) {
    // tolerate how Shortcuts prints durations: '6h35', '7h', '395min', '6 h 52 min', '412 min'
    const rest = tokens.join(' ')
    const hm = rest.match(/^(\d{1,2})\s*h(?:\s*(\d{1,2}))?\s*(?:min)?$/)
    const mins = rest.match(/^([\d.]+)\s*min$/)
    if (hm) return { kind: 'sleep', date, minutes: Number(hm[1]) * 60 + Number(hm[2] ?? 0) }
    if (mins) {
      let minutes = Number(mins[1].replace(/\./g, ''))
      // HealthKit durations often arrive as raw seconds; no night has 960+ minutes
      if (minutes > 960) minutes = Math.round(minutes / 60)
      return { kind: 'sleep', date, minutes }
    }
    return null
  }

  if (keyword === 'peso' && /^\d+([.,]\d+)?$/.test(tokens[0] ?? ''))
    return { kind: 'weight', date, value: num(tokens[0]) }

  if (keyword === 'actividad' && tokens.length) {
    // same duration tolerance as sleep: '45 min', '45min', '1 h 5 min', raw seconds
    const rest = tokens.join(' ')
    const hm = rest.match(/^(\d{1,2})\s*h(?:\s*(\d{1,2}))?\s*(?:min)?$/)
    const mins = rest.match(/^([\d.]+)\s*min$/)
    if (hm) return { kind: 'activity', date, minutes: Number(hm[1]) * 60 + Number(hm[2] ?? 0) }
    if (mins) {
      let minutes = Number(mins[1].replace(/\./g, ''))
      if (minutes > 600) minutes = Math.round(minutes / 60)
      return { kind: 'activity', date, minutes }
    }
    return null
  }

  if (keyword === 'bici' && /^\d+([.,]\d+)?$/.test(tokens[0] ?? ''))
    return { kind: 'cycling', date, value: num(tokens[0]) }

  if (keyword === 'glucosa' && TIME.test(tokens[0] ?? '') && /^\d+$/.test(tokens[1] ?? ''))
    return { kind: 'glucose', ts: `${date}T${tokens[0].padStart(5, '0')}:00`, value: Number(tokens[1]) }

  if (keyword === 'ejercicio' && TIME.test(tokens[0] ?? '')) {
    const time = tokens.shift()!
    let rest = tokens.join(' ')

    const kmMatch = rest.match(/(\d+(?:[.,]\d+)?)\s*km\b/)
    if (kmMatch) rest = rest.replace(kmMatch[0], ' ')

    // duration in any of Shortcuts' habits: '40min', '42 min', '1 h 10 min', '0:42:15', '2.520 s'
    let minutes: number | null = null
    const grab = (re: RegExp, toMin: (m: RegExpMatchArray) => number) => {
      const m = rest.match(re)
      if (m && minutes == null) {
        minutes = Math.round(toMin(m))
        rest = rest.replace(m[0], ' ')
      }
    }
    grab(/(\d+):(\d{2}):(\d{2})/, m => Number(m[1]) * 60 + Number(m[2]) + Number(m[3]) / 60)
    grab(/(\d+)\s*h(?:\s*(\d+)\s*min)?/, m => Number(m[1]) * 60 + Number(m[2] ?? 0))
    grab(/(\d+)\s*min\b/, m => Number(m[1]))
    grab(/([\d.]+)\s*s\b/, m => Number(m[1].replace(/\./g, '')) / 60)
    if (minutes == null) return null

    return {
      kind: 'exercise',
      ts: `${date}T${time.padStart(5, '0')}:00`,
      minutes,
      label: rest.replace(/\s+/g, ' ').trim() || undefined,
      ...(kmMatch ? { km: num(kmMatch[1]) } : {}),
    }
  }

  return null
}

/**
 * Accepts either the JSON contract or the plain-text format ("glyno salud" header +
 * one sample per line). The text form exists so an iOS Shortcut needs zero JSON
 * assembly — and so a human can type it in a note.
 */
export async function importHealthPayload(text: string, now = Date.now()): Promise<HealthImportResult> {
  const result: HealthImportResult = { added: 0, updated: 0, ignored: 0, invalid: 0 }
  const candidates: Entry[] = []

  const push = (raw: RawSample | null) => {
    const e = raw && toEntry(raw)
    if (e) candidates.push(e)
    else result.invalid++
  }

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  if (text.trim().startsWith('{')) {
    let data: { app?: string; type?: string; samples?: RawSample[] }
    try {
      data = JSON.parse(text)
    } catch {
      throw new Error(BAD_PAYLOAD)
    }
    if (data?.app !== 'glyno' || data.type !== 'health' || !Array.isArray(data.samples))
      throw new Error(BAD_PAYLOAD)
    data.samples.forEach(push)
  } else if (/^glyno salud$/i.test(lines[0] ?? '')) {
    const today = localDate(now)
    lines.slice(1).forEach(line => push(parseLine(line, today)))
  } else {
    throw new Error(BAD_PAYLOAD)
  }
  if (!candidates.length) return result

  const existing = new Map(
    (await entries.byExtIds(candidates.map(e => e.extId!))).map(e => [e.extId!, e]),
  )
  const fresh: Entry[] = []
  const seenInBatch = new Set<string>()

  for (const e of candidates) {
    if (seenInBatch.has(e.extId!)) {
      result.ignored++
      continue
    }
    seenInBatch.add(e.extId!)
    const prev = existing.get(e.extId!)
    if (!prev) {
      fresh.push(e)
      result.added++
    } else if (isDaily(e) && prev.value !== e.value) {
      await entries.update(prev.id!, { value: e.value })
      result.updated++
    } else {
      result.ignored++
    }
  }

  if (fresh.length) await entries.bulkAdd(fresh)
  return result
}

/** UI copy (Spanish) for the little confirmation the user sees after importing */
export function healthImportSummary(r: HealthImportResult): string {
  if (r.added || r.updated) {
    const parts = [
      r.added ? `${r.added} ${r.added === 1 ? 'registro nuevo' : 'registros nuevos'}` : null,
      r.updated ? `${r.updated} al día` : null,
    ].filter(Boolean)
    return `De Salud: ${parts.join(' y ')}.`
  }
  if (r.invalid && !r.ignored)
    return `No he podido entender esas muestras (${r.invalid} descartada${r.invalid === 1 ? '' : 's'}).`
  return 'Nada nuevo: esos datos ya estaban en tu diario.'
}
