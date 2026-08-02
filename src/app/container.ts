// composición raíz: aquí (y solo aquí) se eligen los adaptadores concretos.
// El día que llegue Capacitor, se cambia Dexie por SQLite en este fichero.
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
