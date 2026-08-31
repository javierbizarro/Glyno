import { describe, expect, it, vi } from 'vitest'
import { saveThrough, type OutgoingFile } from './saveFile'

const file: OutgoingFile = { name: 'glyno-backup.json', text: '{}', mime: 'application/json' }

const sinks = () => ({
  toShareSheet: vi.fn(async () => {}),
  toDownloads: vi.fn(() => {}),
})

describe('saveThrough', () => {
  it('lets the browser download the file on the web', async () => {
    const s = sinks()
    expect(await saveThrough('web', file, s)).toBe('downloaded')
    expect(s.toDownloads).toHaveBeenCalledWith(file)
    expect(s.toShareSheet).not.toHaveBeenCalled()
  })

  it('never uses a download inside the app: WKWebView ignores it and nothing happens', async () => {
    for (const where of ['ios', 'android'] as const) {
      const s = sinks()
      expect(await saveThrough(where, file, s)).toBe('shared')
      expect(s.toDownloads).not.toHaveBeenCalled()
      expect(s.toShareSheet).toHaveBeenCalledWith(file)
    }
  })

  it('says nothing went wrong when the share sheet is dismissed', async () => {
    const s = { ...sinks(), toShareSheet: vi.fn(async () => { throw new Error('Share canceled') }) }
    expect(await saveThrough('ios', file, s)).toBe('shared')
  })

  it('reports failure when the browser refuses the download', async () => {
    const s = { ...sinks(), toDownloads: vi.fn(() => { throw new Error('no') }) }
    expect(await saveThrough('web', file, s)).toBe('failed')
  })
})
