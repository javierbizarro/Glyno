import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Entry } from '../domain/types'
import { defaultProfile } from '../domain/types'
import { generateReview } from './coach'
import { ai, deviceAi } from './container'

vi.mock('./container', () => ({
  ai: { complete: vi.fn() },
  deviceAi: vi.fn(() => ({ text: false, image: false })),
}))

const complete = vi.mocked(ai.complete)
const device = vi.mocked(deviceAi)

const withKey = { ...defaultProfile, name: 'Javier', geminiKey: 'AIzaSyEJEMPLO_FALSO_PARA_TESTS_00000000' }
const noKey = { ...defaultProfile, name: 'Javier', geminiKey: '' }

const DAY = 86_400_000
const diary: Entry[] = Array.from({ length: 20 }, (_, i) => ({
  ts: Date.now() - (i % 10) * DAY,
  kind: 'glucose' as const,
  value: 120 + (i % 5) * 12,
  note: 'ayunas',
}))

beforeEach(() => {
  vi.clearAllMocks()
  device.mockReturnValue({ text: false, image: false })
})

describe('generateReview', () => {
  it('asks the AI when there is one, and says it was the AI', async () => {
    complete.mockResolvedValue('Lo que escribió Gemini.')
    const r = await generateReview(withKey, diary)
    expect(r).toEqual({ text: 'Lo que escribió Gemini.', written: 'ai' })
  })

  it('writes it itself when there is no AI at all, instead of leaving the user with nothing', async () => {
    const r = await generateReview(noKey, diary)
    expect(r.written).toBe('glyno')
    expect(r.text).toContain('Javier')
    expect(complete).not.toHaveBeenCalled()
  })

  it('falls back to its own review when the AI fails, and keeps the reason', async () => {
    // no connection, spent quota, a key Google stopped accepting: the review still happens
    complete.mockRejectedValue(new Error('No hay conexión a internet.'))
    const r = await generateReview(withKey, diary)
    expect(r.written).toBe('glyno')
    expect(r.aiError).toBe('No hay conexión a internet.')
    expect(r.text).toContain('Javier')
  })

  it('prefers the device AI when the user asked for it', async () => {
    device.mockReturnValue({ text: true, image: false })
    complete.mockResolvedValue('Lo que escribió el móvil.')
    const r = await generateReview({ ...noKey, preferDevice: true }, diary)
    expect(r.written).toBe('ai')
  })
})
