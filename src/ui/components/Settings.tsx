import { useRef, useState } from 'react'
import { TYPE_LABEL, type DiabetesType, type Measurement, type Med, type Profile } from '../../domain/types'
import { seedDemo } from '../../app/demo'
import { buildBackup, buildCsv, parseBackup, restoreBackup } from '../../app/backup'
import { download } from '../format'

const KIND_LABEL: Record<Med['kind'], string> = {
  pill: 'Pastilla',
  basal: 'Insulina basal',
  bolus: 'Insulina rápida',
}

const today = () => new Date().toISOString().slice(0, 10)

export function Settings({ profile, onSave }: { profile: Profile; onSave: (p: Profile) => void }) {
  const p = profile
  const set = (patch: Partial<Profile>) => onSave({ ...p, ...patch })
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')

  const flash = (m: string) => {
    setMsg(m)
    setTimeout(() => setMsg(''), 3500)
  }

  const exportCsv = async () => {
    const { csv, count } = await buildCsv()
    download(`glyno-diario-${today()}.csv`, new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    flash(`CSV exportado (${count} registros).`)
  }

  const exportBackup = async () => {
    const json = await buildBackup(p)
    download(`glyno-backup-${today()}.json`, new Blob([json], { type: 'application/json' }))
    flash('Copia creada. Guárdala en iCloud/Drive.')
  }

  const importBackup = async (file: File) => {
    try {
      const { preview, data } = parseBackup(await file.text())
      if (!confirm(`Se reemplazará TODO por la copia del ${preview.exportedAt} (${preview.count} registros). ¿Continuar?`)) return
      const restored = await restoreBackup(data)
      if (restored) onSave(restored)
      flash('Copia restaurada.')
    } catch (e) {
      flash(e instanceof Error ? e.message : 'No se pudo leer el fichero.')
    }
  }

  return (
    <>
      <h1>Ajustes</h1>
      {msg && (
        <div className="card" style={{ borderColor: 'var(--green)', background: 'var(--green-soft)' }}>
          <span className="small">{msg}</span>
        </div>
      )}

      <div className="card stack">
        <span className="label">Perfil</span>
        <div className="stack">
          <span className="label">Nombre</span>
          <input type="text" value={p.name} onChange={e => set({ name: e.target.value })} />
        </div>
        <div className="row">
          <div className="stack" style={{ flex: 1 }}>
            <span className="label">Diabetes</span>
            <select value={p.type} onChange={e => set({ type: e.target.value as DiabetesType })}>
              {(Object.keys(TYPE_LABEL) as DiabetesType[]).map(t => (
                <option key={t} value={t}>
                  {TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </div>
          <div className="stack" style={{ flex: 1 }}>
            <span className="label">Medición</span>
            <select value={p.measurement} onChange={e => set({ measurement: e.target.value as Measurement })}>
              <option value="meter">Glucómetro</option>
              <option value="sensor">Sensor</option>
            </select>
          </div>
        </div>
        <div className="wrap">
          {(
            [
              ['basal', 'Insulina basal'],
              ['bolus', 'Insulina rápida'],
              ['pills', 'Pastillas'],
              ['hypertension', 'Hipertensión'],
            ] as ['basal' | 'bolus' | 'pills' | 'hypertension', string][]
          ).map(([k, lbl]) => (
            <button key={k} className={`chip ${p[k] ? 'on' : ''}`} onClick={() => set({ [k]: !p[k] } as Partial<Profile>)}>
              {lbl}
            </button>
          ))}
        </div>
        <div className="row">
          <div className="stack" style={{ flex: 1 }}>
            <span className="label">Rango mín.</span>
            <input type="number" inputMode="numeric" value={p.low} onChange={e => set({ low: Number(e.target.value) })} />
          </div>
          <div className="stack" style={{ flex: 1 }}>
            <span className="label">Rango máx.</span>
            <input type="number" inputMode="numeric" value={p.high} onChange={e => set({ high: Number(e.target.value) })} />
          </div>
        </div>
      </div>

      <MedsEditor p={p} set={set} />

      <div className="card stack">
        <span className="label">Sobre ti (opcional)</span>
        <p className="muted small">Ayudan a Glyno a afinar el contexto (edad, IMC). No se usan para ajustar tus rangos.</p>
        <div className="row">
          <div className="stack" style={{ flex: 1 }}>
            <span className="label">Año de nacimiento</span>
            <input
              type="number"
              inputMode="numeric"
              placeholder="1980"
              value={p.birthYear ?? ''}
              onChange={e => set({ birthYear: e.target.value ? Number(e.target.value) : undefined })}
            />
          </div>
          <div className="stack" style={{ flex: 1 }}>
            <span className="label">Altura (cm)</span>
            <input
              type="number"
              inputMode="numeric"
              placeholder="175"
              value={p.heightCm ?? ''}
              onChange={e => set({ heightCm: e.target.value ? Number(e.target.value) : undefined })}
            />
          </div>
        </div>
        <p className="muted small">El peso se apunta en el diario (botón ⚖️), para ver su evolución.</p>
      </div>

      <div className="card stack">
        <span className="label">Glyno IA</span>
        <p className="muted small">
          Clave gratuita de Google AI Studio (aistudio.google.com → «Get API key»). Se guarda solo en tu
          dispositivo y se usa únicamente para las valoraciones y la foto del plato.
        </p>
        <input
          type="password"
          placeholder="Clave de la API de Gemini"
          value={p.geminiKey}
          onChange={e => set({ geminiKey: e.target.value.trim() })}
        />
      </div>

      <div className="card stack">
        <span className="label">Tus datos</span>
        <button className="btn ghost" onClick={exportBackup}>
          Crear copia de seguridad (JSON)
        </button>
        <button className="btn ghost" onClick={() => fileRef.current?.click()}>
          Restaurar copia de seguridad
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={e => {
            const f = e.target.files?.[0]
            if (f) importBackup(f)
            e.target.value = ''
          }}
        />
        <button className="btn ghost" onClick={exportCsv}>
          Exportar CSV (para tu médico)
        </button>
        <button className="btn ghost" onClick={async () => (await seedDemo(p), flash('14 días de ejemplo cargados.'))}>
          Cargar datos de ejemplo
        </button>
        <button
          className="btn ghost"
          style={{ color: 'var(--red)', borderColor: 'var(--red)' }}
          onClick={() => {
            if (confirm('Se borrará TODO: perfil y diario. ¿Seguro? (Haz antes una copia si dudas)'))
              location.href = '/?reset'
          }}
        >
          Borrar todo y empezar de cero
        </button>
      </div>

      <div className="card stack">
        <span className="label">Acerca de Glyno</span>
        <p className="muted small">
          v0.1 · Tus datos viven en este dispositivo y no salen de aquí (salvo lo que tú envíes a la IA
          con tu clave). Glyno no da consejo médico ni pautas de medicación: para eso, siempre tu equipo
          sanitario.
        </p>
      </div>
    </>
  )
}

function MedsEditor({ p, set }: { p: Profile; set: (patch: Partial<Profile>) => void }) {
  const kinds = (
    [
      ['pill', p.pills],
      ['basal', p.basal],
      ['bolus', p.bolus],
    ] as [Med['kind'], boolean][]
  )
    .filter(([, on]) => on)
    .map(([k]) => k)

  const [name, setName] = useState('')
  const [dose, setDose] = useState('')
  const [kind, setKind] = useState<Med['kind']>(kinds[0] ?? 'pill')

  if (!kinds.length && !p.meds.length) return null

  const add = () => {
    if (!name.trim()) return
    set({ meds: [...p.meds, { name: name.trim(), dose: dose.trim() || undefined, kind: kinds.includes(kind) ? kind : kinds[0] ?? 'pill' }] })
    setName('')
    setDose('')
  }

  return (
    <div className="card stack">
      <span className="label">Botiquín (pauta fija)</span>
      {p.meds.map((m, i) => (
        <div className="row between" key={i}>
          <span style={{ fontSize: 14.5 }}>
            💊 {m.name}
            {m.dose ? ` · ${m.dose}` : ''} <span className="muted small">({KIND_LABEL[m.kind]})</span>
          </span>
          <button className="chip" onClick={() => set({ meds: p.meds.filter((_, j) => j !== i) })}>
            Quitar
          </button>
        </div>
      ))}
      {kinds.length > 1 && (
        <div className="wrap">
          {kinds.map(k => (
            <button key={k} className={`chip ${kind === k ? 'on' : ''}`} onClick={() => setKind(k)}>
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>
      )}
      <div className="row">
        <input type="text" placeholder="Nombre" value={name} onChange={e => setName(e.target.value)} style={{ flex: 2 }} />
        <input type="text" placeholder="Dosis" value={dose} onChange={e => setDose(e.target.value)} style={{ flex: 1.2 }} />
        <button className="btn small" disabled={!name.trim()} onClick={add}>
          Añadir
        </button>
      </div>
    </div>
  )
}
