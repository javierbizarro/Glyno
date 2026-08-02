import type { Entry, EntryKind, Profile } from '../domain/types'
import type { Watchable } from './watchable'

export interface EntryRepository {
  add(entry: Entry): Promise<void>
  bulkAdd(entries: Entry[]): Promise<void>
  clear(): Promise<void>
  all(): Promise<Entry[]>
  /** entradas con ts >= since, ordenadas ascendente, en vivo */
  watchSince(since: number): Watchable<Entry[]>
  /** todas las de un tipo, ordenadas ascendente, en vivo */
  watchByKind(kind: EntryKind): Watchable<Entry[]>
  /** la más reciente de un tipo, en vivo */
  watchLastByKind(kind: EntryKind): Watchable<Entry | undefined>
}

export interface ProfileRepository {
  load(): Profile | null
  save(profile: Profile): void
}
