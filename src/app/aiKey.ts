import { cleanKey, keyBlocker, keyCheckOutcome, keyHint } from '../domain/aiKey'
import { assistantWithKey } from './container'

export interface KeyCheck {
  ok: boolean
  /** nobody could tell: Google was busy or unreachable, so the key deserves the benefit of the doubt */
  unknown: boolean
  /** the key as it should be saved, already cleaned of whatever came with it */
  key: string
  message: string
}

/** an overloaded Gemini can hang for minutes; nobody should watch a spinner that long */
const TIMEOUT_MS = 20_000

function withTimeout<T>(work: Promise<T>): Promise<T> {
  return Promise.race([
    work,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Google ha tardado demasiado en contestar.')), TIMEOUT_MS),
    ),
  ])
}

/** the only honest way to know whether a key works: ask Google once, with the cheapest question */
export async function checkKey(raw: string): Promise<KeyCheck> {
  const key = cleanKey(raw)
  const blocker = keyBlocker(key)
  if (blocker) return { ok: false, unknown: false, key, message: blocker }
  try {
    await withTimeout(assistantWithKey(key).complete('Responde solo con la palabra: listo'))
    return { ok: true, unknown: false, key, message: '¡Funciona! Ya puedo hablar contigo.' }
  } catch (e) {
    const out = keyCheckOutcome(e, navigator.onLine)
    // the shape of the key is advice, and only worth giving when Google has actually judged it
    const message = out.ok || out.unknown ? out.message : out.message + keyHint(key)
    return { ...out, key, message }
  }
}
