import type { Entry, EntryKind, Profile } from '../domain/types'
import type { Watchable } from './watchable'

export interface EntryRepository {
  add(entry: Entry): Promise<void>
  bulkAdd(entries: Entry[]): Promise<void>
  remove(id: number): Promise<void>
  update(id: number, patch: Partial<Entry>): Promise<void>
  clear(): Promise<void>
  all(): Promise<Entry[]>
  /** entries whose extId is in the list (health-import dedupe) */
  byExtIds(ids: string[]): Promise<Entry[]>
  /** entries in [from, to), ascending order — one shot, for matching an import against the diary */
  between(from: number, to: number): Promise<Entry[]>
  /** entries with ts >= since, ascending order, live */
  watchSince(since: number): Watchable<Entry[]>
  /** entries in [from, to), ascending order, live */
  watchBetween(from: number, to: number): Watchable<Entry[]>
  /** all entries of one kind, ascending order, live */
  watchByKind(kind: EntryKind): Watchable<Entry[]>
  /** most recent entry of one kind, live */
  watchLastByKind(kind: EntryKind): Watchable<Entry | undefined>
}

export interface ProfileRepository {
  load(): Profile | null
  save(profile: Profile): void
}
