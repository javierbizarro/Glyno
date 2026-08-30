import type { HealthSource } from '../ports/health'
import { importHealthSamples, type HealthImportResult } from './healthImport'

// Pulling Salud into the diary. The heavy lifting (validation, dedupe, daily refresh) is
// healthImport's; this only decides WHICH window to ask for and remembers where it got to.

const LAST_SYNC = 'glyno.health.lastSync'
/** the first sync brings the history, not just today */
export const BACKFILL_DAYS = 365
/** every later sync re-reads a few days: sensors and scales dump into Salud with delay */
export const OVERLAP_DAYS = 3

const DAY = 86_400_000

export function syncWindow(lastSync: number | null, now: number): { from: number; to: number } {
  const from = lastSync ? lastSync - OVERLAP_DAYS * DAY : now - BACKFILL_DAYS * DAY
  return { from: Math.min(from, now), to: now }
}

/** null when the device has no health store at all; otherwise what the import did */
export async function syncHealth(source: HealthSource, now = Date.now()): Promise<HealthImportResult | null> {
  if (!(await source.available())) return null

  const { from, to } = syncWindow(lastSync(), now)
  const samples = await source.read(from, to)
  const result = await importHealthSamples(samples)
  // Only once something has actually come through. A read that fails, or that the user has
  // not granted yet, is indistinguishable from an empty store — and marking the window then
  // would quietly drop the history the first real sync is supposed to bring.
  if (samples.length) mark(to)
  return result
}

export function lastSync(): number | null {
  try {
    const raw = Number(localStorage.getItem(LAST_SYNC))
    return Number.isFinite(raw) && raw > 0 ? raw : null
  } catch {
    return null
  }
}

function mark(at: number): void {
  try {
    localStorage.setItem(LAST_SYNC, String(at))
  } catch {
    /* a full or blocked storage only costs us the incremental window */
  }
}
