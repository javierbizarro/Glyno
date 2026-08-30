// composition root: concrete adapters are chosen here (and only here).
// When Capacitor arrives, swap Dexie for SQLite in this file.
import { DexieEntryRepository } from '../adapters/dexieEntryRepository'
import { LocalStorageProfileRepository } from '../adapters/localStorageProfileRepository'
import { GeminiAssistant } from '../adapters/geminiAssistant'
import { BrowserDeviceAi } from '../adapters/browserDeviceAi'
import { resolveAiSource } from '../domain/aiKey'
import type { AiAssistant } from '../ports/ai'
import type { DeviceAi, DeviceAiState } from '../ports/deviceAi'

export const entries = new DexieEntryRepository()
export const profiles = new LocalStorageProfileRepository()

const gemini = new GeminiAssistant(() => profiles.load()?.geminiKey ?? '')
// the seam for the native app: Apple's Foundation Models and Gemini Nano swap in here
const device: DeviceAi = new BrowserDeviceAi()

/** asked fresh, for the screen that offers the download and shows its progress */
export const probeDeviceAi = (): Promise<DeviceAiState> => device.state()
export const prepareDeviceAi = (onProgress: (ratio: number) => void) => device.prepare(onProgress)

// asking the browser is async and every call has to choose right now: the answer is cached
// here and refreshed by refreshDeviceAi() when the app starts and from Ajustes
let ready = { text: false, image: false }

export const deviceAi = () => ready

export async function refreshDeviceAi() {
  const [text, image] = await Promise.all([device.state(), device.imageState()])
  ready = { text: text === 'available', image: image === 'available' }
  return ready
}

const pick = (needsImage: boolean): AiAssistant => {
  const profile = profiles.load()
  const on = needsImage ? ready.image : ready.text
  return resolveAiSource(profile ?? { geminiKey: '' }, on) === 'device' ? device : gemini
}

export const ai: AiAssistant = {
  complete: prompt => pick(false).complete(prompt),
  completeWithImage: (prompt, image) => pick(true).completeWithImage(prompt, image),
}

/** a throwaway assistant to try out a key the user has not saved yet */
export const assistantWithKey = (key: string): AiAssistant => new GeminiAssistant(() => key)

export async function resetAll() {
  profiles.clear()
  localStorage.removeItem('glyno.chat')
  localStorage.removeItem('glyno.chats')
  localStorage.removeItem('glyno.review')
  await entries.deleteDatabase()
}
