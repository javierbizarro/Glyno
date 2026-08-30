import { registerPlugin } from '@capacitor/core'
import type { AiImage } from '../ports/ai'
import type { DeviceAi, DeviceAiState } from '../ports/deviceAi'

// Apple's Foundation Models, through the Swift plugin in the iOS project. No key, no account,
// no connection: the prompt never leaves the phone. Only where Apple Intelligence runs, so
// "unsupported" is the ordinary answer on most iPhones and the Gemini key remains the way in.

interface DeviceAiBridge {
  state(): Promise<{ state: DeviceAiState }>
  complete(options: { prompt: string }): Promise<{ text: string }>
}

const bridge = registerPlugin<DeviceAiBridge>('DeviceAi')

export class AppleDeviceAi implements DeviceAi {
  async state(): Promise<DeviceAiState> {
    try {
      return (await bridge.state()).state
    } catch {
      return 'unsupported'
    }
  }

  /** the system model is text-only: a plate still needs the key */
  imageState(): Promise<DeviceAiState> {
    return Promise.resolve('unsupported')
  }

  /** nothing to download: the model ships with the system, so this only reports the state */
  prepare(): Promise<DeviceAiState> {
    return this.state()
  }

  async complete(prompt: string): Promise<string> {
    return (await bridge.complete({ prompt })).text
  }

  completeWithImage(_prompt: string, _image: AiImage): Promise<string> {
    return Promise.reject(
      new Error(
        'La IA de tu iPhone no sabe mirar fotos. Descríbeme el plato con palabras, o pon la clave de Google en Ajustes → Glyno IA.',
      ),
    )
  }
}
