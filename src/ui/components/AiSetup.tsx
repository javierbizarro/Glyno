import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Profile } from '../../domain/types'
import { cleanKey, looksLikeKey } from '../../domain/aiKey'
import { checkKey } from '../../app/aiKey'

const AI_STUDIO = 'https://aistudio.google.com/apikey'

type Status = 'idle' | 'checking' | 'error' | 'done'

/**
 * Three steps, one action per screen: open the page, copy the key, paste it here.
 * The key is checked against Google before it is saved — nobody should discover
 * days later that they copied it wrong.
 */
export function AiSetup({
  profile,
  onSave,
  onClose,
}: {
  profile: Profile
  onSave: (p: Profile) => void
  onClose: () => void
}) {
  const [step, setStep] = useState(0)
  const [typed, setTyped] = useState('')
  const [byHand, setByHand] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [msg, setMsg] = useState('')

  // pasting fires onPaste and onChange in the same tick, and `status` is still stale in the
  // second one: without this the key would be checked twice
  const busy = useRef(false)

  const submit = async (raw: string) => {
    if (busy.current) return
    busy.current = true
    setStatus('checking')
    setMsg('')
    try {
      const r = await checkKey(raw)
      setMsg(r.message)
      if (r.ok) {
        onSave({ ...profile, geminiKey: r.key })
        setStatus('done')
      } else {
        setStatus('error')
        setByHand(true)
        // only tidy up the box when what came in really was a key: otherwise the user
        // sees their own words mangled (spaces stripped) instead of what they wrote
        if (looksLikeKey(r.key)) setTyped(r.key)
      }
    } finally {
      busy.current = false
    }
  }

  const paste = async () => {
    try {
      const raw = await navigator.clipboard.readText()
      await submit(raw)
    } catch {
      setStatus('error')
      setByHand(true)
      setMsg('No he podido leer lo que copiaste. Toca el recuadro de abajo, mantén el dedo apretado y elige «Pegar».')
    }
  }

  // Google opens on top of the app; coming back should not mean hunting for where you were.
  // Leaving marks the trip, and the first time the app is visible again we jump to the paste step.
  const away = useRef(false)
  const leave = () => {
    away.current = true
    setStep(1)
  }
  useEffect(() => {
    const onBack = () => {
      if (away.current && document.visibilityState === 'visible') {
        away.current = false
        setStep(2)
      }
    }
    document.addEventListener('visibilitychange', onBack)
    return () => document.removeEventListener('visibilitychange', onBack)
  }, [])

  // typing it out is painful: as soon as what's in the box looks like a whole key, check it
  const onTyped = (v: string) => {
    setTyped(v)
    if (!busy.current && looksLikeKey(cleanKey(v))) submit(v)
  }

  if (status === 'done')
    return (
      <div className="wiz">
        <h1>¡Ya está!</h1>
        <div className="card stack" style={{ borderColor: 'var(--green)', background: 'var(--green-soft)' }}>
          <p style={{ fontSize: 17 }}>
            ✅ La clave funciona{profile.name ? `, ${profile.name}` : ''}. Ya puedo darte valoraciones y
            mirar tus platos.
          </p>
        </div>
        <p className="muted">
          Se ha guardado en este dispositivo. No hace falta que la recuerdes ni que vuelvas a esta
          pantalla.
        </p>
        <button className="btn big" onClick={onClose}>
          Terminar
        </button>
      </div>
    )

  return (
    <div className="wiz">
      <div className="row between">
        <h1>Activar la IA</h1>
        <button className="chip" onClick={onClose}>
          Cerrar
        </button>
      </div>

      <div className="onb-progress">
        {[0, 1, 2].map(i => (
          <span key={i} className={i <= step ? 'on' : ''} />
        ))}
      </div>

      {step === 0 && (
        <>
          <h2>1. Antes de salir, mira lo que harás allí</h2>
          <p>
            La IA de Glyno es la de Google y es <b>gratuita</b>: solo hay que pedirle una clave. No
            piden tarjeta. Se hace una vez y no hay que volver.
          </p>
          <p>Al abrir su página te pedirá, por este orden:</p>
          <ol className="wiz-steps">
            <li>
              <b>Tu cuenta de Google</b>, la del correo del móvil.
            </li>
            <li>
              <b>Aceptar sus condiciones</b>: marca la casilla y continúa.
            </li>
            <li>
              Tocar el botón azul <b>«Create API key»</b> («Crear clave de API»).
            </li>
            <li>
              Si te pregunta por un <b>proyecto</b>, acepta el que te propone o elige crear uno
              nuevo. No tienes que configurar nada más.
            </li>
            <li>
              Aparecerá un <b>texto largo y raro</b> (empieza por <span className="mono">AQ.</span>
              o por <span className="mono">AIza</span>, según la cuenta): esa es la clave. Tócala o
              toca <b>«Copiar»</b> 📋.
            </li>
          </ol>
          <ShotCreate />
          <p className="muted small">
            Google cambia esa página de vez en cuando y algún nombre puede estar en inglés o algo
            distinto; lo que buscas siempre es el botón de crear la clave.
          </p>
          <a className="btn big" href={AI_STUDIO} target="_blank" rel="noopener noreferrer" onClick={leave}>
            Abrir Google y crear la clave
          </a>
          <button className="btn ghost" onClick={() => setStep(2)}>
            Ya la tengo copiada
          </button>
        </>
      )}

      {step === 1 && (
        <>
          <h2>2. Te espero aquí</h2>
          <p>
            Cuando tengas la clave copiada, <b>vuelve a Glyno</b>: cierra la página de Google como
            cierras cualquier otra. En cuanto vuelvas seguimos solos, no tienes que buscar nada.
          </p>
          <ShotAccount />
          <button className="btn big" onClick={() => setStep(2)}>
            Ya la he copiado
          </button>
          <a className="btn ghost" href={AI_STUDIO} target="_blank" rel="noopener noreferrer" onClick={leave}>
            Volver a abrir Google
          </a>
          <button className="btn ghost" onClick={() => setStep(0)}>
            Atrás
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <h2>3. Pégala aquí</h2>
          <p>Ya estás de vuelta. Toca el botón y la pego yo: compruebo sola que funciona.</p>
          <button className="btn big" onClick={paste} disabled={status === 'checking'}>
            📋 Pegar la clave
          </button>

          {status === 'checking' && <p className="muted">Comprobando la clave con Google…</p>}

          {status === 'error' && (
            <div className="card" style={{ borderColor: 'var(--red)', background: 'var(--red-soft)' }}>
              <p style={{ fontSize: 15.5 }}>{msg}</p>
            </div>
          )}

          {byHand ? (
            <div className="stack">
              <span className="label">La clave</span>
              <input
                type="text"
                inputMode="text"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                placeholder="Pega aquí la clave"
                className="mono"
                value={typed}
                onChange={e => onTyped(e.target.value)}
                onPaste={e => submit(e.clipboardData.getData('text'))}
              />
              <button
                className="btn"
                disabled={!typed.trim() || status === 'checking'}
                onClick={() => submit(typed)}
              >
                Comprobar la clave
              </button>
            </div>
          ) : (
            <button className="btn ghost" onClick={() => setByHand(true)}>
              Prefiero pegarla a mano
            </button>
          )}

          <button className="btn ghost" onClick={() => setStep(1)}>
            Atrás
          </button>
          <p className="muted small">
            La clave se guarda solo en este dispositivo. Glyno no la envía a ningún sitio que no sea
            Google al pedirle una respuesta.
          </p>
        </>
      )}
    </div>
  )
}

