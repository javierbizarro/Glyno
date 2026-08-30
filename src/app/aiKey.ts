import { cleanKey, keyBlocker, keyCheckOutcome, keyHint } from '../domain/aiKey'
import { assistantWithKey } from './container'

export interface KeyCheck {
  ok: boolean
  /** the key as it should be saved, already cleaned of whatever came with it */
  key: string
  message: string
}

/** the only honest way to know whether a key works: ask Google once, with the cheapest question */
export async function checkKey(raw: string): Promise<KeyCheck> {
  const key = cleanKey(raw)
  const blocker = keyBlocker(key)
  if (blocker) return { ok: false, key, message: blocker }
  try {
    await assistantWithKey(key).complete('Responde solo con la palabra: listo')
    return { ok: true, key, message: '¡Funciona! Ya puedo hablar contigo.' }
  } catch (e) {
    // the shape of the key is advice, never a verdict: Google has just given the verdict
    const out = keyCheckOutcome(e)
    return { key, ok: out.ok, message: out.ok ? out.message : out.message + keyHint(key) }
  }
}
