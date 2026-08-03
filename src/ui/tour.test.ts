import { beforeEach, describe, expect, it } from 'vitest'
import { defaultProfile } from '../domain/types'
import { markTourSeen, shouldAutoStartTour } from './tour'

// node environment has no localStorage: back it with a Map
const store = new Map<string, string>()
beforeEach(() => {
  store.clear()
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
  } as unknown as Storage
})

describe('shouldAutoStartTour', () => {
  it('starts once for an onboarded profile that has never seen it', () => {
    expect(shouldAutoStartTour({ ...defaultProfile, onboarded: true })).toBe(true)
  })

  it('never starts during onboarding or without a profile', () => {
    expect(shouldAutoStartTour(defaultProfile)).toBe(false)
    expect(shouldAutoStartTour(null)).toBe(false)
  })

  it('does not start again after being seen — replay is only manual from Settings', () => {
    markTourSeen()
    expect(shouldAutoStartTour({ ...defaultProfile, onboarded: true })).toBe(false)
  })
})
