import { useRef, useState } from 'react'
import { MOMENTS, PRESET_TAGS, type Entry, type Profile } from '../../domain/types'
import { rangeOf } from '../../domain/glucose'
import { daysAgo } from '../../domain/time'
import { mealMoment, suggestMoment, usualDoses, usualExercises, usualMeals } from '../../domain/meals'
import { dueWeeklyMeds } from '../../domain/medication'
import { movementState, WEEKLY_TARGET_MIN } from '../../domain/movement'
import { entries } from '../../app/container'
import { useWatch } from '../hooks'
import { fmtDayLong, fmtTime, greeting, RANGE_LABEL, RANGE_VAR, timeAgo } from '../format'
import { entryText, KIND_ICO } from '../entryDisplay'
import { Mascot3D } from './Mascot3D'
import { InstallHint } from './InstallHint'
import { DeleteEntrySheet } from './DeleteEntrySheet'

type Sheet = 'glucose' | 'bp' | 'insulin' | 'meal' | 'exercise' | 'tag' | 'weight' | null

/** what a context tag can explain: the numbers that come out strange, and what you ate */
const CONTEXT_KINDS: Sheet[] = ['glucose', 'bp', 'meal']

export function Today({ profile }: { profile: Profile }) {
  const [sheet, setSheet] = useState<Sheet>(null)
  const [toDelete, setToDelete] = useState<Entry | null>(null)

  // 30 days: needed to learn what the user usually logs and offer it in one tap
  const recent = useWatch(() => entries.watchSince(daysAgo(29)), [])
  // the diary is read from newest to oldest
  const todayEntries = recent ? recent.filter(e => e.ts >= daysAgo(0)).reverse() : undefined
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

      {/* someone who doesn't measure glucose shouldn't be reminded it's missing */}
      {(lastGlucose?.value != null || profile.measurement !== 'none') && (
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
      )}

      {recent && <WeeklyMedCard profile={profile} recent={recent} />}

      <div className="quick" data-tour="quick">
        {quick.filter(q => q.show).map(q => (
          <button key={q.key} onClick={() => setSheet(q.key)}>
            <span className="ico">{q.ico}</span>
            {q.label}
          </button>
        ))}
      </div>

      {recent && <MovementCard profile={profile} recent={recent} />}

      <InstallHint />

      <div>
        <span className="label">Hoy</span>
        <div className="card" style={{ marginTop: 8, padding: '4px 16px' }}>
          {todayEntries?.length ? (
            todayEntries.map(e => (
              <button className="entry-row" key={e.id} onClick={() => setToDelete(e)} title="Tocar para borrar">
                <span className="entry-ico">{KIND_ICO[e.kind]}</span>
                <span style={{ flex: 1, fontSize: 14.5 }}>{entryText(e)}</span>
                <span className="muted small">{fmtTime(e.ts)}</span>
              </button>
            ))
          ) : (
            <p className="muted" style={{ padding: '14px 0' }}>
              Nada apuntado todavía hoy.
            </p>
          )}
        </div>
      </div>

      {sheet && (
        <QuickSheet kind={sheet} profile={profile} recent={recent ?? []} onClose={() => setSheet(null)} />
      )}
      {toDelete && <DeleteEntrySheet entry={toDelete} onClose={() => setToDelete(null)} />}
    </>
  )
}

function WeeklyMedCard({ profile, recent }: { profile: Profile; recent: Entry[] }) {
  const due = dueWeeklyMeds(profile.meds, recent)
  if (!due.length) return null

  const log = (name: string) =>
    entries.add({ ts: Date.now(), kind: 'med', label: name, note: 'pauta semanal' })

  return (
    <div className="card stack">
      <span className="label">Medicación semanal</span>
      {due.map(m => (
        <div className="row between" key={m.name}>
          <span style={{ fontSize: 14.5 }}>
            Hoy toca <strong>{m.name}</strong>
            {m.dose ? ` (${m.dose})` : ''}
          </span>
          <button className="btn ghost small" onClick={() => log(m.name)}>
            ✓ Ya está
          </button>
        </div>
      ))}
    </div>
  )
}

