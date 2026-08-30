import { describe, expect, it } from 'vitest'
import { cleanKey, keyBlocker, keyCheckOutcome, keyHint, looksLikeKey, resolveAiSource } from './aiKey'

// the long-lived shape: "AIza" + 35 characters
const KEY = 'AIzaSyBn3f_kQ2vLp7RtY9wXzA4cD6eF8gH0iJk'
// the newer one Google hands out today, dots and all
const NEW_KEY = 'AQ.Ab8RN6Jk2mQvXpL9wZ0tY4cD7eF1gH3iJ5kM6nP8qR'

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

  it('keeps the newer shape whole, dots included', () => {
    expect(cleanKey(NEW_KEY)).toBe(NEW_KEY)
    expect(cleanKey(`  ${NEW_KEY}\n`)).toBe(NEW_KEY)
    expect(cleanKey(`Tu clave es ${NEW_KEY}, guárdala.`)).toBe(NEW_KEY)
  })

  it('rescues a shape nobody has seen yet: the key is the longest run without spaces', () => {
    expect(cleanKey('Aquí tienes: ZZ9-0000-1111-2222-3333-4444 y ya está')).toBe('ZZ9-0000-1111-2222-3333-4444')
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
  it('accepts both shapes Google hands out', () => {
    expect(looksLikeKey(KEY)).toBe(true)
    expect(looksLikeKey(NEW_KEY)).toBe(true)
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
  it('lets both shapes through', () => {
    expect(keyBlocker(KEY)).toBeNull()
    expect(keyBlocker(NEW_KEY)).toBeNull()
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
  it('never lectures about how a key starts: Google has changed that once already', () => {
    expect(keyHint(KEY)).not.toMatch(/AIza|empiez/i)
    expect(keyHint(NEW_KEY)).not.toMatch(/AIza|empiez/i)
  })

  it('suspects a cut when the key is short', () => {
    expect(keyHint('AIzaSyBn3f_kQ2vLp7RtY9')).toMatch(/media|entera/i)
  })

  it('suggests waiting for a brand new key to start working', () => {
    expect(keyHint(NEW_KEY)).toMatch(/minutos/i)
  })
})

describe('keyCheckOutcome', () => {
  it('reads a rejected key as a failure, and one we can explain', () => {
    const out = keyCheckOutcome(new Error('La clave de la API no parece válida. Revísala en Ajustes.'))
    expect(out.ok).toBe(false)
    expect(out.unknown).toBe(false)
    expect(out.message).toMatch(/Google no acepta/i)
  })

  it('reads the 401 of a malformed key as a rejection, not as a mystery', () => {
    const out = keyCheckOutcome(new Error('Error de Gemini (401): Request had invalid authentication credentials.'))
    expect(out.ok).toBe(false)
    expect(out.unknown).toBe(false)
  })

  it('reads a spent quota as a valid key', () => {
    const out = keyCheckOutcome(new Error('Se agotó la cuota gratuita de hoy. Vuelve a intentarlo en un rato.'))
    expect(out.ok).toBe(true)
    expect(out.message).toMatch(/cuota/i)
  })

  it('an overloaded Gemini says nothing about the key', () => {
    for (const e of [new Error('Gemini está saturado ahora mismo.'), new Error('Error de Gemini (503): the model is overloaded')]) {
      const out = keyCheckOutcome(e)
      expect(out.ok).toBe(false)
      expect(out.unknown).toBe(true)
      expect(out.message).toMatch(/saturado/i)
    }
  })

  it('a timeout is not a bad key either', () => {
    const out = keyCheckOutcome(new Error('Google ha tardado demasiado en contestar.'))
    expect(out.unknown).toBe(true)
    expect(out.message).toMatch(/tardado/i)
  })

  it('only blames the connection when the device really is offline', () => {
    const offline = keyCheckOutcome(new TypeError('Failed to fetch'), false)
    expect(offline.message).toMatch(/conexión a internet/i)

    // online and still unreachable: it may well be Google, so do not send the user to check the wifi
    const online = keyCheckOutcome(new TypeError('Failed to fetch'), true)
    expect(online.unknown).toBe(true)
    expect(online.message).toMatch(/Google/)
  })

  it('an error nobody recognises is a "we could not tell", never a bad key', () => {
    const out = keyCheckOutcome(new Error('algo rarísimo'))
    expect(out.ok).toBe(false)
    expect(out.unknown).toBe(true)
    expect(out.message).toMatch(/algo rarísimo/)
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
