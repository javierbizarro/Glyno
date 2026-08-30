import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Entry } from '../domain/types'
import { healthImportSummary, importHealthPayload, importHealthSamples } from './healthImport'
import { entries } from './container'

vi.mock('./container', () => ({
  entries: { bulkAdd: vi.fn(), byExtIds: vi.fn(), update: vi.fn(), between: vi.fn() },
}))

const bulkAdd = vi.mocked(entries.bulkAdd)
const byExtIds = vi.mocked(entries.byExtIds)
const update = vi.mocked(entries.update)
const between = vi.mocked(entries.between)

const at = (iso: string) => new Date(iso).getTime()

const payload = (samples: unknown[]) => JSON.stringify({ app: 'glyno', type: 'health', samples })

beforeEach(() => {
  vi.clearAllMocks()
  byExtIds.mockResolvedValue([])
  between.mockResolvedValue([])
  bulkAdd.mockResolvedValue()
  update.mockResolvedValue()
})

describe('importHealthPayload · payload shape', () => {
  it('rejects anything that is not a Glyno health payload, in plain Spanish', async () => {
    await expect(importHealthPayload('hola')).rejects.toThrow('No he reconocido ahí datos de Salud para Glyno.')
    await expect(importHealthPayload('{"foo":1}')).rejects.toThrow('No he reconocido ahí datos de Salud')
    await expect(importHealthPayload(payload([]).replace('glyno', 'otra'))).rejects.toThrow()
  })

  it('accepts an empty sample list and adds nothing', async () => {
    const r = await importHealthPayload(payload([]))
    expect(r).toEqual({ added: 0, updated: 0, merged: 0, ignored: 0, invalid: 0 })
    expect(bulkAdd).not.toHaveBeenCalled()
  })
})

describe('importHealthPayload · sample conversion', () => {
  it('converts a glucose sample: point timestamp, health source and derived extId', async () => {
    const r = await importHealthPayload(payload([{ kind: 'glucose', ts: '2026-08-04T08:05:00', value: 112 }]))
    expect(r.added).toBe(1)
    expect(bulkAdd).toHaveBeenCalledWith([
      {
        ts: at('2026-08-04T08:05:00'),
        kind: 'glucose',
        value: 112,
        source: 'health',
        extId: `health:glucose:${at('2026-08-04T08:05:00')}`,
      },
    ])
  })

  it('converts daily steps to a midday entry keyed by date', async () => {
    await importHealthPayload(payload([{ kind: 'steps', date: '2026-08-04', value: 9241 }]))
    expect(bulkAdd).toHaveBeenCalledWith([
      {
        ts: at('2026-08-04T12:00:00'),
        kind: 'steps',
        value: 9241,
        source: 'health',
        extId: 'health:steps:2026-08-04',
      },
    ])
  })

  it('converts a night of sleep to minutes on the morning it ended', async () => {
    await importHealthPayload(payload([{ kind: 'sleep', date: '2026-08-04', minutes: 412 }]))
    expect(bulkAdd).toHaveBeenCalledWith([
      {
        ts: at('2026-08-04T07:30:00'),
        kind: 'sleep',
        value: 412,
        source: 'health',
        extId: 'health:sleep:2026-08-04',
      },
    ])
  })

  it('converts a workout with optional label and distance, never calories', async () => {
    await importHealthPayload(
      payload([{ kind: 'exercise', ts: '2026-08-04T18:30:00', minutes: 42, label: 'Caminar', km: 3.42, kcal: 300 }]),
    )
    expect(bulkAdd).toHaveBeenCalledWith([
      {
        ts: at('2026-08-04T18:30:00'),
        kind: 'exercise',
        value: 42,
        label: 'Caminar',
        distanceKm: 3.4,
        source: 'health',
        extId: `health:exercise:${at('2026-08-04T18:30:00')}`,
      },
    ])
  })

  it('falls back to the generic label for workouts without one', async () => {
    await importHealthPayload(payload([{ kind: 'exercise', ts: '2026-08-04T18:30:00', minutes: 42 }]))
    const entry = bulkAdd.mock.calls[0][0][0] as Entry
    expect(entry.label).toBe('Ejercicio')
    expect(entry.distanceKm).toBeUndefined()
  })

  it('converts a daily weight keyed by date', async () => {
    await importHealthPayload(payload([{ kind: 'weight', date: '2026-08-04', value: 92.4 }]))
    expect(bulkAdd).toHaveBeenCalledWith([
      {
        ts: at('2026-08-04T08:00:00'),
        kind: 'weight',
        value: 92.4,
        source: 'health',
        extId: 'health:weight:2026-08-04',
      },
    ])
  })
})

