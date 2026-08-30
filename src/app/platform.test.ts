import { describe, expect, it } from 'vitest'
import { detectPlatform } from './platform'

describe('detectPlatform', () => {
  it('is the web when Capacitor is not there at all', () => {
    expect(detectPlatform(undefined)).toBe('web')
    expect(detectPlatform(null)).toBe('web')
  })

  it('reads the platform the native shell reports', () => {
    expect(detectPlatform({ getPlatform: () => 'ios' })).toBe('ios')
    expect(detectPlatform({ getPlatform: () => 'android' })).toBe('android')
  })

  it('treats Capacitor running in a browser as the web', () => {
    // `npx cap serve` and the live-reload mode inject the global and answer 'web'
    expect(detectPlatform({ getPlatform: () => 'web' })).toBe('web')
  })

  it('does not trust an unknown answer', () => {
    expect(detectPlatform({ getPlatform: () => 'electron' })).toBe('web')
    expect(detectPlatform({})).toBe('web')
  })
})
