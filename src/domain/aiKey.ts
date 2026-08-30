// Everything about the Gemini key that is pure text: cleaning what the user pasted,
// telling them in Spanish why it does not look like a key, and deciding which AI answers.

/**
 * Google's keys look like "AIza" + 35 more characters, but that shape is Google's to change,
 * not ours to enforce: the checks below only stop what is pointless to send. Whether a key
 * works is decided by Google, not by a regular expression here.
 */
const KEY_RE = /AIza[0-9A-Za-z_-]{20,}/
const EXACT_KEY_RE = /^AIza[0-9A-Za-z_-]{30,}$/
/** zero-width and no-break characters travel inside pastes and break the key silently */
const INVISIBLE = /[\s\u00A0\u200B-\u200D\uFEFF]/g
/** shorter than this and there is nothing to try */
const MIN_KEY = 20

/** the key inside whatever the clipboard brought: quotes, spaces, a whole sentence */
export function cleanKey(raw: string): string {
  const found = raw.match(KEY_RE)
  if (found) return found[0]
  return raw.replace(INVISIBLE, '').replace(/^["\'«»]+|["\'«»]+$/g, '')
}

/** the usual shape — enough to check it on the spot, never a condition for accepting it */
export function looksLikeKey(key: string): boolean {
  return EXACT_KEY_RE.test(key)
}

/** only what is not worth sending to Google; anything else gets its chance */
export function keyBlocker(key: string): string | null {
  if (!key) return 'No has pegado nada todavía.'
  if (/^sk-/.test(key)) return 'Eso parece la clave de otro servicio. Glyno usa la de Google.'
  if (/^https?:|\.com/i.test(key)) return 'Eso es la dirección de la página, no la clave. La clave es un texto largo, sin espacios.'
  if (key.length < MIN_KEY) return 'Eso es demasiado corto para ser una clave. Cópiala entera desde la página.'
  return null
}

/**
 * Advice added AFTER Google says no — never before. Spelled out letter by letter on purpose:
 * in most fonts «AIza» is indistinguishable from «Alza», and telling someone to look for a
 * word they cannot read is worse than saying nothing.
 */
export function keyHint(key: string): string {
  if (!key.startsWith('AIza'))
    return ' Comprueba que copiaste la clave y no otra cosa: empiezan por A-I-z-a, y la segunda letra es una i mayúscula, no una ele.'
  if (key.length < 39) return ' Parece que se quedó a medias: suelen tener 39 caracteres.'
  return ''
}

/** turns the error of the test call into a verdict the user understands */
export function keyCheckOutcome(e: unknown): { ok: boolean; message: string } {
  const m = e instanceof Error ? e.message : String(e)
  // the quota is spent, but the key itself works: saving it is the right thing to do
  if (/cuota|\b429\b/i.test(m))
    return { ok: true, message: 'La clave vale, pero hoy se ha agotado la cuota gratuita. Vuelve a probar mañana.' }
  if (/failed to fetch|networkerror|load failed|network/i.test(m))
    return { ok: false, message: 'No hay conexión a internet. Conéctate y vuelve a intentarlo.' }
  if (/no parece válida|api key|\b40[03]\b/i.test(m))
    return { ok: false, message: 'Google no acepta esa clave. Vuelve a copiarla desde la página, entera y sin espacios.' }
  return { ok: false, message: `No se ha podido comprobar la clave: ${m}` }
}

export type AiSource = 'device' | 'key'

/**
 * Which AI answers, or null when there is none. The key wins when there is one
 * (the big model writes better); the device only takes over if the user asks for it.
 */
export function resolveAiSource(
  p: { geminiKey: string; preferDevice?: boolean },
  deviceReady: boolean,
): AiSource | null {
  if (deviceReady && (p.preferDevice || !p.geminiKey)) return 'device'
  return p.geminiKey ? 'key' : null
}
