import type { Entry } from '../domain/types'
import { entries } from './container'

// Contract of the payload the iOS Shortcut (or any future bridge) builds.
// JSON keys are English (they are code); sample kinds match EntryKind.
// Daily kinds carry a `date` (YYYY-MM-DD); point kinds carry a `ts` (ISO local).
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
  if (s.kind === 'steps' || s.kind === 'sleep' || s.kind === 'weight') {
    if (!isDate(s.date)) return null
    const value = s.kind === 'sleep' ? s.minutes : s.value
    const ok =
      s.kind === 'steps'
        ? value != null && value >= 1 && value <= 100_000
        : s.kind === 'sleep'
          ? value != null && value >= 30 && value <= 960
          : value != null && value >= 30 && value <= 300
    if (!ok) return null
    return {
      ts: new Date(s.date + DAILY_HOUR[s.kind]).getTime(),
      kind: s.kind,
      value: s.kind === 'weight' ? round1(value!) : Math.round(value!),
      source: 'health',
      extId: `health:${s.kind}:${s.date}`,
    }
  }
  return null
}

/** daily aggregates may be re-imported with fresher values; point samples never change */
const isDaily = (e: Entry) => e.kind === 'steps' || e.kind === 'sleep' || e.kind === 'weight'

export async function importHealthPayload(text: string): Promise<HealthImportResult> {
  let data: { app?: string; type?: string; samples?: RawSample[] }
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(BAD_PAYLOAD)
  }
  if (data?.app !== 'glyno' || data.type !== 'health' || !Array.isArray(data.samples))
    throw new Error(BAD_PAYLOAD)

  const result: HealthImportResult = { added: 0, updated: 0, ignored: 0, invalid: 0 }
  const candidates: Entry[] = []
  for (const raw of data.samples) {
    const e = toEntry(raw)
    if (e) candidates.push(e)
    else result.invalid++
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
