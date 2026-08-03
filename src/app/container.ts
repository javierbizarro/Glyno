// composition root: concrete adapters are chosen here (and only here).
// When Capacitor arrives, swap Dexie for SQLite in this file.
import { DexieEntryRepository } from '../adapters/dexieEntryRepository'
import { LocalStorageProfileRepository } from '../adapters/localStorageProfileRepository'
import { GeminiAssistant } from '../adapters/geminiAssistant'

export const entries = new DexieEntryRepository()
export const profiles = new LocalStorageProfileRepository()
export const ai = new GeminiAssistant(() => profiles.load()?.geminiKey ?? '')

export async function resetAll() {
  profiles.clear()
  localStorage.removeItem('glyno.chat')
  localStorage.removeItem('glyno.review')
  await entries.deleteDatabase()
}
