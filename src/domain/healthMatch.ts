import type { Entry, EntryKind } from './types'

/**
 * Telling apart "the same reading, twice" from "two readings".
 *
 * Salud's own samples never collide with each other — they carry HealthKit's id. The collision
 * that matters is with what the user wrote down: you prick your finger, type 137 into Glyno,
 * and half an hour later the meter dumps that very reading into Salud. Two rows, one reading.
 * When that happens the hand-written row wins, because it is the one carrying the moment
 * ("ayunas") and the context tags; the Salud sample only lends it its id.
 *
 * Every rule here errs towards leaving things alone: a false match hides a real reading, which
 * is far worse than a duplicate the user can delete.
 */

const MIN = 60_000

/** kinds a person can also write by hand; steps and sleep are nobody's manual work */
export const CLAIMABLE: EntryKind[] = ['glucose', 'bp', 'weight', 'exercise']

/** the same instant, give or take the time it takes a device to sync */
const near = (a: Entry, b: Entry, minutes: number) => Math.abs(a.ts - b.ts) <= minutes * MIN

const sameDay = (a: Entry, b: Entry) => new Date(a.ts).toDateString() === new Date(b.ts).toDateString()

export function sameReading(existing: Entry, incoming: Entry): boolean {
  // a row that already came from Salud has its own id and is deduped by it
  if (existing.source === 'health' || existing.extId) return false
  if (existing.kind !== incoming.kind) return false

  switch (existing.kind) {
    case 'glucose':
      return existing.value === incoming.value && near(existing, incoming, 15)
    case 'bp':
      return existing.sys === incoming.sys && existing.dia === incoming.dia && near(existing, incoming, 15)
    // one weighing a day: the hour is meaningless, and typing 92 for a scale's 92.1 is normal
    case 'weight':
      return sameDay(existing, incoming) && Math.abs((existing.value ?? 0) - (incoming.value ?? 0)) <= 1
    // the walk you noted and the workout the phone saw start around the same time
    case 'exercise':
      return near(existing, incoming, 30)
    default:
      return false
  }
}
