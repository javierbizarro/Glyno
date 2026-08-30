import { describe, expect, it } from 'vitest'
import { orderModels } from './geminiModels'

const PRIMARY = 'gemini-flash-latest'

describe('orderModels', () => {
  it('keeps the model we always start with in front', () => {
    const out = orderModels(['gemini-2.5-flash', PRIMARY, 'gemini-3.6-flash'], PRIMARY)
    expect(out[0]).toBe(PRIMARY)
  })

  it('drops the "models/" prefix the API returns', () => {
    expect(orderModels(['models/gemini-3.7-flash'], PRIMARY)).toEqual(['gemini-3.7-flash'])
  })

  it('puts the newest version first: a spent quota is per model, so order decides who answers', () => {
    const out = orderModels(['gemini-2.5-flash', 'gemini-3.7-flash', 'gemini-3.6-flash'], PRIMARY)
    expect(out).toEqual(['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-2.5-flash'])
  })

  it('leaves the lite models for the end: they answer, but they write worse', () => {
    const out = orderModels(['gemini-2.5-flash-lite', 'gemini-2.5-flash'], PRIMARY)
    expect(out).toEqual(['gemini-2.5-flash', 'gemini-2.5-flash-lite'])
  })

  it('leaves previews behind anything stable', () => {
    const out = orderModels(['gemini-3.7-flash-preview-11-2026', 'gemini-2.5-flash'], PRIMARY)
    expect(out).toEqual(['gemini-2.5-flash', 'gemini-3.7-flash-preview-11-2026'])
  })

  it('ignores what cannot write us a text', () => {
    const out = orderModels(
      [
        'gemini-2.5-flash',
        'gemini-2.5-flash-image',
        'gemini-2.5-flash-native-audio',
        'gemini-live-2.5-flash',
        'text-embedding-004',
        'gemini-2.5-pro',
      ],
      PRIMARY,
    )
    expect(out).toEqual(['gemini-2.5-flash'])
  })

  it('never repeats a model', () => {
    const out = orderModels([PRIMARY, 'models/' + PRIMARY, 'gemini-2.5-flash'], PRIMARY)
    expect(out).toEqual([PRIMARY, 'gemini-2.5-flash'])
  })

  it('survives an empty list', () => {
    expect(orderModels([], PRIMARY)).toEqual([])
  })
})
