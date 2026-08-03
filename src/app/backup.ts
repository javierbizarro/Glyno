import { defaultProfile, type Entry, type Profile } from '../domain/types'
import { entries, profiles } from './container'

export async function buildBackup(p: Profile): Promise<string> {
  const all = await entries.all()
  return JSON.stringify({ app: 'glyno', version: 1, exportedAt: new Date().toISOString(), profile: p, entries: all })
}

export interface RestorePreview {
  count: number
  exportedAt: string
}

export function parseBackup(text: string): { preview: RestorePreview; data: { profile?: Profile; entries: Entry[] } } {
  const data = JSON.parse(text)
  if (data?.app !== 'glyno' || !Array.isArray(data.entries)) throw new Error('Ese fichero no parece una copia de Glyno.')
  return {
    preview: {
      count: data.entries.length,
      exportedAt: data.exportedAt ? new Date(data.exportedAt).toLocaleDateString('es-ES') : '¿?',
    },
    data,
  }
}

export async function restoreBackup(data: { profile?: Profile; entries: Entry[] }): Promise<Profile | null> {
  await entries.clear()
  await entries.bulkAdd(data.entries.map(({ id: _id, ...rest }) => rest as Entry))
  if (data.profile) {
    const restored = { ...defaultProfile, ...data.profile, onboarded: true }
    profiles.save(restored)
    return restored
  }
  return null
}

export async function buildCsv(p: Profile): Promise<{ csv: string; count: number }> {
  const rows = await entries.all()
  const esc = (s: unknown) => (s == null ? '' : `"${String(s).replace(/"/g, '""')}"`)
  const time = (ts: number) => new Date(ts).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  // status: out-of-range glucose readings (per the profile range) and blood pressure ≥140/90
  const status = (e: Entry): string => {
    if (e.kind === 'glucose' && e.value != null)
      return e.value < p.low ? 'BAJA' : e.value > p.high ? 'ALTA' : 'en rango'
    if (e.kind === 'bp' && e.sys && e.dia) return e.sys >= 140 || e.dia >= 90 ? 'ALTA' : 'normal'
    return ''
  }
  const csv = [
    'fecha;hora;tipo;valor;estado;sistolica;diastolica;etiqueta;hidratos_g;nota',
    ...rows.map(e =>
      [
        new Date(e.ts).toLocaleDateString('es-ES'),
        time(e.ts),
        e.kind,
        e.value ?? '',
        status(e),
        e.sys ?? '',
        e.dia ?? '',
        esc(e.label),
        e.carbs ?? '',
        esc(e.note),
      ].join(';'),
    ),
  ].join('\n')
  return { csv, count: rows.length }
}
