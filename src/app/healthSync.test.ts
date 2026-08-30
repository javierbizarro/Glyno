import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { HealthSample, HealthSource } from '../ports/health'
import { BACKFILL_DAYS, OVERLAP_DAYS, syncHealth, syncWindow } from './healthSync'
import { importHealthSamples } from './healthImport'

vi.mock('./healthImport', () => ({
  importHealthSamples: vi.fn(async () => ({ added: 2, updated: 1, ignored: 0, invalid: 0 })),
}))

const imported = vi.mocked(importHealthSamples)
const DAY = 86_400_000
const NOW = new Date('2026-08-30T14:00:00Z').getTime()

const store: Record<string, string> = {}
beforeEach(() => {
  vi.clearAllMocks()
  for (const k of Object.keys(store)) delete store[k]
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v
    },
    removeItem: (k: string) => delete store[k],
  })
})

const source = (samples: HealthSample[] = [], available = true): HealthSource & { read: ReturnType<typeof vi.fn> } => ({
  available: vi.fn(async () => available),
  request: vi.fn(async () => {}),
  read: vi.fn(async () => samples),
})

describe('syncWindow', () => {
  it('reaches back a year the first time: a diary that starts empty is worth filling', () => {
    expect(syncWindow(null, NOW)).toEqual({ from: NOW - BACKFILL_DAYS * DAY, to: NOW })
  })

  it('re-reads a few days on every later sync, because samples arrive late', () => {
    // a sensor dumps into Salud with delay: asking only for "since last time" loses them
    const last = NOW - 2 * DAY
    expect(syncWindow(last, NOW)).toEqual({ from: last - OVERLAP_DAYS * DAY, to: NOW })
  })

  it('never asks for a window that runs backwards', () => {
    const { from, to } = syncWindow(NOW + DAY, NOW)
    expect(from).toBeLessThanOrEqual(to)
  })
})

describe('syncHealth', () => {
  it('does nothing where there is no health store', async () => {
    const s = source([], false)
    expect(await syncHealth(s, NOW)).toBeNull()
    expect(s.read).not.toHaveBeenCalled()
  })

  it('reads the window and hands the samples to the diary pipeline', async () => {
    const samples = [{ kind: 'glucose', ts: '2026-08-30T08:10:00', value: 118, id: 'A' }]
    const r = await syncHealth(source(samples), NOW)
    expect(imported).toHaveBeenCalledWith(samples)
    expect(r).toEqual({ added: 2, updated: 1, ignored: 0, invalid: 0 })
  })

  it('keeps asking for the whole history until Salud actually gives something', async () => {
    // the automatic sync runs before the user has granted access, and a refusal looks
    // exactly like an empty store: marking the window then would lose the backfill
    await syncHealth(source([]), NOW)
    expect(store['glyno.health.lastSync']).toBeUndefined()
  })

  it('remembers when it last synced, so the next one is incremental', async () => {
    await syncHealth(source([{ kind: 'steps', date: '2026-08-30', value: 8734 }]), NOW)
    expect(syncWindow(Number(store['glyno.health.lastSync']), NOW)).toEqual({
      from: NOW - OVERLAP_DAYS * DAY,
      to: NOW,
    })
  })

  it('does not move the mark when reading blew up: the next try must cover the same window', async () => {
    const s = source()
    s.read.mockRejectedValue(new Error('boom'))
    await expect(syncHealth(s, NOW)).rejects.toThrow('boom')
    expect(store['glyno.health.lastSync']).toBeUndefined()
  })
})
