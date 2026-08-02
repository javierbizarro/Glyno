import { useState } from 'react'
import { defaultProfile, DEFAULT_TARGETS, TYPE_FULL, TYPE_LABEL, type DiabetesType, type Measurement, type Med, type Profile } from '../../domain/types'
import { Mascot3D } from './Mascot3D'
import { InstallHint } from './InstallHint'

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
  // sin esto, la opción por defecto (tipo 2, glucómetro, "No" en tensión) sale resaltada
  // como si ya la hubieras elegido, y quien pasa rápido se lleva una respuesta que no dio
  const [answered, setAnswered] = useState<Record<number, boolean>>(initial ? { 1: true, 2: true, 5: true } : {})
  const mark = (s: number) => setAnswered(a => ({ ...a, [s]: true }))

  const usesMeds = p.basal || p.bolus || p.pills
  const finish = (patch: Partial<Profile> = {}) => onDone({ ...p, ...patch, name: p.name.trim(), onboarded: true })

  // quien no mide glucosa no necesita rango objetivo: la tensión es su último paso
  const chooseHypertension = (hypertension: boolean) => {
    set({ hypertension })
    mark(5)
    if (p.measurement === 'none') finish({ hypertension })
    else next()
  }

  return (
    <div className="screen" style={{ paddingTop: 36, gap: 22 }}>
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
            que veo. Tus datos se quedan en tu dispositivo, no salen de aquí.
          </p>
          <div className="stack">
            <span className="label">¿Cómo te llamas?</span>
            <input
              type="text"
              placeholder="Tu nombre"
              value={p.name}
              onChange={e => set({ name: e.target.value })}
              autoFocus
            />
          </div>
          <button className="btn" onClick={next} disabled={!p.name.trim()}>
            Encantado, sigamos
          </button>
          <p className="muted small">
            Glyno no da consejo médico ni pautas de medicación. Para eso, siempre tu equipo sanitario.
          </p>
          {/* mejor instalarla antes de rellenar nada: en iOS la app instalada guarda sus datos aparte */}
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
                  // sin diagnóstico no hay medicación de diabetes: se salta a tensión
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
                value={p.low}
                onChange={e => set({ low: Number(e.target.value) })}
              />
            </div>
            <div className="stack" style={{ flex: 1 }}>
              <span className="label">Máximo (mg/dl)</span>
              <input
                type="number"
                inputMode="numeric"
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
      <div className="row">
        <input
          type="text"
          placeholder="Nombre (Metformina…)"
          value={name}
          onChange={e => setName(e.target.value)}
          style={{ flex: 2 }}
        />
        <input
          type="text"
          placeholder="Dosis y cuándo"
          value={dose}
          onChange={e => setDose(e.target.value)}
          style={{ flex: 1.2 }}
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
