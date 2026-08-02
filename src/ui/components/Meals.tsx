import { useState } from 'react'
import type { Profile } from '../../domain/types'
import { daysAgo } from '../../domain/time'
import { entries as repo } from '../../app/container'
import { analyzeMeal, saveMeal, type MealAnalysis } from '../../app/meals'
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
  const [photo, setPhoto] = useState<Photo | null>(null)
  const [desc, setDesc] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<MealAnalysis | null>(null)
  const [saved, setSaved] = useState(false)

  const recent = useWatch(() => repo.watchSince(daysAgo(6)), [])
  const meals = recent?.filter(e => e.kind === 'meal').reverse()

  const hasKey = !!profile.geminiKey
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

  const save = async () => {
    if (!result) return
    await saveMeal(result)
    setSaved(true)
  }

  return (
    <>
      <h1>Comida</h1>
      <p className="muted small">
        Foto al plato o cuéntamelo, y te estimo los hidratos y cómo le sentará a tu glucosa.
      </p>

      {!hasKey && (
        <div className="card">
          <p className="muted">
            Para analizar comidas necesito la clave gratuita de Gemini — se pone una vez en{' '}
            <b>Ajustes → Glyno IA</b>.
          </p>
        </div>
      )}

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
          <p style={{ fontSize: 14.5, lineHeight: 1.55 }}>{result.consejo}</p>
          {result.mejor_evitar.length > 0 && (
            <div className="wrap">
              {result.mejor_evitar.map(x => (
                <span key={x} className="pill high">⚠ {x}</span>
              ))}
            </div>
          )}
          <button className="btn" disabled={saved} onClick={save}>
            {saved ? 'Guardado en el diario ✓' : 'Guardar en el diario'}
          </button>
          <p className="muted small">La estimación es orientativa — tu glucómetro tiene la última palabra.</p>
        </div>
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