describe('importHealthPayload · validation', () => {
  it('counts out-of-range or malformed samples as invalid without failing the batch', async () => {
    const r = await importHealthPayload(
      payload([
        { kind: 'glucose', ts: '2026-08-04T08:05:00', value: 700 }, // impossible reading
        { kind: 'steps', date: '2026-08-04', value: -5 },
        { kind: 'sleep', date: '2026-08-04', minutes: 2000 }, // more than 16 h
        { kind: 'weight', date: '2026-08-04', value: 500 },
        { kind: 'exercise', ts: '2026-08-04T18:30:00' }, // no minutes
        { kind: 'unknown', date: '2026-08-04', value: 1 },
        { kind: 'glucose', ts: 'not-a-date', value: 100 },
        { kind: 'glucose', ts: '2026-08-04T09:00:00', value: 104 }, // the only good one
      ]),
    )
    expect(r.invalid).toBe(7)
    expect(r.added).toBe(1)
  })
})

describe('importHealthPayload · dedupe by extId', () => {
  it('ignores samples whose extId already exists with the same value', async () => {
    byExtIds.mockResolvedValue([
      { id: 7, ts: at('2026-08-04T12:00:00'), kind: 'steps', value: 9241, extId: 'health:steps:2026-08-04' },
    ])
    const r = await importHealthPayload(payload([{ kind: 'steps', date: '2026-08-04', value: 9241 }]))
    expect(r).toEqual({ added: 0, updated: 0, merged: 0, ignored: 1, invalid: 0 })
    expect(bulkAdd).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it("updates daily aggregates whose value changed: today's steps grow through the day", async () => {
    byExtIds.mockResolvedValue([
      { id: 7, ts: at('2026-08-04T12:00:00'), kind: 'steps', value: 5100, extId: 'health:steps:2026-08-04' },
    ])
    const r = await importHealthPayload(payload([{ kind: 'steps', date: '2026-08-04', value: 9241 }]))
    expect(r.updated).toBe(1)
    expect(update).toHaveBeenCalledWith(7, { value: 9241 })
    expect(bulkAdd).not.toHaveBeenCalled()
  })

  it('never updates point samples (glucose, workouts): a repeated extId is just ignored', async () => {
    const ts = at('2026-08-04T08:05:00')
    byExtIds.mockResolvedValue([{ id: 3, ts, kind: 'glucose', value: 112, extId: `health:glucose:${ts}` }])
    const r = await importHealthPayload(payload([{ kind: 'glucose', ts: '2026-08-04T08:05:00', value: 108 }]))
    expect(r).toEqual({ added: 0, updated: 0, merged: 0, ignored: 1, invalid: 0 })
    expect(update).not.toHaveBeenCalled()
  })

  it('dedupes inside the same batch too: the shortcut may repeat a sample', async () => {
    const r = await importHealthPayload(
      payload([
        { kind: 'glucose', ts: '2026-08-04T08:05:00', value: 112 },
        { kind: 'glucose', ts: '2026-08-04T08:05:00', value: 112 },
      ]),
    )
    expect(r.added).toBe(1)
    expect(r.ignored).toBe(1)
  })
})

describe('importHealthPayload · plain-text format (what a simple Shortcut can build)', () => {
  const NOW = at('2026-08-04T15:00:00')
  const asText = (...lines: string[]) => ['glyno salud', ...lines].join('\n')

  it('parses the daily lines, with dates defaulting to today', async () => {
    const r = await importHealthPayload(asText('pasos 8734', 'sueño 6h35', 'peso 92,1'), NOW)
    expect(r.added).toBe(3)
    expect(bulkAdd).toHaveBeenCalledWith([
      { ts: at('2026-08-04T12:00:00'), kind: 'steps', value: 8734, source: 'health', extId: 'health:steps:2026-08-04' },
      { ts: at('2026-08-04T07:30:00'), kind: 'sleep', value: 395, source: 'health', extId: 'health:sleep:2026-08-04' },
      { ts: at('2026-08-04T08:00:00'), kind: 'weight', value: 92.1, source: 'health', extId: 'health:weight:2026-08-04' },
    ])
  })

  it('accepts an explicit date before the value, for the nightly automation pasted next morning', async () => {
    await importHealthPayload(asText('pasos 2026-08-03 10234', 'sueño 2026-08-03 390min'), NOW)
    const rows = bulkAdd.mock.calls[0][0] as Entry[]
    expect(rows[0]).toMatchObject({ value: 10234, extId: 'health:steps:2026-08-03' })
    expect(rows[1]).toMatchObject({ value: 390, extId: 'health:sleep:2026-08-03' })
  })

  it('understands sleep as XhYY, Xh or Nmin, and steps with thousands dots', async () => {
    await importHealthPayload(asText('sueño 7h', 'pasos 8.734'), NOW)
    const rows = bulkAdd.mock.calls[0][0] as Entry[]
    expect(rows[0]).toMatchObject({ kind: 'sleep', value: 420 })
    expect(rows[1]).toMatchObject({ kind: 'steps', value: 8734 })
  })

  it('parses detected activity minutes and daily cycling km', async () => {
    const r = await importHealthPayload(
      asText('actividad 45 min', 'actividad 2026-08-03 1 h 5 min', 'bici 12,4 km', 'bici 2026-08-03 2,9 km'),
      NOW,
    )
    expect(r.added).toBe(4)
    const rows = bulkAdd.mock.calls[0][0] as Entry[]
    expect(rows[0]).toMatchObject({ kind: 'activity', value: 45, extId: 'health:activity:2026-08-04' })
    expect(rows[1]).toMatchObject({ kind: 'activity', value: 65, extId: 'health:activity:2026-08-03' })
    expect(rows[2]).toMatchObject({ kind: 'cycling', value: 12.4, extId: 'health:cycling:2026-08-04' })
    expect(rows[3]).toMatchObject({ kind: 'cycling', value: 2.9 })
  })

  it('detects sleep durations that arrive in seconds and converts them', async () => {
    // HealthKit durations often print as raw seconds: 24.780 s = 413 min
    const r = await importHealthPayload(asText('sueño 24780 min', 'sueño 2026-08-03 24.780 min'), NOW)
    expect(r.added).toBe(2)
    const rows = bulkAdd.mock.calls[0][0] as Entry[]
    expect(rows[0]).toMatchObject({ kind: 'sleep', value: 413 })
    expect(rows[1]).toMatchObject({ kind: 'sleep', value: 413 })
  })

  it('tolerates what Shortcuts magic variables actually print: units and spaces', async () => {
    const r = await importHealthPayload(
      asText('pasos 8.734 pasos', 'sueño 6 h 52 min', 'sueño 2026-08-03 412 min', 'peso 92,1 kg'),
      NOW,
    )
    expect(r.added).toBe(4)
    const rows = bulkAdd.mock.calls[0][0] as Entry[]
    expect(rows[0]).toMatchObject({ kind: 'steps', value: 8734 })
    expect(rows[1]).toMatchObject({ kind: 'sleep', value: 412 })
    expect(rows[2]).toMatchObject({ kind: 'sleep', value: 412, extId: 'health:sleep:2026-08-03' })
    expect(rows[3]).toMatchObject({ kind: 'weight', value: 92.1 })
  })

  it('parses workouts however Shortcuts prints durations: spaced min, raw seconds or H:MM:SS', async () => {
    const r = await importHealthPayload(
      asText(
        'ejercicio 18:30 Caminata 42 min 3,42 km',
        'ejercicio 2026-08-03 07:15 Bici estática 2.520 s',
        'ejercicio 09:00 Correr 0:42:15 5,1 km',
      ),
      NOW,
    )
    expect(r.added).toBe(3)
    const rows = bulkAdd.mock.calls[0][0] as Entry[]
    expect(rows[0]).toMatchObject({ value: 42, label: 'Caminata', distanceKm: 3.4 })
    expect(rows[1]).toMatchObject({ ts: at('2026-08-03T07:15:00'), value: 42, label: 'Bici estática' })
    expect(rows[1].distanceKm).toBeUndefined()
    expect(rows[2]).toMatchObject({ value: 42, label: 'Correr', distanceKm: 5.1 })
  })

  it('parses glucose with time (date optional) and workouts with label, minutes and optional km', async () => {
    const r = await importHealthPayload(
      asText('glucosa 08:10 118', 'glucosa 2026-08-03 22:15 141', 'ejercicio 18:30 Bici estática 40min 3,2km'),
      NOW,
    )
    expect(r.added).toBe(3)
    const rows = bulkAdd.mock.calls[0][0] as Entry[]
    expect(rows[0]).toMatchObject({ kind: 'glucose', ts: at('2026-08-04T08:10:00'), value: 118 })
    expect(rows[1]).toMatchObject({ kind: 'glucose', ts: at('2026-08-03T22:15:00'), value: 141 })
    expect(rows[2]).toMatchObject({
      kind: 'exercise',
      ts: at('2026-08-04T18:30:00'),
      value: 40,
      label: 'Bici estática',
      distanceKm: 3.2,
    })
  })

  it('skips blank lines, tolerates spacing and counts gibberish as invalid', async () => {
    const r = await importHealthPayload(asText('', '  pasos   9000  ', 'cafeína 3 tazas', 'sueño mucho'), NOW)
    expect(r.added).toBe(1)
    expect(r.invalid).toBe(2)
  })

  it('rejects text without the glyno salud header', async () => {
    await expect(importHealthPayload('pasos 8734', NOW)).rejects.toThrow('No he reconocido ahí datos de Salud')
  })

  it('goes through the same dedupe as the JSON route', async () => {
    byExtIds.mockResolvedValue([
      { id: 7, ts: at('2026-08-04T12:00:00'), kind: 'steps', value: 5100, extId: 'health:steps:2026-08-04' },
    ])
    const r = await importHealthPayload(asText('pasos 8734'), NOW)
    expect(r.updated).toBe(1)
    expect(update).toHaveBeenCalledWith(7, { value: 8734 })
  })
})

describe('healthImportSummary', () => {
  it('celebrates new and updated entries', () => {
    expect(healthImportSummary({ added: 12, updated: 0, merged: 0, ignored: 3, invalid: 0 })).toBe(
      'De Salud: 12 registros nuevos.',
    )
    expect(healthImportSummary({ added: 12, updated: 2, merged: 0, ignored: 0, invalid: 0 })).toBe(
      'De Salud: 12 registros nuevos y 2 al día.',
    )
    expect(healthImportSummary({ added: 0, updated: 1, merged: 0, ignored: 5, invalid: 0 })).toBe(
      'De Salud: 1 al día.',
    )
    expect(healthImportSummary({ added: 1, updated: 1, merged: 0, ignored: 0, invalid: 0 })).toBe(
      'De Salud: 1 registro nuevo y 1 al día.',
    )
  })

  it('says out loud when Salud only confirmed what the user had already written', () => {
    expect(healthImportSummary({ added: 0, updated: 0, merged: 2, ignored: 0, invalid: 0 })).toBe(
      'De Salud: 2 que ya tenías apuntadas.',
    )
    expect(healthImportSummary({ added: 3, updated: 0, merged: 1, ignored: 0, invalid: 0 })).toBe(
      'De Salud: 3 registros nuevos y 1 que ya tenías apuntada.',
    )
  })

  it('says honestly when there was nothing new, mentioning skipped samples', () => {
    expect(healthImportSummary({ added: 0, updated: 0, merged: 0, ignored: 8, invalid: 0 })).toBe(
      'Nada nuevo: esos datos ya estaban en tu diario.',
    )
    expect(healthImportSummary({ added: 0, updated: 0, merged: 0, ignored: 0, invalid: 3 })).toBe(
      'No he podido entender esas muestras (3 descartadas).',
    )
  })
})

describe('importHealthSamples · the native bridge', () => {
  it('takes samples straight, with no payload to parse', async () => {
    const r = await importHealthSamples([{ kind: 'glucose', ts: '2026-08-30T08:10:00', value: 118 }])
    expect(r.added).toBe(1)
    expect(bulkAdd).toHaveBeenCalledWith([
      expect.objectContaining({ kind: 'glucose', value: 118, source: 'health' }),
    ])
  })

  it('keys a point sample on the id HealthKit gives it, not on its timestamp', async () => {
    // two readings can share a minute, and a sample can be corrected keeping its UUID
    await importHealthSamples([
      { kind: 'glucose', ts: '2026-08-30T08:10:00', value: 118, id: 'UUID-A' },
      { kind: 'glucose', ts: '2026-08-30T08:10:00', value: 142, id: 'UUID-B' },
    ])
    expect(bulkAdd).toHaveBeenCalledWith([
      expect.objectContaining({ value: 118, extId: 'health:glucose:UUID-A' }),
      expect.objectContaining({ value: 142, extId: 'health:glucose:UUID-B' }),
    ])
  })

  it('still keys daily totals on their date: the day is the identity, the sample is not', async () => {
    // the step count of today grows all day and must overwrite, whatever id it arrives with
    await importHealthSamples([{ kind: 'steps', date: '2026-08-30', value: 8734, id: 'UUID-C' }])
    expect(bulkAdd).toHaveBeenCalledWith([
      expect.objectContaining({ kind: 'steps', extId: 'health:steps:2026-08-30' }),
    ])
  })

  it('reads blood pressure, which the Shortcut route never could', async () => {
    const r = await importHealthSamples([
      { kind: 'bp', ts: '2026-08-30T09:00:00', sys: 138, dia: 84, id: 'UUID-D' },
    ])
    expect(r.added).toBe(1)
    expect(bulkAdd).toHaveBeenCalledWith([
      expect.objectContaining({
        kind: 'bp',
        sys: 138,
        dia: 84,
        source: 'health',
        extId: 'health:bp:UUID-D',
        ts: at('2026-08-30T09:00:00'),
      }),
    ])
  })

  it('discards implausible blood pressure instead of filing it', async () => {
    const r = await importHealthSamples([
      { kind: 'bp', ts: '2026-08-30T09:00:00', sys: 138 },
      { kind: 'bp', ts: '2026-08-30T09:00:00', sys: 400, dia: 84 },
      { kind: 'bp', ts: '2026-08-30T09:00:00', sys: 120, dia: 10 },
    ])
    expect(r).toEqual({ added: 0, updated: 0, merged: 0, ignored: 0, invalid: 3 })
    expect(bulkAdd).not.toHaveBeenCalled()
  })

  it('dedupes against what is already in the diary, by the id HealthKit gave', async () => {
    byExtIds.mockResolvedValue([
      { id: 7, ts: at('2026-08-30T08:10:00'), kind: 'glucose', value: 118, extId: 'health:glucose:UUID-A' },
    ] as Entry[])
    const r = await importHealthSamples([
      { kind: 'glucose', ts: '2026-08-30T08:10:00', value: 118, id: 'UUID-A' },
    ])
    expect(r).toEqual({ added: 0, updated: 0, merged: 0, ignored: 1, invalid: 0 })
    expect(bulkAdd).not.toHaveBeenCalled()
  })
})

describe('importHealthSamples · what the user already wrote down', () => {
  const own = (e: Partial<Entry>): Entry => ({
    id: 3,
    ts: at('2026-08-30T08:10:00'),
    kind: 'glucose',
    value: 137,
    note: 'ayunas',
    source: 'manual',
    ...e,
  })

  it('does not file a second row for a reading the user typed themselves', async () => {
    between.mockResolvedValue([own({})])
    const r = await importHealthSamples([
      { kind: 'glucose', ts: '2026-08-30T08:22:00', value: 137, id: 'UUID-A' },
    ])
    expect(r).toEqual({ added: 0, updated: 0, merged: 1, ignored: 0, invalid: 0 })
    expect(bulkAdd).not.toHaveBeenCalled()
    // their row survives untouched but takes Salud's id, so it is never claimed twice
    expect(update).toHaveBeenCalledWith(3, { extId: 'health:glucose:UUID-A' })
  })

  it('files a reading that is genuinely different, minutes apart or not', async () => {
    between.mockResolvedValue([own({})])
    const r = await importHealthSamples([
      { kind: 'glucose', ts: '2026-08-30T08:12:00', value: 152, id: 'UUID-B' },
    ])
    expect(r.added).toBe(1)
    expect(r.merged).toBe(0)
  })

  it('lets one hand-written row absorb only one sample', async () => {
    // two real readings of the same number: the second is a reading of its own
    between.mockResolvedValue([own({})])
    const r = await importHealthSamples([
      { kind: 'glucose', ts: '2026-08-30T08:11:00', value: 137, id: 'UUID-C' },
      { kind: 'glucose', ts: '2026-08-30T08:12:00', value: 137, id: 'UUID-D' },
    ])
    expect(r.merged).toBe(1)
    expect(r.added).toBe(1)
  })

  it('does not go looking through the diary when nothing could have been hand-written', async () => {
    await importHealthSamples([{ kind: 'steps', date: '2026-08-30', value: 8734 }])
    expect(between).not.toHaveBeenCalled()
  })
})
