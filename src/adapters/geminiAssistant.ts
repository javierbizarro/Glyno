import type { AiAssistant, AiImage } from '../ports/ai'

// alias that tracks the current flash model — avoids 404s when Google retires models
const MODEL = 'gemini-flash-latest'

interface GPart {
  text?: string
  inline_data?: { mime_type: string; data: string }
}

export class GeminiAssistant implements AiAssistant {
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
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`
    // the key goes in the header, never in the URL: addresses end up in logs and histories,
    // and Google's newer keys carry characters that do not belong in a query string
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ contents: [{ role: 'user', parts }] }),
    })
    if (!res.ok) {
      const body = await res.text()
      // 401 is what a malformed key gets ("expected OAuth 2 access token"); 400/403, a rejected one
      if ([400, 401, 403].includes(res.status)) throw new Error('La clave de la API no parece válida. Revísala en Ajustes.')
      if (res.status === 429) throw new Error('Se agotó la cuota gratuita de hoy. Vuelve a intentarlo en un rato.')
      throw new Error(`Error de Gemini (${res.status}): ${body.slice(0, 160)}`)
    }
    const data = await res.json()
    const text: string =
      data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? ''
    if (!text.trim()) throw new Error('Gemini devolvió una respuesta vacía.')
    return text.trim()
  }
}
