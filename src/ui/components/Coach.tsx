import { useEffect, useRef, useState } from 'react'
import type { Profile } from '../../domain/types'
import { computeStats } from '../../domain/stats'
import { findGaps } from '../../domain/gaps'
import { daysAgo } from '../../domain/time'
import { entries as repo } from '../../app/container'
import { askCoach, generateReview, type ChatMsg } from '../../app/coach'
import { useWatch } from '../hooks'
import { Mascot3D } from './Mascot3D'

const CHAT_KEY = 'glyno.chat'
const REVIEW_KEY = 'glyno.review'

export function Coach({ profile }: { profile: Profile }) {
  const entries = useWatch(() => repo.watchSince(daysAgo(13)), [])
  const lastWeight = useWatch(() => repo.watchLastByKind('weight'), [])

  const [review, setReview] = useState<{ date: string; text: string } | null>(() => {
    try {
      return JSON.parse(localStorage.getItem(REVIEW_KEY) ?? 'null')
    } catch {
      return null
    }
  })
  const [msgs, setMsgs] = useState<ChatMsg[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(CHAT_KEY) ?? '[]')
    } catch {
      return []
    }
  })
  const [question, setQuestion] = useState('')
  const [busy, setBusy] = useState<'review' | 'chat' | null>(null)
  const [error, setError] = useState('')
  const chatEnd = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ block: 'nearest' })
  }, [msgs.length, busy])

  if (!entries) return null
  const stats = computeStats(entries, profile)
  const gaps = findGaps(profile, entries, lastWeight)
  const hasKey = !!profile.geminiKey

  const doReview = async () => {
    setBusy('review')
    setError('')
    try {
      const text = await generateReview(profile, entries, lastWeight)
      const r = { date: new Date().toISOString(), text }
      setReview(r)
      localStorage.setItem(REVIEW_KEY, JSON.stringify(r))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  const ask = async () => {
    const q = question.trim()
    if (!q) return
    const withMine = [...msgs, { role: 'me' as const, text: q }]
    setMsgs(withMine)
    setQuestion('')
    setBusy('chat')
    setError('')
    try {
      const text = await askCoach(profile, entries, withMine, lastWeight)
      const all = [...withMine, { role: 'glyno' as const, text }].slice(-20)
      setMsgs(all)
      localStorage.setItem(CHAT_KEY, JSON.stringify(all))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setMsgs(withMine.slice(0, -1))
      setQuestion(q)
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <div className="row" style={{ gap: 14 }}>
        <Mascot3D size={110} />
        <div>
          <h1>Glyno</h1>
          <p className="muted small">Tu copiloto. Ni médico ni adivino: leo tus datos.</p>
        </div>
      </div>

      {!hasKey && (
        <div className="card">
          <p className="muted">
            Para que pueda hablar necesito la clave gratuita de Gemini — se pone una sola vez en{' '}
            <b>Ajustes → Glyno IA</b> (aistudio.google.com, sin tarjeta).
          </p>
        </div>
      )}

      {gaps.length > 0 && (
        <div className="card stack" style={{ background: 'var(--green-soft)', borderColor: 'var(--green)' }}>
          <span className="label" style={{ color: 'var(--green)' }}>
            Me ayudarías a ayudarte
          </span>
          {gaps.map((g, i) => (
            <p key={i} className="small" style={{ lineHeight: 1.5 }}>
              {g.text}
            </p>
          ))}
        </div>
      )}

      <div className="card stack">
        <div className="row between">
          <span className="label">Valoración quincenal</span>
          {review && (
            <span className="muted small">{new Date(review.date).toLocaleDateString('es-ES')}</span>
          )}
        </div>
        {review ? (
          <p style={{ fontSize: 14.5, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{review.text}</p>
        ) : (
          <p className="muted">
            Le doy una lectura a tus últimos 14 días: cómo vas, qué patrones veo y qué puedes probar.
          </p>
        )}
        <button className="btn" disabled={!hasKey || busy !== null || stats.n < 5} onClick={doReview}>
          {busy === 'review' ? 'Leyendo tus datos…' : review ? 'Actualizar valoración' : 'Pídeme la valoración'}
        </button>
        {stats.n < 5 && <p className="muted small">Necesito al menos unos días de glucemias.</p>}
      </div>

      <div className="card stack">
        <span className="label">Pregúntame</span>
        {msgs.length > 0 && (
          <div className="stack" style={{ maxHeight: 320, overflowY: 'auto' }}>
            {msgs.map((m, i) => (
              <div key={i} className={`bubble ${m.role}`}>
                {m.text}
              </div>
            ))}
            {busy === 'chat' && <div className="bubble glyno muted">Pensando…</div>}
            <div ref={chatEnd} />
          </div>
        )}
        <div className="row">
          <input
            type="text"
            placeholder="¿Por qué amanezco alto?"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !busy && ask()}
          />
          <button className="btn small" disabled={!hasKey || busy !== null || !question.trim()} onClick={ask}>
            Enviar
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--red)' }}>
          <p className="small" style={{ color: 'var(--red)' }}>
            {error}
          </p>
        </div>
      )}

      <p className="muted small">
        Glyno no da consejo médico ni pautas de medicación. Ante cualquier duda de tratamiento, tu
        equipo sanitario.
      </p>
    </>
  )
}
