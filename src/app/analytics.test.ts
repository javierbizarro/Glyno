import { describe, expect, it } from 'vitest'
import { pingUrl, shouldCountVisit } from './analytics'

const base = {
  hostname: 'glyno.es',
  dnt: null as string | null,
  gpc: false,
  dev: false,
  native: false,
}

describe('shouldCountVisit', () => {
  it('counts a normal production visit', () => {
    expect(shouldCountVisit(base)).toBe(true)
  })

  it('never counts inside the native app, however production-like the rest looks', () => {
    // the app declares "no data collected": one ping would make that a lie
    expect(shouldCountVisit({ ...base, native: true })).toBe(false)
  })

  it('never counts dev-server sessions, whatever the hostname', () => {
    // the dev server binds 0.0.0.0: opening it from a phone on the LAN must not ping
    expect(shouldCountVisit({ ...base, dev: true })).toBe(false)
  })

  it('never counts bare-IP hostnames (LAN access to a preview build)', () => {
    for (const hostname of ['192.168.1.40', '10.0.0.2', '[2001:db8::1]']) {
      expect(shouldCountVisit({ ...base, hostname })).toBe(false)
    }
  })

  it('respects Do Not Track in both spellings browsers use', () => {
    expect(shouldCountVisit({ ...base, dnt: '1' })).toBe(false)
    expect(shouldCountVisit({ ...base, dnt: 'yes' })).toBe(false)
    expect(shouldCountVisit({ ...base, dnt: '0' })).toBe(true)
  })

  it('respects Global Privacy Control', () => {
    expect(shouldCountVisit({ ...base, gpc: true })).toBe(false)
  })

  it('never counts development hosts', () => {
    for (const hostname of ['localhost', '127.0.0.1', '[::1]', 'glyno.local']) {
      expect(shouldCountVisit({ ...base, hostname })).toBe(false)
    }
  })
})

describe('pingUrl', () => {
  it('targets the GoatCounter count endpoint with the app path and nothing personal', () => {
    const url = new URL(pingUrl(1754241600000))
    expect(url.origin).toBe('https://glyno.goatcounter.com')
    expect(url.pathname).toBe('/count')
    expect(url.searchParams.get('p')).toBe('/app')
    // cache buster so the browser cannot swallow repeat opens
    expect(url.searchParams.get('rnd')).toBe('1754241600000')
    // the whole query is exactly these three keys: no referrer, no screen, no ids
    expect([...url.searchParams.keys()].sort()).toEqual(['p', 'rnd', 't'])
  })
})
