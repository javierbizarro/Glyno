import { registerPlugin } from '@capacitor/core'
import type { HealthSample, HealthSource } from '../ports/health'

// Apple Salud, through the Swift plugin that lives in the iOS project
// (ios/App/App/HealthPlugin.swift). Read-only: Glyno never writes back.

interface HealthBridge {
  available(): Promise<{ available: boolean }>
  request(): Promise<{ available: boolean }>
  read(options: { from: number; to: number }): Promise<{ samples: HealthSample[] }>
}

const bridge = registerPlugin<HealthBridge>('Health')

export class AppleHealth implements HealthSource {
  async available(): Promise<boolean> {
    try {
      return (await bridge.available()).available
    } catch {
      return false
    }
  }

  async request(): Promise<void> {
    await bridge.request()
  }

  async read(fromMs: number, toMs: number): Promise<HealthSample[]> {
    return (await bridge.read({ from: fromMs, to: toMs })).samples ?? []
  }
}
