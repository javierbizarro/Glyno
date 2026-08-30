import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GeminiAssistant } from './geminiAssistant'

// Gemini's own answers are never tested (they are not deterministic): what is tested here is
// OUR retry logic, which is where the free tier is won or lost — its quota is per model.

const KEY = 'AQ.test-key-1234567890'
const ok = (text: string) =>
  new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), { status: 200 })
const fail = (status: number) => new Response(JSON.stringify({ error: { code: status } }), { status })
const models = (...names: string[]) =>
  new Response(
    JSON.stringify({ models: names.map(name => ({ name: `models/${name}`, supportedGenerationMethods: ['generateContent'] })) }),
    { status: 200 },
  )

const modelOf = (call: unknown[]) => String(call[0]).split('/models/')[1]?.split(':')[0]

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => vi.unstubAllGlobals())

const ai = () => new GeminiAssistant(() => KEY)

describe('GeminiAssistant', () => {
  it('asks the alias first and does not list models when it answers', async () => {
    fetchMock.mockResolvedValueOnce(ok('hola'))
    expect(await ai().complete('¿qué tal?')).toBe('hola')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(modelOf(fetchMock.mock.calls[0])).toBe('gemini-flash-latest')
  })

  it('sends the key in the header, never in the address', async () => {
    fetchMock.mockResolvedValueOnce(ok('hola'))
    await ai().complete('hola')
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).not.toContain(KEY)
    expect((init as RequestInit).headers).toMatchObject({ 'x-goog-api-key': KEY })
  })

  it('drops to another model when the first one is out of daily quota', async () => {
    fetchMock
      .mockResolvedValueOnce(fail(429))
      .mockResolvedValueOnce(models('gemini-flash-latest', 'gemini-2.5-flash'))
      .mockResolvedValueOnce(ok('desde el suplente'))
    expect(await ai().complete('hola')).toBe('desde el suplente')
    expect(modelOf(fetchMock.mock.calls[2])).toBe('gemini-2.5-flash')
  })

  it('drops to another model when the first one is overloaded', async () => {
    fetchMock
      .mockResolvedValueOnce(fail(503))
      .mockResolvedValueOnce(models('gemini-3.7-flash', 'gemini-2.5-flash'))
      .mockResolvedValueOnce(ok('desde el suplente'))
    expect(await ai().complete('hola')).toBe('desde el suplente')
    expect(modelOf(fetchMock.mock.calls[2])).toBe('gemini-3.7-flash')
  })

  it('remembers who answered, so the next question does not start on the spent one', async () => {
    const assistant = ai()
    fetchMock
      .mockResolvedValueOnce(fail(429))
      .mockResolvedValueOnce(models('gemini-2.5-flash'))
      .mockResolvedValueOnce(ok('uno'))
      .mockResolvedValueOnce(ok('dos'))
    await assistant.complete('hola')
    await assistant.complete('otra vez')
    expect(modelOf(fetchMock.mock.calls[3])).toBe('gemini-2.5-flash')
    // and it does not ask for the model list again
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })

  it('does not waste calls on a rejected key: that is not going to change per model', async () => {
    fetchMock.mockResolvedValueOnce(fail(401))
    await expect(ai().complete('hola')).rejects.toThrow(/no parece válida/)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('when everything is busy, says so instead of blaming the key', async () => {
    fetchMock
      .mockResolvedValueOnce(fail(429))
      .mockResolvedValueOnce(models('gemini-2.5-flash'))
      .mockResolvedValueOnce(fail(429))
    await expect(ai().complete('hola')).rejects.toThrow(/cuota/i)
  })

  it('keeps the original problem when the model list cannot be read', async () => {
    fetchMock.mockResolvedValueOnce(fail(503)).mockRejectedValueOnce(new Error('sin red'))
    await expect(ai().complete('hola')).rejects.toThrow(/saturado/i)
  })

  it('complains about an empty answer', async () => {
    fetchMock.mockResolvedValueOnce(ok('   '))
    await expect(ai().complete('hola')).rejects.toThrow(/vacía/)
  })

  it('refuses to call without a key', async () => {
    await expect(new GeminiAssistant(() => '').complete('hola')).rejects.toThrow(/Falta la clave/)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
