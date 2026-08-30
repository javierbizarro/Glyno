import type { AiAssistant, AiImage } from '../ports/ai'
import { orderModels } from '../domain/geminiModels'

const API = 'https://generativelanguage.googleapis.com/v1beta'
// alias that tracks the current flash model — avoids 404s when Google retires models
const PRIMARY = 'gemini-flash-latest'

interface GPart {
  text?: string
  inline_data?: { mime_type: string; data: string }
}

/** the free tier is spent per model: on these two, another model may well answer */
const isBusy = (status: number) => status === 429 || status >= 500

export class GeminiAssistant implements AiAssistant {
  /** the model that answered last: no point starting again on one that ran out */
  private working: string | null = null
  /** the account's model list, asked once and only when the first choice is unavailable */
  private spares: string[] | null = null

  // the key lives in the user's profile; resolved on every call
  constructor(private readonly getKey: () => string) {}

  complete(prompt: string) {
    return this.call([{ text: prompt }])
  }

  completeWithImage(prompt: string, image: AiImage) {
    return this.call([{ text: prompt }, { inline_data: { mime_type: image.mimeType, data: image.base64 } }])
  }

  private async call(parts: GPart[]): Promise<string> {
    const key = this.getKey()
    if (!key) throw new Error('Falta la clave de la API. Ponla en Ajustes → Glyno IA.')
    const body = JSON.stringify({ contents: [{ role: 'user', parts }] })

    const first = this.working ?? PRIMARY
    let result = await this.ask(first, key, body)
    if ('text' in result) return result.text

    // only now is the spare list worth asking for: the usual path never needs it
    for (const model of (this.spares ?? (await this.discover(key))).filter(m => m !== first)) {
      result = await this.ask(model, key, body)
      if ('text' in result) return result.text
    }
    throw result.busy
  }

  /** one model, one question. A busy model is returned, not thrown: the next one may answer */
  private async ask(model: string, key: string, body: string): Promise<{ text: string } | { busy: Error }> {
    const res = await fetch(`${API}/models/${model}:generateContent`, {
      method: 'POST',
      // the key goes in the header, never in the URL: addresses end up in logs and histories,
      // and Google's newer keys carry characters that do not belong in a query string
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body,
    })
    if (res.ok) {
      this.working = model
      return { text: this.read(await res.json()) }
    }
    const error = this.error(res.status, await res.text())
    if (isBusy(res.status)) return { busy: error }
    throw error
  }

  /**
   * Asks the account which models it can use. Listing is metadata, not a question for the
   * model, so it costs no quota; it only happens once, and only after the first choice
   * came back busy.
   */
  private async discover(key: string): Promise<string[]> {
    try {
      const res = await fetch(`${API}/models`, { headers: { 'x-goog-api-key': key } })
      if (!res.ok) return (this.spares = [])
      const data = await res.json()
      const names: string[] = (data?.models ?? [])
        .filter((m: { supportedGenerationMethods?: string[] }) =>
          (m.supportedGenerationMethods ?? []).includes('generateContent'),
        )
        .map((m: { name?: string }) => m.name ?? '')
        .filter(Boolean)
      return (this.spares = orderModels(names, PRIMARY))
    } catch {
      // a failed listing must not become a different error than the one that sent us here
      return (this.spares = [])
    }
  }

  private error(status: number, body: string): Error {
    // 401 is what a malformed key gets ("expected OAuth 2 access token"); 400/403, a rejected one
    if ([400, 401, 403].includes(status)) return new Error('La clave de la API no parece válida. Revísala en Ajustes.')
    if (status === 429)
      return new Error('Se ha agotado la cuota gratuita de hoy. Vuelve a intentarlo mañana.')
    // Google's own words here are "the model is overloaded": nothing to do with the key
    if (status >= 500)
      return new Error('Gemini está saturado ahora mismo. No es cosa tuya: vuelve a intentarlo en un rato.')
    return new Error(`Error de Gemini (${status}): ${body.slice(0, 160)}`)
  }

  private read(data: unknown): string {
    const parts = (data as { candidates?: { content?: { parts?: { text?: string }[] } }[] })?.candidates?.[0]?.content
      ?.parts
    const text = (parts ?? []).map(p => p.text ?? '').join('').trim()
    if (!text) throw new Error('Gemini devolvió una respuesta vacía.')
    return text
  }
}
