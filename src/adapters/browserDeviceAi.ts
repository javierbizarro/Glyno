import type { AiImage } from '../ports/ai'
import type { DeviceAi, DeviceAiState } from '../ports/deviceAi'

// The browser's own AI (Prompt API, Gemini Nano). Chrome on Android/desktop exposes
// `LanguageModel`; Safari exposes nothing, so on the iPhone this is always unsupported and
// the Gemini key remains the way in until the native app brings Apple's Foundation Models.

interface Session {
  prompt(input: unknown): Promise<string>
  destroy(): void
}

interface LanguageModelApi {
  availability(options?: unknown): Promise<DeviceAiState>
  create(options?: unknown): Promise<Session>
}

function api(): LanguageModelApi | null {
  const model = (globalThis as { LanguageModel?: LanguageModelApi }).LanguageModel
  return model && typeof model.availability === 'function' ? model : null
}

/** image input is a separate capability: a device can write text and still not see photos */
const IMAGE_OPTS = { expectedInputs: [{ type: 'image' }] }

async function state(options?: unknown): Promise<DeviceAiState> {
  const model = api()
  if (!model) return 'unsupported'
  try {
    return await model.availability(options)
  } catch {
    return 'unsupported'
  }
}

export class BrowserDeviceAi implements DeviceAi {
  state() {
    return state()
  }

  imageState() {
    return state(IMAGE_OPTS)
  }

  /**
   * Downloads the model (a few GB, once per device). Reports 0..1 so the UI can show
   * a bar: without it the first question would hang with nothing on screen.
   */
  async prepare(onProgress: (ratio: number) => void): Promise<DeviceAiState> {
    const model = api()
    if (!model) return 'unsupported'
    const session = await model.create({
      monitor(m: { addEventListener(type: string, fn: (e: { loaded: number }) => void): void }) {
        m.addEventListener('downloadprogress', e => onProgress(e.loaded))
      },
    })
    session.destroy()
    return state()
  }

  async complete(prompt: string): Promise<string> {
    const session = await this.open()
    try {
      return this.text(await session.prompt(prompt))
    } finally {
      session.destroy()
    }
  }

  async completeWithImage(prompt: string, image: AiImage): Promise<string> {
    const session = await this.open(IMAGE_OPTS)
    try {
      const blob = toBlob(image)
      return this.text(
        await session.prompt([
          { role: 'user', content: [{ type: 'text', value: prompt }, { type: 'image', value: blob }] },
        ]),
      )
    } catch {
      // a text-only device says nothing useful here; the photo is the one thing the key still buys
      throw new Error(
        'La IA de tu móvil no sabe mirar fotos. Descríbeme el plato con palabras, o pon la clave de Google en Ajustes → Glyno IA.',
      )
    } finally {
      session.destroy()
    }
  }

  private async open(options?: unknown): Promise<Session> {
    const model = api()
    if (!model) throw new Error('Este navegador no trae IA propia. Pon la clave de Google en Ajustes → Glyno IA.')
    try {
      // asking for Spanish out loud: newer Chrome refuses to answer otherwise
      return await model.create({ ...(options ?? {}), expectedOutputs: [{ type: 'text', languages: ['es'] }] })
    } catch {
      return model.create(options)
    }
  }

  private text(raw: string): string {
    const text = (raw ?? '').trim()
    if (!text) throw new Error('La IA de tu móvil se ha quedado en blanco. Inténtalo otra vez.')
    return text
  }
}

function toBlob({ mimeType, base64 }: AiImage): Blob {
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mimeType })
}
