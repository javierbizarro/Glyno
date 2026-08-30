import { useEffect, useRef, useState } from 'react'
import type { Profile } from '../../domain/types'
import { computeStats } from '../../domain/stats'
import { findGaps } from '../../domain/gaps'
import { daysAgo } from '../../domain/time'
import { entries as repo } from '../../app/container'
import { askCoach, generateReview } from '../../app/coach'
import { addMessage, currentOf, loadChats, pruneChats, startNewChat, type Chat } from '../../domain/chat'
import { resolveAiSource } from '../../domain/aiKey'
import { useDeviceAi, useWatch } from '../hooks'
import { fmtDayLong } from '../format'
import { Mascot3D } from './Mascot3D'

const CHATS_KEY = 'glyno.chats'
/** the single thread of versions before conversations existed; migrated on first load */
const LEGACY_CHAT_KEY = 'glyno.chat'
const REVIEW_KEY = 'glyno.review'

const dayLabel = (ts: number): string => {
  const day = new Date(ts).toDateString()
  if (day === new Date().toDateString()) return 'Hoy'
  if (day === new Date(Date.now() - 864e5).toDateString()) return 'Ayer'
  return fmtDayLong(ts)
}

export function Coach({ profile, onSetupAi }: { profile: Profile; onSetupAi: () => void }) {
  // hooks stay above the early return below: this one must not depend on the diary being ready
  const device = useDeviceAi()
  const entries = useWatch(() => repo.watchSince(daysAgo(13)), [])
  // the whole weight history: the AI reads the weekly trend, not just the last number
  const weights = useWatch(() => repo.watchByKind('weight'), [])

  // `written` is absent in reviews cached before Glyno could write them herself: those were AI
  const [review, setReview] = useState<{ date: string; text: string; written?: 'ai' | 'glyno'; aiError?: string } | null>(() => {
    try {
      return JSON.parse(localStorage.getItem(REVIEW_KEY) ?? 'null')
    } catch {
      return null
    }
  })
  const [chats, setChats] = useState<Chat[]>(() =>
    pruneChats(loadChats(localStorage.getItem(CHATS_KEY), localStorage.getItem(LEGACY_CHAT_KEY), Date.now()), Date.now()),
  )
  // reading a previous conversation: its index, or null while writing in today's
  const [reading, setReading] = useState<number | null>(null)
  const [showOld, setShowOld] = useState(false)
  const [question, setQuestion] = useState('')
  const msgs = (reading != null ? chats[reading] : currentOf(chats))?.msgs ?? []
  // everything readable that is not the one being written in
  const previous = chats.map((c, i) => ({ c, i })).filter(({ c, i }) => c.msgs.length && i !== chats.length - 1)
  const save = (next: Chat[]) => {
    const pruned = pruneChats(next, Date.now())
    setChats(pruned)
    localStorage.setItem(CHATS_KEY, JSON.stringify(pruned))
    // only once the new shape is safely stored does the old single thread go
    localStorage.removeItem(LEGACY_CHAT_KEY)
  }
  const [busy, setBusy] = useState<'review' | 'chat' | null>(null)
  const [error, setError] = useState('')

  // the rescued thread is written in its new shape right away: waiting for the next message
  // would leave it hanging on a key that future versions no longer read
  useEffect(() => {
    if (localStorage.getItem(LEGACY_CHAT_KEY)) save(chats)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // like a real chat: pinned to the bottom unless the user scrolled up to read,
  // in which case a new reply must not drag them back down
  const stick = useRef(true)
  const mounted = useRef(false)
  // while a programmatic scroll runs, its intermediate events are not the user's:
  // without this window, smooth scrolling sets stick to false and the reply arrives without scrolling down
  const autoUntil = useRef(0)
  const settle = useRef(0)
  const scrollToEnd = (behavior: ScrollBehavior) => {
    if (behavior === 'smooth') {
      autoUntil.current = performance.now() + 900
      // with the page in the background, smooth scrolling doesn't run (it uses rAF): if the
      // reply arrives while you're looking at another app, this hard finish completes the scroll
      window.clearTimeout(settle.current)
      settle.current = window.setTimeout(() => {
        if (stick.current) window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'auto' })
      }, 950)
    }
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior })
  }
  useEffect(() => () => window.clearTimeout(settle.current), [])

  useEffect(() => {
    const onScroll = () => {
      if (performance.now() < autoUntil.current) return
      stick.current =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 160
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // ready matters: until Dexie delivers the entries the component renders null and the
  // page is only as tall as the viewport — scrolling down there is a no-op and nobody retries it
  const thinking = busy === 'chat'
  const ready = !!entries
  useEffect(() => {
    if (!ready) return
    if ((msgs.length || thinking) && stick.current) scrollToEnd(mounted.current ? 'smooth' : 'auto')
    mounted.current = true
  }, [ready, msgs.length, thinking])

  if (!entries) return null
  const stats = computeStats(entries, profile)
  const gaps = findGaps(profile, entries, weights?.[weights.length - 1])
  const aiOn = resolveAiSource(profile, device.text) !== null

  const doReview = async () => {
    setBusy('review')
    setError('')
    try {
      const { text, written, aiError } = await generateReview(profile, entries, weights)
      const r = { date: new Date().toISOString(), text, written, aiError }
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
    stick.current = true // your own message always scrolls the conversation down
    const now = Date.now()
    const withMine = addMessage(chats, { role: 'me', text: q }, now)
    save(withMine)
    setQuestion('')
    setBusy('chat')
    setError('')
    try {
      // only the conversation in progress travels: yesterday's questions are another subject
      const text = await askCoach(profile, entries, currentOf(withMine)!.msgs, weights)
      save(addMessage(withMine, { role: 'glyno', text }, Date.now()))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      save(chats)
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

      {!aiOn && (
        <div className="card stack">
          <p className="muted">
            Para poder hablar contigo me falta activar la IA. Es gratis y se hace una vez: te
            acompaño paso a paso, no tardamos ni dos minutos.
          </p>
          <button className="btn" onClick={onSetupAi}>
            Activar la IA paso a paso
          </button>
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

      <div className="card stack" data-tour="coach">
        <div className="row between">
          <span className="label">Valoración quincenal</span>
          {review && (
            <span className="muted small">{new Date(review.date).toLocaleDateString('es-ES')}</span>
          )}
        </div>
        {review ? (
          <>
            <p style={{ fontSize: 14.5, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{review.text}</p>
            {/* who put it into words, said out loud: the numbers are always Glyno's own */}
            {review.written === 'glyno' && (
              <p className="muted small">
                {review.aiError
                  ? `La he escrito yo con tus datos: la IA no ha podido contestar (${review.aiError})`
                  : 'La he escrito yo con tus datos, sin IA. Con la IA activada te la cuento con más soltura.'}
              </p>
            )}
          </>
        ) : (
          <p className="muted">
            Le doy una lectura a tus últimos 14 días: cómo vas, qué patrones veo y qué puedes probar.
          </p>
        )}
        <button className="btn" disabled={busy !== null || stats.n < 5} onClick={doReview}>
          {busy === 'review' ? 'Leyendo tus datos…' : review ? 'Actualizar valoración' : 'Pídeme la valoración'}
        </button>
        {stats.n < 5 && <p className="muted small">Necesito al menos unos días de glucemias.</p>}
      </div>

      {/* the conversation hangs from the bottom of the screen, stuck to the input box;
          everything else (review, notices) stays above, like in any chat */}
      {(previous.length > 0 || reading != null) && (
        <div className="stack" style={{ gap: 8 }}>
          {reading == null ? (
            <button className="btn ghost small" style={{ alignSelf: 'flex-start' }} onClick={() => setShowOld(!showOld)}>
              {showOld ? 'Cerrar' : `Conversaciones anteriores (${previous.length})`}
            </button>
          ) : (
            <div className="row between">
              <span className="muted small">Estás leyendo la conversación de {dayLabel(chats[reading].startedAt).toLowerCase()}</span>
              <button className="btn ghost small" onClick={() => setReading(null)}>
                Volver a hoy
              </button>
            </div>
          )}
          {showOld && reading == null && (
            <div className="card stack" style={{ padding: '4px 16px' }}>
              {[...previous].reverse().map(({ c, i }) => (
                  <button
                    key={i}
                    className="entry-row"
                    style={{ background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', width: '100%' }}
                    onClick={() => {
                      setReading(i)
                      setShowOld(false)
                    }}
                  >
                    <span className="entry-ico">💬</span>
                    <span style={{ flex: 1, fontSize: 14.5 }}>
                      {dayLabel(c.startedAt)}
                      <span className="muted small" style={{ display: 'block' }}>
                        {c.msgs.find(m => m.role === 'me')?.text.slice(0, 60) ?? ''}
                      </span>
                    </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="chat-thread">
        <p className="chat-notice">
          Glyno no da consejo médico ni pautas de medicación. Ante cualquier duda de tratamiento,
          tu equipo sanitario.
        </p>
        {msgs.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            {m.text}
          </div>
        ))}
        {busy === 'chat' && <div className="bubble glyno muted">Pensando…</div>}
        {error && (
          <div className="card" style={{ borderColor: 'var(--red)' }}>
            <p className="small" style={{ color: 'var(--red)' }}>
              {error}
            </p>
          </div>
        )}
      </div>

      {reading == null && msgs.length > 0 && busy !== 'chat' && (
        <button
          className="btn ghost small"
          style={{ alignSelf: 'center' }}
          onClick={() => {
            stick.current = true
            save(startNewChat(chats, Date.now()))
          }}
        >
          Empezar una conversación nueva
        </button>
      )}

      <div className="chat-dock" style={reading != null ? { display: 'none' } : undefined}>
        <div className="inner">
          <input
            type="text"
            placeholder="Pregúntale a Glyno…"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !busy && ask()}
            onFocus={() => setTimeout(() => stick.current && scrollToEnd('auto'), 350)}
          />
          <button className="btn small" disabled={!aiOn || busy !== null || !question.trim()} onClick={ask}>
            Enviar
          </button>
        </div>
      </div>

      {/* trailing gap: without it, the last bubble ends up under the fixed input box */}
      <div className="chat-end" />
    </>
  )
}
