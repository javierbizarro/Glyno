import { useState } from 'react'
import { MOMENTS, PRESET_TAGS, type Entry, type Profile } from '../../domain/types'
import { rangeOf } from '../../domain/glucose'
import { daysAgo } from '../../domain/time'
import { entries } from '../../app/container'
import { useWatch } from '../hooks'
import { fmtDayLong, fmtTime, greeting, RANGE_LABEL, RANGE_VAR, timeAgo } from '../format'
import { Mascot3D } from './Mascot3D'
import { InstallHint } from './InstallHint'

type Sheet = 'glucose' | 'bp' | 'insulin' | 'meal' | 'exercise' | 'tag' | 'weight' | null

const KIND_ICO: Record<string, string> = {
  glucose: '🩸',
  bp: '🫀',
  insulin: '💉',
  med: '💊',
  meal: '🍽️',
  exercise: '👟',
  tag: '🏷️',
  weight: '⚖️',
}

function entryText(e: Entry): string {
  switch (e.kind) {
    case 'glucose': return `${e.value} mg/dl${e.note ? ` · ${e.note}` : ''}`
    case 'bp': return `${e.sys}/${e.dia} mmHg`
    case 'insulin': return `${e.value} U ${e.label ?? ''}`
    case 'med': return e.label ?? 'Medicación'
    case 'meal': return `${e.label}${e.carbs ? ` · ${e.carbs} g HC` : ''}`
    case 'exercise': return `${e.label ?? 'Ejercicio'} · ${e.value} min`
    case 'tag': return e.label ?? ''
    case 'weight': return `${e.value} kg`
    default: return ''
  }
}

export function Today({ profile }: { profile: Profile }) {
  const [sheet, setSheet] = useState<Sheet>(null)

  const todayAsc = useWatch(() => entries.watchSince(daysAgo(0)), [])
  // el diario se lee de más reciente a más antiguo
  const todayEntries = todayAsc ? [...todayAsc].reverse() : undefined
  const lastGlucose = useWatch(() => entries.watchLastByKind('glucose'), [])

  const quick: { key: Sheet; ico: string; label: string; show: boolean }[] = [
    { key: 'glucose', ico: '🩸', label: 'Glucemia', show: true },
    { key: 'bp', ico: '🫀', label: 'Tensión', show: profile.hypertension },
    { key: 'insulin', ico: '💉', label: 'Insulina rápida', show: profile.bolus },
    { key: 'meal', ico: '🍽️', label: 'Comida', show: true },
    { key: 'exercise', ico: '👟', label: 'Ejercicio', show: true },
    { key: 'weight', ico: '⚖️', label: 'Peso', show: true },
    { key: 'tag', ico: '🏷️', label: 'Contexto', show: true },
  ]

  return (
    <>
      <div className="row between" style={{ gap: 10 }}>
        <div>
          <span className="label">{fmtDayLong(Date.now())}</span>
          <h1>
            {greeting()}, {profile.name}
          </h1>
        </div>
        <Mascot3D size={104} />
      </div>

      <div className="card">
        <div className="row between">
          <span className="label">Última glucemia</span>
          {lastGlucose?.value != null && (
            <span className={`pill ${rangeOf(lastGlucose.value, profile)}`}>
              {RANGE_LABEL[rangeOf(lastGlucose.value, profile)]}
            </span>
          )}
        </div>
        {lastGlucose?.value != null ? (
          <div className="row" style={{ alignItems: 'baseline', gap: 8, marginTop: 6 }}>
            <span className="bignum" style={{ color: RANGE_VAR[rangeOf(lastGlucose.value, profile)] }}>
              {lastGlucose.value}
            </span>
            <span className="muted">
              mg/dl · {timeAgo(lastGlucose.ts)}
              {lastGlucose.note ? ` · ${lastGlucose.note}` : ''}
            </span>
          </div>
        ) : (
          <p className="muted" style={{ marginTop: 8 }}>
            Aún no hay ninguna. Apunta la primera con el botón de abajo.
          </p>
        )}
      </div>

      <div className="quick">
        {quick.filter(q => q.show).map(q => (
          <button key={q.key} onClick={() => setSheet(q.key)}>
            <span className="ico">{q.ico}</span>
            {q.label}
          </button>
        ))}
      </div>

      <div>
        <span className="label">Hoy</span>
        <div className="card" style={{ marginTop: 8, padding: '4px 16px' }}>
          {todayEntries?.length ? (
            todayEntries.map(e => (
              <div className="entry-row" key={e.id}>
                <span className="entry-ico">{KIND_ICO[e.kind]}</span>
                <span style={{ flex: 1, fontSize: 14.5 }}>{entryText(e)}</span>
                <span className="muted small">{fmtTime(e.ts)}</span>
              </div>
            ))
          ) : (
            <p className="muted" style={{ padding: '14px 0' }}>
              Nada apuntado todavía hoy.
            </p>
          )}
        </div>
      </div>

      <InstallHint />

      {sheet && <QuickSheet kind={sheet} profile={profile} onClose={() => setSheet(null)} />}
    </>
  )
}

