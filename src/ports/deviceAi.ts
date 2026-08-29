import type { AiAssistant } from './ai'

/** what the device says about its own AI before being asked anything */
export type DeviceAiState = 'unsupported' | 'unavailable' | 'downloadable' | 'downloading' | 'available'

/**
 * An AI that lives inside the device: no key, and the prompt never leaves it.
 * Today the browser's Prompt API implements it; the native app will add Apple's
 * Foundation Models (iOS) and Gemini Nano (Android) behind this same interface.
 */
export interface DeviceAi extends AiAssistant {
  /** for text; looking at photos is a separate capability, and often absent */
  state(): Promise<DeviceAiState>
  imageState(): Promise<DeviceAiState>
  /** downloads the model once, reporting 0..1 while it goes */
  prepare(onProgress: (ratio: number) => void): Promise<DeviceAiState>
}
