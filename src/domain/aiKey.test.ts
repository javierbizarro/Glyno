import { describe, expect, it } from 'vitest'
import { cleanKey, keyBlocker, keyCheckOutcome, keyHint, looksLikeKey, resolveAiSource } from './aiKey'

// shape of a real Google API key: "AIza" + 35 characters
const KEY = 'AIzaSyBn3f_kQ2vLp7RtY9wXzA4cD6eF8gH0iJk'

describe('cleanKey', () => {
  it('keeps a clean key untouched', () => {
    expect(KEY).toHaveLength(39)
    expect(cleanKey(KEY)).toBe(KEY)
  })

  it('drops the spaces and line breaks a paste drags along', () => {
    expect(cleanKey(`  ${KEY}\n`)).toBe(KEY)
  })

  it('pulls the key out of the sentence around it', () => {
    expect(cleanKey(`Your API key: ${KEY} (keep it secret)`)).toBe(KEY)
  })

  it('drops invisible characters and curly quotes', () => {
    expect(cleanKey(`​«${KEY} »`)).toBe(KEY)
  })

  it('returns what it got, trimmed, when there is no key in sight', () => {
    expect(cleanKey('  hola  ')).toBe('hola')
    expect(cleanKey('')).toBe('')
  })
})

describe('looksLikeKey', () => {
  it('accepts a well formed key', () => {
    expect(looksLikeKey(KEY)).toBe(true)
  })

  it('rejects anything else', () => {
    expect(looksLikeKey('')).toBe(false)
    expect(looksLikeKey('AIza123')).toBe(false)
    expect(looksLikeKey(`${KEY} y algo más`)).toBe(false)
    expect(looksLikeKey('sk-proj-0123456789abcdefghijklmnopqrstuvwxyz')).toBe(false)
  })

  it('does not care about the exact length: Google may make them longer tomorrow', () => {
    expect(looksLikeKey(`${KEY}0123456789`)).toBe(true)
  })
})

describe('keyBlocker', () => {
  it('lets a well formed key through', () => {
    expect(keyBlocker(KEY)).toBeNull()
  })

  it('lets through what it does not recognise: the verdict is Google\'s, not ours', () => {
    // a key shape we have never seen must still get its chance — Google changes formats, we do not
    expect(keyBlocker('QWERTY-1234567890-abcdefghij')).toBeNull()
  })

  it('tells apart an empty paste', () => {
    expect(keyBlocker('')).toMatch(/nada/i)
  })

  it('recognises a key from another service', () => {
    expect(keyBlocker('sk-proj-0123456789abcdefghijklmnop')).toMatch(/Google/)
  })

  it('recognises a pasted web address', () => {
    expect(keyBlocker('https://aistudio.google.com/apikey')).toMatch(/dirección/i)
  })

  it('stops what is too short to be worth sending', () => {
    expect(keyBlocker('AIzaSyBn3f')).toMatch(/corto/i)
  })
})

describe('keyHint', () => {
  it('says nothing about a key with the usual shape', () => {
    expect(keyHint(KEY)).toBe('')
  })

  it('spells the prefix out: «AIza» and «Alza» look the same on screen', () => {
    const hint = keyHint('QWERTY-1234567890-abcdefghij')
    expect(hint).toMatch(/A-I-z-a/)
    expect(hint).toMatch(/i mayúscula/)
  })

  it('suspects a cut when the key is short', () => {
    expect(keyHint('AIzaSyBn3f_kQ2vLp7RtY9wXzA4cD6')).toMatch(/media|39/i)
  })
})

describe('keyCheckOutcome', () => {
  it('reads a rejected key as a failure', () => {
    const out = keyCheckOutcome(new Error('La clave de la API no parece válida. Revísala en Ajustes.'))
    expect(out.ok).toBe(false)
    expect(out.message).toMatch(/Google no acepta/i)
  })

  it('reads a spent quota as a valid key', () => {
    const out = keyCheckOutcome(new Error('Se agotó la cuota gratuita de hoy. Vuelve a intentarlo en un rato.'))
    expect(out.ok).toBe(true)
    expect(out.message).toMatch(/cuota/i)
  })

  it('reads a network failure as "no internet", not as a bad key', () => {
    const out = keyCheckOutcome(new TypeError('Failed to fetch'))
    expect(out.ok).toBe(false)
    expect(out.message).toMatch(/conexión|internet/i)
  })

  it('falls back to the original message', () => {
    const out = keyCheckOutcome(new Error('Error de Gemini (500): boom'))
    expect(out.ok).toBe(false)
    expect(out.message).toMatch(/500/)
  })
})

describe('resolveAiSource', () => {
  const key = { geminiKey: KEY }
  const noKey = { geminiKey: '' }

  it('is off when there is neither key nor on-device AI', () => {
    expect(resolveAiSource(noKey, false)).toBeNull()
  })

  it('uses the device when there is no key: nothing to set up', () => {
    expect(resolveAiSource(noKey, true)).toBe('device')
  })

  it('prefers the key when there is one: the big model writes better', () => {
    expect(resolveAiSource(key, true)).toBe('key')
  })

  it('honours the choice of keeping everything on the device', () => {
    expect(resolveAiSource({ ...key, preferDevice: true }, true)).toBe('device')
  })

  it('falls back to the key when the device AI is not there', () => {
    expect(resolveAiSource({ ...key, preferDevice: true }, false)).toBe('key')
  })
})
