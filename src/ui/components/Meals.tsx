import { useState } from 'react'
import type { Profile } from '../../domain/types'
import { daysAgo } from '../../domain/time'
import { mealMoment, MEAL_MOMENT_LABEL } from '../../domain/meals'
import { needsHypoCare } from '../../domain/glucose'
import { entries as repo } from '../../app/container'
import { analyzeMeal, logMeal, saveMeal, suggestMeal, type MealAnalysis, type MealSuggestion } from '../../app/meals'
import { shrink, type Photo } from '../photo'
import { resolveAiSource } from '../../domain/aiKey'
import { useDeviceAi, useWatch } from '../hooks'
import { fmtDayShort, fmtTime } from '../format'

const LIGHT_COLOR: Record<MealAnalysis['traffic_light'], string> = {
  green: 'var(--green)',
  amber: 'var(--amber)',
  red: 'var(--red)',
}
const LIGHT_LABEL: Record<MealAnalysis['traffic_light'], string> = {
  green: 'Buena elección',
  amber: 'Con moderación',
  red: 'Mejor otro día',
}
const GI_LABEL: Record<MealAnalysis['glycemic_index'], string> = {
  low: 'bajo',
  medium: 'medio',
  high: 'alto',
}
const PROCESSING_LABEL: Record<NonNullable<MealAnalysis['processing']>, string> = {
  homemade: 'casero',
  processed: 'procesado',
  ultraprocessed: 'ultraprocesado',
}

