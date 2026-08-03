import { useState } from 'react'
import type { Profile } from '../../domain/types'
import { daysAgo } from '../../domain/time'
import { mealMoment, MEAL_MOMENT_LABEL } from '../../domain/meals'
import { needsHypoCare } from '../../domain/glucose'
import { entries as repo } from '../../app/container'
import { analyzeMeal, logMeal, saveMeal, suggestMeal, type MealAnalysis, type MealSuggestion } from '../../app/meals'
import type { AiImage } from '../../ports/ai'
import { useWatch } from '../hooks'
import { fmtDayShort, fmtTime } from '../format'

const SEM_COLOR: Record<MealAnalysis['semaforo'], string> = {
  verde: 'var(--green)',
  ambar: 'var(--amber)',
  rojo: 'var(--red)',
}
const SEM_LABEL: Record<MealAnalysis['semaforo'], string> = {
  verde: 'Buena elección',
  ambar: 'Con moderación',
  rojo: 'Mejor otro día',
}

type Photo = AiImage & { preview: string }

// reduce la foto a ≤1024px para gastar menos cuota y subir más rápido
async function shrink(file: File): Promise<Photo> {
  const url = URL.createObjectURL(file)
  const img = await new Promise<HTMLImageElement>((ok, ko) => {
    const i = new Image()
    i.onload = () => ok(i)
    i.onerror = ko
    i.src = url
  })
  const scale = Math.min(1, 1024 / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
  URL.revokeObjectURL(url)
  const dataUrl = canvas.toDataURL('image/jpeg', 0.82)
  return { mimeType: 'image/jpeg', base64: dataUrl.split(',')[1], preview: dataUrl }
}

export function Meals({ profile }: { profile: Profile }) {
  const [mode, setMode] = useState<'sugerir' | 'analizar'>('sugerir')
  const recent = useWatch(() => repo.watchSince(daysAgo(29)), [])
  const lastGlucose = useWatch(() => repo.watchLastByKind('glucose'), [])
  const meals = recent?.filter(e => e.kind === 'meal').reverse().slice(0, 8)
  const hasKey = !!profile.geminiKey

  return (
    <>
      <h1>Comida</h1>
      <div className="wrap">
        <button className={`chip ${mode === 'sugerir' ? 'on' : ''}`} onClick={() => setMode('sugerir')}>
          ¿Qué como ahora?
        </button>
        <button className={`chip ${mode === 'analizar' ? 'on' : ''}`} onClick={() => setMode('analizar')}>
          Analizar un plato
        </button>
      </div>

      {!hasKey && (
        <div className="card">
          <p className="muted">
            Para esto necesito la clave gratuita de Gemini — se pone una vez en{' '}
            <b>Ajustes → Glyno IA</b>.
          </p>
        </div>
      )}

      {mode === 'sugerir' ? (
        <Suggest profile={profile} recent={recent} lastGlucose={lastGlucose} hasKey={hasKey} />
      ) : (
        <Analyze profile={profile} hasKey={hasKey} />
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
  hasKey,
}: {
  profile: Profile
  recent: Parameters<typeof suggestMeal>[1] | undefined
  lastGlucose: Parameters<typeof suggestMeal>[2]
  hasKey: boolean
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
      setResult(await suggestMeal(profile, recent, lastGlucose))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  // ante una hipoglucemia reciente no se proponen comidas: es asunto de su pauta médica
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
        <button className="btn" disabled={!hasKey || busy || !recent} onClick={ask}>
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
          {result.opciones.map(o => (
            <div className="card stack" key={o.plato} style={{ gap: 8 }}>
              <div className="row between">
                <h3 style={{ flex: 1 }}>{o.plato}</h3>
                <span className="pill in">{o.hidratos_g} g HC</span>
              </div>
              <p className="muted small" style={{ lineHeight: 1.5 }}>{o.por_que}</p>
              <button
                className="btn ghost small"
                disabled={taken === o.plato}
                onClick={async () => {
                  await logMeal(o.plato, o.hidratos_g, 'sugerida por Glyno')
                  setTaken(o.plato)
                }}
              >
                {taken === o.plato ? 'Apuntado ✓' : 'Esto voy a comer'}
              </button>
            </div>
          ))}

          {result.evitar.length > 0 && (
            <div className="card stack">
              <span className="label">Mejor hoy no</span>
              <div className="wrap">
                {result.evitar.map(x => (
                  <span key={x} className="pill high">⚠ {x}</span>
                ))}
              </div>
            </div>
          )}

          {result.nota && <p className="muted small">{result.nota}</p>}
        </div>
      )}
    </>
  )
}

function Analyze({ profile, hasKey }: { profile: Profile; hasKey: boolean }) {
  const [photo, setPhoto] = useState<Photo | null>(null)
  const [desc, setDesc] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<MealAnalysis | null>(null)
  const [saved, setSaved] = useState(false)

  const canAnalyze = hasKey && !busy && (photo || desc.trim())

  const analyze = async () => {
    setBusy(true)
    setError('')
    setResult(null)
    setSaved(false)
    try {
      setResult(await analyzeMeal(profile, { image: photo ?? undefined, desc }))
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
            <h3>{result.plato}</h3>
            <span
              className="pill"
              style={{ background: 'transparent', border: `1.5px solid ${SEM_COLOR[result.semaforo]}`, color: SEM_COLOR[result.semaforo] }}
            >
              ● {SEM_LABEL[result.semaforo]}
            </span>
          </div>
          <div className="row" style={{ alignItems: 'baseline', gap: 8 }}>
            <span className="bignum" style={{ fontSize: 44 }}>{result.hidratos_g}</span>
            <span className="muted">g de hidratos · índice glucémico {result.indice_glucemico}</span>
          </div>
          {/* secundarios a propósito: informan, pero no deciden si el plato es buena idea */}
          <p className="muted small">
            {result.fibra_g != null && <>{result.fibra_g} g de fibra · </>}
            {result.calorias_kcal != null && <>~{result.calorias_kcal} kcal · </>}
            {result.procesado && (
              <span
                style={{
                  color: result.procesado === 'ultraprocesado' ? 'var(--amber)' : undefined,
                  fontWeight: result.procesado === 'ultraprocesado' ? 650 : undefined,
                }}
              >
                {result.procesado}
              </span>
            )}
          </p>
          <p style={{ fontSize: 14.5, lineHeight: 1.55 }}>{result.consejo}</p>
          {result.mejor_evitar.length > 0 && (
            <div className="wrap">
              {result.mejor_evitar.map(x => (
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
