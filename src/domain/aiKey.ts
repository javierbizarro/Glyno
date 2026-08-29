// Everything about the Gemini key that is pure text: cleaning what the user pasted,
// telling them in Spanish why it does not look like a key, and deciding which AI answers.

/** Google API keys: "AIza" plus 35 characters of [A-Za-z0-9_-] */
const KEY_RE = /AIza[0-9A-Za-z_-]{35}/
const EXACT_KEY_RE = /^AIza[0-9A-Za-z_-]{35}$/
/** zero-width and no-break characters travel inside pastes and break the key silently */
const INVISIBLE = /[\s\u00A0\u200B-\u200D\uFEFF]/g

/** the key inside whatever the clipboard brought: quotes, spaces, a whole sentence */
export function cleanKey(raw: string): string {
  const found = raw.match(KEY_RE)
  if (found) return found[0]
  return raw.replace(INVISIBLE, '').replace(/^["'«»]+|["'«»]+$/g, '')
}

export function looksLikeKey(key: string): boolean {
  return EXACT_KEY_RE.test(key)
}

/** why this is not a key, in words the user can act on; null when it is fine */
export function keyProblem(key: string): string | null {
  if (looksLikeKey(key)) return null
  if (!key) return 'No has pegado nada todavía.'
  if (/^sk-/.test(key)) return 'Eso parece la clave de otro servicio. Glyno usa la de Google, que empieza por «AIza».'
  if (/^https?:|\.com/i.test(key)) return 'Eso es la dirección de la página, no la clave. La clave es un texto largo que empieza por «AIza».'
  if (!key.startsWith('AIza')) return 'Las claves de Google empiezan por «AIza». Vuelve a copiarla desde la página.'
  return 'La clave se ha quedado a medias. Cópiala entera (son 39 caracteres) y vuelve a pegarla.'
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