function MovementCard({ profile, recent }: { profile: Profile; recent: Entry[] }) {
  const state = movementState(profile, recent)
  if (!state.nudge && state.activeDays === 0) return null

  const usual = usualExercises(recent)[0]
  const logWalk = () =>
    entries.add({ ts: Date.now(), kind: 'exercise', value: 15, label: usual?.label ?? 'Caminar' })

  return (
    <div className="card stack">
      <div className="row between">
        <span className="label">Movimiento</span>
        <span className="muted small">{state.activeDays} de 7 días</span>
      </div>
      {state.nudge && <p className="small" style={{ lineHeight: 1.55 }}>{state.nudge}</p>}
      {state.weekMinutes > 0 && (
        <p className="muted small">
          Esta semana: {state.weekMinutes} de los {WEEKLY_TARGET_MIN} min de actividad que se
          recomiendan.
        </p>
      )}
      {!state.movedToday && (
        <button className="btn ghost small" onClick={logWalk}>
          👟 Apuntar 15 min de paseo
        </button>
      )}
    </div>
  )
}

function QuickSheet({
  kind,
  profile,
  recent,
  onClose,
}: {
  kind: Exclude<Sheet, null>
  profile: Profile
  recent: Entry[]
  onClose: () => void
}) {
  const moment = mealMoment(Date.now())
  const lastWeight = [...recent].reverse().find(e => e.kind === 'weight')
  const usualForMoment = usualMeals(recent, moment, 4)
  const frequentMeals = usualForMoment.length ? usualForMoment : usualMeals(recent, undefined, 4)

  const [value, setValue] = useState(
    // weight barely changes between weigh-ins: start from the last one and adjust
    kind === 'weight' && lastWeight?.value ? String(lastWeight.value) : '',
  )
  const [extra, setExtra] = useState(kind === 'glucose' ? suggestMoment(recent) : '')
  const [label, setLabel] = useState('')
  // context written on the reading itself: the moment you see a strange number is the
  // moment you know why
  const [tags, setTags] = useState<string[]>([])
  const [askTags, setAskTags] = useState(false)
  // logging something late must not stamp it with "now": the diary time drives every
  // pattern (meal moments, post-meal walk, day tables), so the hour is editable
  const [time, setTime] = useState(() => new Date().toTimeString().slice(0, 5))
  const autoMoment = useRef(kind === 'glucose' ? suggestMoment(recent) : '')

  const stamp = () => {
    const [h, m] = time.split(':').map(Number)
    const d = new Date()
    if (Number.isFinite(h) && Number.isFinite(m)) d.setHours(h, m, 0, 0)
    // a future hour today makes no sense: it was a typo, clamp to now
    return Math.min(d.getTime(), Date.now())
  }

  const changeTime = (t: string) => {
    setTime(t)
    if (kind !== 'glucose') return
    // the pre-selected moment follows the corrected hour, but never overrides a manual pick
    const [h, m] = t.split(':').map(Number)
    if (!Number.isFinite(h) || !Number.isFinite(m)) return
    const d = new Date()
    d.setHours(h, m, 0, 0)
    const suggested = suggestMoment(recent, Math.min(d.getTime(), Date.now()))
    if (extra === autoMoment.current) setExtra(suggested)
    autoMoment.current = suggested
  }

  const add = async (e: Entry) => {
    await entries.add(e)
    onClose()
  }

  const num = Number(value)

  const save = () => {
    const ts = stamp()
    const ctx = tags.length ? tags : undefined
    if (kind === 'glucose' && num > 20 && num < 600) add({ ts, kind, value: num, note: extra || undefined, tags: ctx })
    if (kind === 'bp' && num > 60 && Number(extra) > 30) add({ ts, kind, sys: num, dia: Number(extra), tags: ctx })
    if (kind === 'insulin' && num > 0 && num < 100) add({ ts, kind, value: num, label: 'bolo' })
    if (kind === 'meal' && label.trim())
      add({ ts, kind, label: label.trim(), carbs: num > 0 ? num : undefined, tags: ctx })
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

  // a reading out of range asks for its reason by itself: that is where context is worth most
  const odd =
    (kind === 'glucose' && num > 20 && num < 600 && (num < profile.low || num > profile.high)) ||
    (kind === 'bp' && (num >= 140 || Number(extra) >= 90))
  const open = askTags || odd || tags.length > 0

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
            {usualDoses(recent, moment).length > 0 && (
              <div className="wrap">
                {usualDoses(recent, moment).map(d => (
                  <button
                    key={d.value}
                    className="chip"
                    onClick={() => add({ ts: stamp(), kind: 'insulin', value: d.value, label: 'bolo' })}
                  >
                    {d.value} U
                  </button>
                ))}
              </div>
            )}
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
            {frequentMeals.length > 0 && (
              <>
                <span className="label">Lo que sueles tomar</span>
                <div className="wrap">
                  {frequentMeals.map(m => (
                    <button
                      key={m.label}
                      className="chip"
                      onClick={() =>
                        add({ ts: stamp(), kind: 'meal', label: m.label, carbs: m.carbs ?? undefined })
                      }
                    >
                      {m.label}
                      {m.carbs ? ` · ${m.carbs} g` : ''}
                    </button>
                  ))}
                </div>
              </>
            )}
            <input type="text" placeholder="¿Qué has comido?" value={label} onChange={e => setLabel(e.target.value)} />
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
            {usualExercises(recent).length > 0 && (
              <div className="wrap">
                {usualExercises(recent).map(x => (
                  <button
                    key={x.label}
                    className="chip"
                    onClick={() =>
                      add({ ts: stamp(), kind: 'exercise', value: x.minutes, label: x.label })
                    }
                  >
                    {x.label} · {x.minutes} min
                  </button>
                ))}
              </div>
            )}
            <input type="text" placeholder="Caminar, bici, pesas…" value={label} onChange={e => setLabel(e.target.value)} />
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
                <button key={t} className="chip" onClick={() => add({ ts: stamp(), kind: 'tag', label: t })}>
                  {t}
                </button>
              ))}
            </div>
            <div className="row">
              <input type="text" placeholder="Otra…" value={label} onChange={e => setLabel(e.target.value)} />
              <button
                className="btn small"
                disabled={!label.trim()}
                onClick={() => add({ ts: stamp(), kind: 'tag', label: label.trim() })}
              >
                Añadir
              </button>
            </div>
          </>
        )}

        {CONTEXT_KINDS.includes(kind) && (
          <div className="stack" style={{ gap: 8 }}>
            {open ? (
              <>
                <span className="label" style={odd ? { color: 'var(--amber)' } : undefined}>
                  {odd ? '¿Algo que lo explique?' : 'Contexto (opcional)'}
                </span>
                <div className="wrap">
                  {PRESET_TAGS.map(t => (
                    <button
                      key={t}
                      className={`chip ${tags.includes(t) ? 'on' : ''}`}
                      onClick={() => setTags(tags.includes(t) ? tags.filter(x => x !== t) : [...tags, t])}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <button className="btn ghost small" style={{ alignSelf: 'flex-start' }} onClick={() => setAskTags(true)}>
                + Añadir contexto
              </button>
            )}
          </div>
        )}

        {/* logging late? correct the hour and the entry lands where it really happened */}
        <div className="row between">
          <span className="muted small">¿Fue antes? Ajusta la hora</span>
          <input
            type="time"
            value={time}
            onChange={e => changeTime(e.target.value)}
            style={{ width: 'auto' }}
          />
        </div>

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
