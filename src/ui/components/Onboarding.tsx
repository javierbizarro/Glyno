import { useState } from 'react'
import { defaultProfile, DEFAULT_TARGETS, TYPE_FULL, TYPE_LABEL, type DiabetesType, type Measurement, type Med, type Profile } from '../../domain/types'
import { Mascot3D } from './Mascot3D'
import { InstallHint } from './InstallHint'
import { isNative } from '../../app/platform'

const STEPS = 7

const KIND_LABEL: Record<Med['kind'], string> = {
  pill: 'Otra medicación',
  basal: 'Insulina basal',
  bolus: 'Insulina rápida',
}

function Box({ on }: { on: boolean }) {
  return (
    <span className={`box ${on ? 'on' : ''}`}>
      {on && (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 13l4 4L19 7" />
        </svg>
      )}
    </span>
  )
}

export function Onboarding({ initial, onDone }: { initial: Profile | null; onDone: (p: Profile) => void }) {
  const [step, setStep] = useState(0)
  const [p, setP] = useState<Profile>(initial ?? defaultProfile)

  const set = (patch: Partial<Profile>) => setP(prev => ({ ...prev, ...patch }))
  const next = () => setStep(s => Math.min(s + 1, STEPS - 1))
  const back = () => setStep(s => Math.max(s - 1, 0))
  // without this, the default option (type 2, meter, "No" for blood pressure) shows highlighted
  // as if already chosen, and anyone rushing through walks away with an answer they never gave
  const [answered, setAnswered] = useState<Record<number, boolean>>(initial ? { 1: true, 2: true, 5: true } : {})
  const mark = (s: number) => setAnswered(a => ({ ...a, [s]: true }))

  const usesMeds = p.basal || p.bolus || p.pills
  const finish = (patch: Partial<Profile> = {}) => onDone({ ...p, ...patch, name: p.name.trim(), onboarded: true })

  // users who don't measure glucose need no target range: blood pressure is their last step
  const chooseHypertension = (hypertension: boolean) => {
    set({ hypertension })
    mark(5)
    if (p.measurement === 'none') finish({ hypertension })
    else next()
  }

  return (
    <div
      className="screen"
      style={{ paddingTop: 'max(36px, calc(env(safe-area-inset-top) + 8px))', gap: 22 }}
    >
      <div className="onb-progress">
        {Array.from({ length: STEPS }, (_, i) => (
          <span key={i} className={i <= step ? 'on' : ''} />
        ))}
      </div>

      {step === 0 && (
        <>
          <div style={{ alignSelf: 'center' }}>
            <Mascot3D size={210} />
          </div>
          <h1>
            ¡Hola! Soy Glyno,
            <br />
            tu copiloto.
          </h1>
          <p className="muted">
            Te acompaño con la diabetes: apuntamos juntos tus glucemias, busco patrones y te cuento lo
            que veo. Tus datos de salud se quedan en tu dispositivo, no salen de aquí.
            {/* the app pings nobody: promising a counter it does not have would be a lie */}
            {!isNative() && ' Solo contamos aperturas de la app de forma anónima, sin identificadores.'}
          </p>
          <div className="stack">
            <span className="label">¿Cómo te llamas?</span>
            {/* in a WebView autoFocus really does raise the keyboard, and it would cover the
                welcome before it has been read; Safari ignores it, so the web keeps it */}
            <input
              type="text"
              placeholder="Tu nombre"
              aria-label="Tu nombre"
              value={p.name}
              onChange={e => set({ name: e.target.value })}
              autoFocus={!isNative()}
            />
          </div>
          <button className="btn" onClick={next} disabled={!p.name.trim()}>
            Encantado, sigamos
          </button>
          <p className="muted small">
            Glyno no da consejo médico ni pautas de medicación. Para eso, siempre tu equipo sanitario.
          </p>
          {/* better to install before filling anything in: on iOS the installed app keeps its data separately */}
          <InstallHint />
        </>
      )}

      {step === 1 && (
        <>
          <h2>¿Cuál es tu situación?</h2>
          <div className="stack">
            {(Object.keys(TYPE_LABEL) as DiabetesType[]).map(t => (
              <button
                key={t}
                className={`choice ${answered[1] && p.type === t ? 'on' : ''}`}
                onClick={() => {
                  set({ type: t, ...DEFAULT_TARGETS[t] })
                  mark(1)
                  next()
                }}
              >
                {TYPE_FULL[t]}
                {t === 'none' && (
                  <div className="muted small">Quiero llevar un control de mi glucosa, tensión o peso</div>
                )}
              </button>
            ))}
          </div>
          <button className="btn ghost small" onClick={back}>
            Atrás
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <h2>¿Cómo mides tu glucosa?</h2>
          <div className="stack">
            {(
              [
                ['meter', 'Glucómetro de dedo', 'Apuntaremos cada medición en dos toques'],
                ['sensor', 'Sensor continuo', 'FreeStyle Libre, Dexcom u otro CGM'],
                ['none', 'No la mido', 'Uso Glyno para tensión, peso u otros registros'],
              ] as [Measurement, string, string][]
            ).map(([m, title, sub]) => (
              <button
                key={m}
                className={`choice ${answered[2] && p.measurement === m ? 'on' : ''}`}
                onClick={() => {
                  set({ measurement: m })
                  mark(2)
                  // no diagnosis means no diabetes medication: skip straight to blood pressure
                  setStep(p.type === 'none' ? 5 : 3)
                }}
              >
                {title}
                <div className="muted small">{sub}</div>
              </button>
            ))}
          </div>
          <button className="btn ghost small" onClick={back}>
            Atrás
          </button>
        </>
      )}

      {step === 3 && (
        <>
          <h2>¿Usas medicación?</h2>
          <p className="muted">
            La dieta y el ejercicio son la base del tratamiento para todo el mundo — eso ya cuenta. Aquí
            solo marca la medicación que uses, si usas alguna. Puedes marcar varias.
          </p>
          <div className="stack">
            <button className={`choice check ${p.basal ? 'on' : ''}`} onClick={() => set({ basal: !p.basal })}>
              <Box on={p.basal} />
              Insulina basal (lenta, una al día)
            </button>
            <button className={`choice check ${p.bolus ? 'on' : ''}`} onClick={() => set({ bolus: !p.bolus })}>
              <Box on={p.bolus} />
              Insulina rápida en las comidas
            </button>
            <button className={`choice check ${p.pills ? 'on' : ''}`} onClick={() => set({ pills: !p.pills })}>
              <Box on={p.pills} />
              <span>
                Otra medicación para la diabetes
                <div className="muted small">Pastillas (metformina…) o inyectables como Ozempic o Trulicity</div>
              </span>
            </button>
          </div>
          <div className="row">
            <button className="btn ghost small" onClick={back}>
              Atrás
            </button>
            <button className="btn" onClick={() => setStep(usesMeds ? 4 : 5)}>
              {usesMeds ? 'Continuar' : 'Sin medicación — continuar'}
            </button>
          </div>
        </>
      )}

      {step === 4 && <MedsStep p={p} set={set} onBack={back} onNext={next} />}

      {step === 5 && (
        <>
          <h2>¿Controlas también la tensión?</h2>
          <p className="muted">Si eres hipertenso, añado un módulo de tensión arterial.</p>
          <div className="stack">
            <button
              className={`choice ${answered[5] && p.hypertension ? 'on' : ''}`}
              onClick={() => chooseHypertension(true)}
            >
              Sí, soy hipertenso
            </button>
            <button
              className={`choice ${answered[5] && !p.hypertension ? 'on' : ''}`}
              onClick={() => chooseHypertension(false)}
            >
              No
            </button>
          </div>
          <button className="btn ghost small" onClick={() => setStep(p.type === 'none' ? 2 : usesMeds ? 4 : 3)}>
            Atrás
          </button>
        </>
      )}

      {step === 6 && (
        <>
          <h2>Tu rango objetivo</h2>
          <p className="muted">
            Entre estos dos valores diremos que estás «en rango».{' '}
            {p.type === 'none'
              ? 'Vienen los valores de referencia de una persona sin diabetes.'
              : 'Vienen los estándar para tu situación.'}{' '}
            Si tu equipo médico te ha dado otros, ponlos aquí.
          </p>
          <div className="row">
            <div className="stack" style={{ flex: 1 }}>
              <span className="label">Mínimo (mg/dl)</span>
              <input
                type="number"
                inputMode="numeric"
                aria-label="Mínimo del rango objetivo, en mg/dl"
                value={p.low}
                onChange={e => set({ low: Number(e.target.value) })}
              />
            </div>
            <div className="stack" style={{ flex: 1 }}>
              <span className="label">Máximo (mg/dl)</span>
              <input
                type="number"
                inputMode="numeric"
                aria-label="Máximo del rango objetivo, en mg/dl"
                value={p.high}
                onChange={e => set({ high: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="row">
            <button className="btn ghost small" onClick={back}>
              Atrás
            </button>
            <button
              className="btn"
              disabled={!(p.low >= 50 && p.high > p.low && p.high <= 300)}
              onClick={() => finish()}
            >
              ¡Listo, empezamos!
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function MedsStep({
  p,
  set,
  onBack,
  onNext,
}: {
  p: Profile
  set: (patch: Partial<Profile>) => void
  onBack: () => void
  onNext: () => void
}) {
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

  const add = () => {
    if (!name.trim()) return
    set({ meds: [...p.meds, { name: name.trim(), dose: dose.trim() || undefined, kind }] })
    setName('')
    setDose('')
  }

  return (
    <>
      <h2>Tu botiquín</h2>
      <p className="muted">
        Tu pauta fija, con su dosis y cuándo te toca: «Metformina · 850 mg, desayuno y cena»,
        «Ozempic · 0,5 mg, los martes», «Lantus · 22 U, noche». Como no cambia cada día no tendrás que
        apuntarla en el diario — Glyno ya contará con ella. Es opcional y se edita en Ajustes.
      </p>
      {kinds.length > 1 && (
        <div className="wrap">
          {kinds.map(k => (
            <button key={k} className={`chip ${kind === k ? 'on' : ''}`} onClick={() => setKind(k)}>
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>
      )}
      {/* stacked: on mobile, two fields in a row clip the example text */}
      <div className="stack">
        <input type="text" placeholder="Metformina" aria-label="Nombre del medicamento" value={name} onChange={e => setName(e.target.value)} />
        <input
          type="text"
          placeholder="850 mg · desayuno y cena"
          aria-label="Dosis y momento del medicamento"
          value={dose}
          onChange={e => setDose(e.target.value)}
        />
      </div>
      <button className="btn ghost small" disabled={!name.trim()} onClick={add}>
        Añadir al botiquín
      </button>
      {p.meds.length > 0 && (
        <div className="stack">
          {p.meds.map((m, i) => (
            <div className="row between card" key={i} style={{ padding: '10px 14px' }}>
              <span style={{ fontSize: 14.5 }}>
                {m.kind === 'pill' ? '💊' : '💉'} {m.name}
                {m.dose ? ` · ${m.dose}` : ''} <span className="muted small">({KIND_LABEL[m.kind]})</span>
              </span>
              <button className="chip" onClick={() => set({ meds: p.meds.filter((_, j) => j !== i) })}>
                Quitar
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="row">
        <button className="btn ghost small" onClick={onBack}>
          Atrás
        </button>
        <button className="btn" onClick={onNext}>
          {p.meds.length ? 'Continuar' : 'Lo apunto luego — continuar'}
        </button>
      </div>
    </>
  )
}
