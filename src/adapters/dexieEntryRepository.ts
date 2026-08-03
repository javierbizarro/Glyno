import Dexie, { liveQuery, type Table } from 'dexie'
import type { Entry, EntryKind } from '../domain/types'
import type { EntryRepository } from '../ports/repositories'
import type { Watchable } from '../ports/watchable'

// same name and schema as before the refactor: existing data is preserved
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

  async remove(id: number) {
    await this.db.entries.delete(id)
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

  /** only for the composition root's reset */
  async deleteDatabase() {
    this.db.close()
    await Dexie.delete('glyno')
  }
}
