// composition root: concrete adapters are chosen here (and only here).
// When Capacitor arrives, swap Dexie for SQLite in this file.
import { DexieEntryRepository } from '../adapters/dexieEntryRepository'
import { LocalStorageProfileRepository } from '../adapters/localStorageProfileRepository'
import { GeminiAssistant } from '../adapters/geminiAssistant'
import { BrowserDeviceAi } from '../adapters/browserDeviceAi'
import { AppleDeviceAi } from '../adapters/appleDeviceAi'
import { AppleHealth } from '../adapters/appleHealth'
import { NoHealth } from '../adapters/noHealth'
import { WebPrinter } from '../adapters/webPrinter'
import { NativePrinter } from '../adapters/nativePrinter'
import { isNative, platform } from './platform'
import { resolveAiSource } from '../domain/aiKey'
import type { AiAssistant } from '../ports/ai'
import type { DeviceAi, DeviceAiState } from '../ports/deviceAi'
import type { HealthSource } from '../ports/health'
import type { Printer } from '../ports/printer'

export const entries = new DexieEntryRepository()
export const profiles = new LocalStorageProfileRepository()

// Apple Salud inside the app; everywhere else there is no health store to read
export const health: HealthSource = platform() === 'ios' ? new AppleHealth() : new NoHealth()

// window.print() is a no-op in a WebView: inside the app the system sheet does the job
export const printer: Printer = isNative() ? new NativePrinter() : new WebPrinter()

const gemini = new GeminiAssistant(() => profiles.load()?.geminiKey ?? '')
// Apple's Foundation Models inside the app; on the web, whatever the browser offers
const device: DeviceAi = platform() === 'ios' ? new AppleDeviceAi() : new BrowserDeviceAi()

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
