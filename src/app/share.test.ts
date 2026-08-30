import { describe, expect, it } from 'vitest'
import { shareUrl, WEB_URL } from './share'

describe('shareUrl', () => {
  it('shares the address the web app is being served from', () => {
    expect(shareUrl('web', 'https://javierbizarro.github.io', '/Glyno/')).toBe(
      'https://javierbizarro.github.io/Glyno/',
    )
    expect(shareUrl('web', 'http://localhost:5173', '/')).toBe('http://localhost:5173/')
  })

  it('never shares what `location` says inside the app', () => {
    // capacitor://localhost/ is a link that opens nothing on the receiver's phone
    for (const where of ['ios', 'android'] as const) {
      expect(shareUrl(where, 'capacitor://localhost', '/')).toBe(WEB_URL)
    }
  })

  it('points at a public https address', () => {
    expect(WEB_URL.startsWith('https://')).toBe(true)
  })
})