export function Meals({ profile, onSetupAi }: { profile: Profile; onSetupAi: () => void }) {
  const [mode, setMode] = useState<'suggest' | 'analyze'>('suggest')
  const recent = useWatch(() => repo.watchSince(daysAgo(29)), [])
  const lastGlucose = useWatch(() => repo.watchLastByKind('glucose'), [])
  const weights = useWatch(() => repo.watchByKind('weight'), [])
  const meals = recent?.filter(e => e.kind === 'meal').reverse().slice(0, 8)
  const device = useDeviceAi()
  const aiOn = resolveAiSource(profile, device.text) !== null

  return (
    <>
      <h1>Comida</h1>
      <div className="wrap" data-tour="meals">
        <button className={`chip ${mode === 'suggest' ? 'on' : ''}`} onClick={() => setMode('suggest')}>
          ¿Qué como ahora?
        </button>
        <button className={`chip ${mode === 'analyze' ? 'on' : ''}`} onClick={() => setMode('analyze')}>
          Analizar un plato
        </button>
      </div>

      {!aiOn && (
        <div className="card stack">
          <p className="muted">
            Para esto me falta activar la IA. Es gratis y se hace una sola vez, paso a paso.
          </p>
          <button className="btn" onClick={onSetupAi}>
            Activar la IA paso a paso
          </button>
        </div>
      )}

      {mode === 'suggest' ? (
        <Suggest
          profile={profile}
          recent={recent}
          lastGlucose={lastGlucose}
          weights={weights}
          aiOn={aiOn}
        />
      ) : (
        <Analyze profile={profile} lastGlucose={lastGlucose} aiOn={aiOn} />
      )}

      {(meals?.length ?? 0) > 0 && (
        <div>
          <span className="label">Últimas comidas</span>
          <div className="card" style={{ marginTop: 8, padding: '4px 16px' }}>
            {meals!.map(e => (
              <div className="entry-row" key={e.id}>
                <span className="entry-ico">🍽️</span>
                <span style={{ flex: 1, fontSize: 14.5 }}>
                  {e.label}
                  {e.carbs ? ` · ${e.carbs} g HC` : ''}
                </span>
                <span className="muted small">
                  {fmtDayShort(e.ts)} {fmtTime(e.ts)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

function Suggest({
  profile,
  recent,
  lastGlucose,
  weights,
  aiOn,
}: {
  profile: Profile
  recent: Parameters<typeof suggestMeal>[1] | undefined
  lastGlucose: Parameters<typeof suggestMeal>[2]
  weights: Parameters<typeof suggestMeal>[3]
  aiOn: boolean
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<MealSuggestion | null>(null)
  const [taken, setTaken] = useState<string | null>(null)

  const moment = MEAL_MOMENT_LABEL[mealMoment(Date.now())]
  const hypo = needsHypoCare(profile, lastGlucose)

  const ask = async () => {
    if (!recent) return
    setBusy(true)
    setError('')
    setResult(null)
    setTaken(null)
    try {
      setResult(await suggestMeal(profile, recent, lastGlucose, weights))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  // no meal ideas right after a hypo: treating it belongs to the user's medical plan
  if (hypo) {
    return (
      <div className="card stack" style={{ borderColor: 'var(--red)' }}>
        <span className="label" style={{ color: 'var(--red)' }}>
          Antes de comer
        </span>
        <p style={{ fontSize: 14.5, lineHeight: 1.55 }}>
          Tu última glucemia ({lastGlucose?.value} mg/dl) está por debajo de tu rango. Atiende primero la
          bajada como te haya indicado tu equipo sanitario, y cuando estés recuperado te propongo qué
          tomar.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="card stack">
        <div className="row between">
          <span className="label">Toca {moment}</span>
          <span className="muted small">
            {lastGlucose?.value ? `última: ${lastGlucose.value} mg/dl` : 'sin medición reciente'}
          </span>
        </div>
        {!result && (
          <p className="muted">
            Miro la hora, cómo vas de glucosa y lo que sueles comer, y te doy ideas con lo que ya tienes
            en casa.
          </p>
        )}
        <button className="btn" disabled={!aiOn || busy || !recent} onClick={ask}>
          {busy ? 'Pensando…' : result ? 'Dame otras ideas' : `Pídeme ideas para ${moment}`}
        </button>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--red)' }}>
          <p className="small" style={{ color: 'var(--red)' }}>{error}</p>
        </div>
      )}

      {result && (
        <div className="stack">
          {result.options.map(o => (
            <div className="card stack" key={o.dish} style={{ gap: 8 }}>
              <div className="row between">
                <h3 style={{ flex: 1 }}>{o.dish}</h3>
                <span className="pill in">{o.carbs_g} g HC</span>
              </div>
              <p className="muted small" style={{ lineHeight: 1.5 }}>{o.why}</p>
              <button
                className="btn ghost small"
                disabled={taken === o.dish}
                onClick={async () => {
                  await logMeal(o.dish, o.carbs_g, 'sugerida por Glyno')
                  setTaken(o.dish)
                }}
              >
                {taken === o.dish ? 'Apuntado ✓' : 'Esto voy a comer'}
              </button>
            </div>
          ))}

          {result.avoid.length > 0 && (
            <div className="card stack">
              <span className="label">Mejor hoy no</span>
              <div className="wrap">
                {result.avoid.map(x => (
                  <span key={x} className="pill high">⚠ {x}</span>
                ))}
              </div>
            </div>
          )}

          {result.note && <p className="muted small">{result.note}</p>}
        </div>
      )}
    </>
  )
}

function Analyze({
  profile,
  lastGlucose,
  aiOn,
}: {
  profile: Profile
  lastGlucose: Parameters<typeof analyzeMeal>[2]
  aiOn: boolean
}) {
  const [photo, setPhoto] = useState<Photo | null>(null)
  const [desc, setDesc] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<MealAnalysis | null>(null)
  const [saved, setSaved] = useState(false)

  const canAnalyze = aiOn && !busy && (photo || desc.trim())

  const analyze = async () => {
    setBusy(true)
    setError('')
    setResult(null)
    setSaved(false)
    try {
      setResult(await analyzeMeal(profile, { image: photo ?? undefined, desc }, lastGlucose))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="card stack">
        <label className="btn ghost" style={{ textAlign: 'center', cursor: 'pointer' }}>
          {photo ? 'Cambiar foto' : '📷 Hacer foto al plato'}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={async e => {
              const f = e.target.files?.[0]
              if (f) {
                setPhoto(await shrink(f))
                setResult(null)
                setSaved(false)
              }
              e.target.value = ''
            }}
          />
        </label>
        {photo && (
          <img
            src={photo.preview}
            alt="Tu plato"
            style={{ width: '100%', borderRadius: 12, maxHeight: 260, objectFit: 'cover' }}
          />
        )}
        <input
          type="text"
          placeholder={photo ? 'Añade contexto (opcional)…' : 'O descríbelo: lentejas con arroz y un plátano'}
          value={desc}
          onChange={e => setDesc(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && canAnalyze && analyze()}
        />
        <button className="btn" disabled={!canAnalyze} onClick={analyze}>
          {busy ? 'Mirando el plato…' : 'Analizar'}
        </button>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--red)' }}>
          <p className="small" style={{ color: 'var(--red)' }}>{error}</p>
        </div>
      )}

      {result && (
        <div className="card stack">
          <div className="row between">
            <h3>{result.dish}</h3>
            <span
              className="pill"
              style={{ background: 'transparent', border: `1.5px solid ${LIGHT_COLOR[result.traffic_light]}`, color: LIGHT_COLOR[result.traffic_light] }}
            >
              ● {LIGHT_LABEL[result.traffic_light]}
            </span>
          </div>
          <div className="row" style={{ alignItems: 'baseline', gap: 8 }}>
            <span className="bignum" style={{ fontSize: 44 }}>{result.carbs_g}</span>
            <span className="muted">g de hidratos · índice glucémico {GI_LABEL[result.glycemic_index]}</span>
          </div>
          {/* deliberately secondary: they inform, but never decide if the dish is a good idea */}
          <p className="muted small">
            {result.fiber_g != null && <>{result.fiber_g} g de fibra · </>}
            {result.calories_kcal != null && <>~{result.calories_kcal} kcal · </>}
            {result.processing && (
              <span
                style={{
                  color: result.processing === 'ultraprocessed' ? 'var(--amber)' : undefined,
                  fontWeight: result.processing === 'ultraprocessed' ? 650 : undefined,
                }}
              >
                {PROCESSING_LABEL[result.processing]}
              </span>
            )}
          </p>
          <p style={{ fontSize: 14.5, lineHeight: 1.55 }}>{result.advice}</p>
          {result.better_avoid.length > 0 && (
            <div className="wrap">
              {result.better_avoid.map(x => (
                <span key={x} className="pill high">⚠ {x}</span>
              ))}
            </div>
          )}
          <button
            className="btn"
            disabled={saved}
            onClick={async () => {
              await saveMeal(result)
              setSaved(true)
            }}
          >
            {saved ? 'Guardado en el diario ✓' : 'Guardar en el diario'}
          </button>
          <p className="muted small">La estimación es orientativa — tu glucómetro tiene la última palabra.</p>
        </div>
      )}
    </>
  )
}
