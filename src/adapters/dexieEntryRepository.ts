import Dexie, { liveQuery, type Table } from 'dexie'
import type { Entry, EntryKind } from '../domain/types'
import type { EntryRepository } from '../ports/repositories'
import type { Watchable } from '../ports/watchable'

// mismo nombre y esquema que antes del refactor: los datos existentes se conservan
class GlynoDB extends Dexie {
  entries!: Table<Entry, number>
  constructor() {
    super('glyno')
    this.version(1).stores({ entries: '++id, ts, kind' })
  }
}

export class DexieEntryRepository implements EntryRepository {
  private db = new GlynoDB()

  async add(entry: Entry) {
    await this.db.entries.add(entry)
  }

  async bulkAdd(entries: Entry[]) {
    await this.db.entries.bulkAdd(entries)
  }

  async clear() {
    await this.db.entries.clear()
  }

  all() {
    return this.db.entries.orderBy('ts').toArray()
  }

  watchSince(since: number): Watchable<Entry[]> {
    return liveQuery(() => this.db.entries.where('ts').aboveOrEqual(since).sortBy('ts'))
  }

  watchBetween(from: number, to: number): Watchable<Entry[]> {
    return liveQuery(() => this.db.entries.where('ts').between(from, to, true, false).sortBy('ts'))
  }

  watchByKind(kind: EntryKind): Watchable<Entry[]> {
    return liveQuery(() => this.db.entries.where('kind').equals(kind).sortBy('ts'))
  }

  watchLastByKind(kind: EntryKind): Watchable<Entry | undefined> {
    return liveQuery(() => this.db.entries.where('kind').equals(kind).last())
  }

  /** solo para el reset de la composición raíz */
  async deleteDatabase() {
    this.db.close()
    await Dexie.delete('glyno')
  }
}