/* The two drawings are illustrations of what the user will see, not real screenshots:
   they must not go stale every time Google repaints its page. */

function Frame({ children, title }: { children: ReactNode; title: string }) {
  return (
    <svg className="shot" viewBox="0 0 300 170" role="img" aria-label={title}>
      <title>{title}</title>
      <rect x="0.5" y="0.5" width="299" height="169" rx="11" fill="var(--card)" stroke="var(--line)" />
      <path d="M0 11.5A11 11 0 0 1 11 .5h278a11 11 0 0 1 11 11V28H0z" fill="var(--paper)" />
      <line x1="0" y1="28" x2="300" y2="28" stroke="var(--line)" />
      {[12, 22, 32].map(cx => (
        <circle key={cx} cx={cx} cy="14" r="3" fill="var(--line)" />
      ))}
      <rect x="46" y="7" width="200" height="15" rx="7.5" fill="var(--card)" stroke="var(--line)" />
      <text x="56" y="17.5" fontSize="8" fill="var(--ink-3)">
        aistudio.google.com
      </text>
      {children}
    </svg>
  )
}

function ShotAccount() {
  return (
    <Frame title="La página de Google pide tu cuenta">
      <rect x="62" y="46" width="176" height="98" rx="12" fill="var(--paper)" stroke="var(--line)" />
      <circle cx="150" cy="74" r="15" fill="var(--green-soft)" stroke="var(--green)" />
      <path d="M144 79a6 6 0 0 1 12 0" fill="var(--green)" />
      <circle cx="150" cy="70" r="4.5" fill="var(--green)" />
      <text x="150" y="107" fontSize="10.5" textAnchor="middle" fill="var(--ink)">
        Elige tu cuenta
      </text>
      <text x="150" y="123" fontSize="9" textAnchor="middle" fill="var(--ink-3)">
        tucorreo@gmail.com
      </text>
    </Frame>
  )
}

function ShotCreate() {
  return (
    <Frame title="El botón azul crea la clave; luego se copia">
      <rect x="92" y="44" width="116" height="26" rx="13" fill="#2A63C4" />
      <text x="150" y="60.5" fontSize="10" textAnchor="middle" fill="#FFFFFF">
        Create API key
      </text>
      <circle cx="150" cy="57" r="24" fill="none" stroke="#2A63C4" strokeOpacity="0.35" strokeWidth="2" />
      <rect x="40" y="100" width="220" height="30" rx="9" fill="var(--paper)" stroke="var(--line)" />
      <text x="54" y="119" fontSize="10" fill="var(--ink-2)">
        AIzaSy··················
      </text>
      <rect x="228" y="108" width="11" height="13" rx="2.5" fill="none" stroke="var(--ink-2)" />
      <path d="M225 118v-13h11" fill="none" stroke="var(--ink-2)" />
      <circle cx="233" cy="115" r="17" fill="none" stroke="var(--green)" strokeOpacity="0.4" strokeWidth="2" />
    </Frame>
  )
}
