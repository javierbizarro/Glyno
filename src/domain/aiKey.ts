// Everything about the Gemini key that is pure text: cleaning what the user pasted,
// telling them in Spanish why it does not look like a key, and deciding which AI answers.

/**
 * Google issues keys in more than one shape — the long-lived "AIza…" and the newer "AQ.…" —
 * and it will invent more. Nothing here decides whether a key is valid: that is Google's job.
 * These patterns only help pull the key out of whatever text it arrived in.
 */
const KEY_IN_TEXT = /(?:AIza[0-9A-Za-z_-]{20,}|AQ\.[0-9A-Za-z_.-]{20,})/
const EXACT_KEY_RE = /^(?:AIza[0-9A-Za-z_-]{20,}|AQ\.[0-9A-Za-z_.-]{20,})$/
/** zero-width characters ride along inside pastes and break the key silently */
const ZERO_WIDTH = /[\u200B-\u200D\uFEFF]/g
const SPACES = /[\s\u00A0]+/
/** shorter than this and there is nothing to try */
const MIN_KEY = 20

/** the key inside whatever the clipboard brought: quotes, spaces, a whole sentence */
export function cleanKey(raw: string): string {
  const body = raw.replace(ZERO_WIDTH, '')
  const known = body.match(KEY_IN_TEXT)
  if (known) return known[0]
  // an unknown shape is still recoverable: of everything pasted, a key is the longest
  // run without spaces
  const longest = body.split(SPACES).filter(Boolean).sort((a, b) => b.length - a.length)[0] ?? ''
  return longest.replace(/^["'«»]+|["'«»]+$/g, '').replace(/[.,;:]+$/, '')
}

/** a shape we recognise — enough to check it on the spot, never a condition for accepting it */
export function looksLikeKey(key: string): boolean {
  return EXACT_KEY_RE.test(key)
}

/** only what is not worth sending to Google; anything else gets its chance */
export function keyBlocker(key: string): string | null {
  if (!key) return 'No has pegado nada todavía.'
  if (/^sk-/.test(key)) return 'Eso parece la clave de otro servicio. Glyno usa la de Google.'
  if (/^https?:|\.com\//i.test(key)) return 'Eso es la dirección de la página, no la clave. La clave es un texto largo, sin espacios.'
  if (key.length < MIN_KEY) return 'Eso es demasiado corto para ser una clave. Cópiala entera desde la página.'
  return null
}

/**
 * Advice added AFTER Google says no — never before, and never about how a key must start:
 * Google has already changed that once (AIza… and AQ.…) and will change it again.
 */
export function keyHint(key: string): string {
  if (key.length < 30) return ' Parece que se quedó a medias: cópiala entera, de principio a fin.'
  return ' Si acabas de crearla, dale un par de minutos y prueba otra vez: a veces tardan un poco en funcionar.'
}

/** turns the error of the test call into a verdict the user understands */
export function keyCheckOutcome(e: unknown): { ok: boolean; message: string } {
  const m = e instanceof Error ? e.message : String(e)
  // the quota is spent, but the key itself works: saving it is the right thing to do
  if (/cuota|\b429\b/i.test(m))
    return { ok: true, message: 'La clave vale, pero hoy se ha agotado la cuota gratuita. Vuelve a probar mañana.' }
  if (/failed to fetch|networkerror|load failed|network/i.test(m))
    return { ok: false, message: 'No hay conexión a internet. Conéctate y vuelve a intentarlo.' }
  if (/no parece válida|api key|\b40[013]\b/i.test(m))
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
