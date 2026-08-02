import type { AiAssistant, AiImage } from '../ports/ai'

// alias que sigue al flash vigente — evita 404 cuando Google retira modelos
const MODEL = 'gemini-flash-latest'

interface GPart {
  text?: string
  inline_data?: { mime_type: string; data: string }
}

export class GeminiAssistant implements AiAssistant {
  // la clave vive en el perfil del usuario; se resuelve en cada llamada
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
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts }] }),
    })
    if (!res.ok) {
      const body = await res.text()
      if (res.status === 400 || res.status === 403) throw new Error('La clave de la API no parece válida. Revísala en Ajustes.')
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