function QuickSheet({ kind, profile, onClose }: { kind: Exclude<Sheet, null>; profile: Profile; onClose: () => void }) {
  const [value, setValue] = useState('')
  const [extra, setExtra] = useState('')   // nota/momento · dia · tipo insulina · hidratos · minutos
  const [label, setLabel] = useState('')

  const add = async (e: Entry) => {
    await entries.add(e)
    onClose()
  }

  const num = Number(value)

  const save = () => {
    const ts = Date.now()
    if (kind === 'glucose' && num > 20 && num < 600) add({ ts, kind, value: num, note: extra || undefined })
    if (kind === 'bp' && num > 60 && Number(extra) > 30) add({ ts, kind, sys: num, dia: Number(extra) })
    if (kind === 'insulin' && num > 0 && num < 100) add({ ts, kind, value: num, label: 'bolo' })
    if (kind === 'meal' && label.trim())
      add({ ts, kind, label: label.trim(), carbs: num > 0 ? num : undefined })
    if (kind === 'exercise' && num > 0)
      add({ ts, kind, value: num, label: label.trim() || 'Ejercicio' })
    if (kind === 'weight' && num >= 30 && num <= 300) add({ ts, kind, value: num })
  }

  const valid =
    (kind === 'glucose' && num > 20 && num < 600) ||
    (kind === 'bp' && num > 60 && Number(extra) > 30) ||
    (kind === 'insulin' && num > 0 && num < 100) ||
    (kind === 'meal' && !!label.trim()) ||
    (kind === 'exercise' && num > 0) ||
    (kind === 'weight' && num >= 30 && num <= 300)

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        {kind === 'glucose' && (
          <>
            <h3>Glucemia</h3>
            <input
              className="bignum"
              type="number"
              inputMode="decimal"
              placeholder="120"
              autoFocus
              value={value}
              onChange={e => setValue(e.target.value)}
            />
            <div className="wrap">
              {MOMENTS.map(m => (
                <button key={m} className={`chip ${extra === m ? 'on' : ''}`} onClick={() => setExtra(extra === m ? '' : m)}>
                  {m}
                </button>
              ))}
            </div>
          </>
        )}

        {kind === 'bp' && (
          <>
            <h3>Tensión arterial</h3>
            <div className="row">
              <div className="stack" style={{ flex: 1 }}>
                <span className="label">Alta (sistólica)</span>
                <input type="number" inputMode="numeric" placeholder="130" autoFocus value={value} onChange={e => setValue(e.target.value)} />
              </div>
              <div className="stack" style={{ flex: 1 }}>
                <span className="label">Baja (diastólica)</span>
                <input type="number" inputMode="numeric" placeholder="80" value={extra} onChange={e => setExtra(e.target.value)} />
              </div>
            </div>
          </>
        )}

        {kind === 'insulin' && (
          <>
            <h3>Insulina rápida</h3>
            <p className="muted small">
              La basal y las pastillas son tu pauta fija — no hace falta apuntarlas cada día.
            </p>
            <input
              className="bignum"
              type="number"
              inputMode="decimal"
              placeholder="Unidades"
              autoFocus
              value={value}
              onChange={e => setValue(e.target.value)}
            />
          </>
        )}

        {kind === 'meal' && (
          <>
            <h3>Comida</h3>
            <input type="text" placeholder="¿Qué has comido?" autoFocus value={label} onChange={e => setLabel(e.target.value)} />
            <div className="stack">
              <span className="label">Hidratos (g) — opcional</span>
              <input type="number" inputMode="numeric" placeholder="45" value={value} onChange={e => setValue(e.target.value)} />
            </div>
            <p className="muted small">En la pestaña Comida, Glyno puede estimar los hidratos con una foto.</p>
          </>
        )}

        {kind === 'exercise' && (
          <>
            <h3>Ejercicio</h3>
            <input type="text" placeholder="Caminar, bici, pesas…" autoFocus value={label} onChange={e => setLabel(e.target.value)} />
            <div className="stack">
              <span className="label">Minutos</span>
              <input type="number" inputMode="numeric" placeholder="30" value={value} onChange={e => setValue(e.target.value)} />
            </div>
          </>
        )}

        {kind === 'weight' && (
          <>
            <h3>Peso</h3>
            <input
              className="bignum"
              type="number"
              inputMode="decimal"
              step="0.1"
              placeholder="kg"
              autoFocus
              value={value}
              onChange={e => setValue(e.target.value)}
            />
            <p className="muted small">Con pesarte una vez por semana, Glyno ya puede ver la tendencia.</p>
          </>
        )}

        {kind === 'tag' && (
          <>
            <h3>Contexto</h3>
            <p className="muted small">
              Cosas que mueven la glucosa y explican los días raros. Toca una y queda apuntada.
            </p>
            <div className="wrap">
              {PRESET_TAGS.map(t => (
                <button key={t} className="chip" onClick={() => add({ ts: Date.now(), kind: 'tag', label: t })}>
                  {t}
                </button>
              ))}
            </div>
            <div className="row">
              <input type="text" placeholder="Otra…" value={label} onChange={e => setLabel(e.target.value)} />
              <button
                className="btn small"
                disabled={!label.trim()}
                onClick={() => add({ ts: Date.now(), kind: 'tag', label: label.trim() })}
              >
                Añadir
              </button>
            </div>
          </>
        )}

        {kind !== 'tag' && (
          <div className="row">
            <button className="btn ghost" style={{ flex: 1 }} onClick={onClose}>
              Cancelar
            </button>
            <button className="btn" style={{ flex: 2 }} disabled={!valid} onClick={save}>
              Guardar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
