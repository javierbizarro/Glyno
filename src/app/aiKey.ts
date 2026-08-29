import { cleanKey, keyCheckOutcome, keyProblem } from '../domain/aiKey'
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
  const problem = keyProblem(key)
  if (problem) return { ok: false, key, message: problem }
  try {
    await assistantWithKey(key).complete('Responde solo con la palabra: listo')
    return { ok: true, key, message: '¡Funciona! Ya puedo hablar contigo.' }
  } catch (e) {
    return { key, ...keyCheckOutcome(e) }
  }
}
