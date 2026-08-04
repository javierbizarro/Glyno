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
    // v2 adds the extId index for health-import dedupe; existing rows just lack the field
    this.version(2).stores({ entries: '++id, ts, kind, extId' })
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

  async update(id: number, patch: Partial<Entry>) {
    await this.db.entries.update(id, patch)
  }

  byExtIds(ids: string[]) {
    return this.db.entries.where('extId').anyOf(ids).toArray()
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
    // most recent by ts, NOT .last(): with the kind index, .last() means "last
    // inserted", and health imports insert days out of order
    return liveQuery(() =>
      this.db.entries.where('kind').equals(kind).sortBy('ts').then(a => a[a.length - 1]),
    )
  }

  /** only for the composition root's reset */
  async deleteDatabase() {
    this.db.close()
    await Dexie.delete('glyno')
  }
}
