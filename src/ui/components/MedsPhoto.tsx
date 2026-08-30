import { useState } from 'react'
import type { Med, Profile } from '../../domain/types'
import { mergeMeds, type MedMatch } from '../../domain/meds'
import { WEEKDAY_LABEL } from '../../domain/medication'
import { readMedsPhoto } from '../../app/meds'
import { shrink, type Photo } from '../photo'

const KIND_LABEL: Record<Med['kind'], string> = {
  pill: 'Otra medicación',
  basal: 'Insulina basal',
  bolus: 'Insulina rápida',
}

type Choice = { on: boolean; med: Med }

/**
 * Reads the med cabinet off a photo. Nothing here writes on its own: the photo proposes, the
 * user confirms, and what was already saved wins unless it is explicitly replaced.
 */
export function MedsPhoto({
  profile,
  onSave,
  onClose,
}: {
  profile: Profile
  onSave: (meds: Med[]) => void
  onClose: () => void
}) {
  const [photo, setPhoto] = useState<Photo | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [matches, setMatches] = useState<MedMatch[] | null>(null)
  const [choices, setChoices] = useState<Choice[]>([])

  const read = async (p: Photo) => {
    setBusy(true)
    setError('')
    setMatches(null)
    try {
      const found = await readMedsPhoto(p)
      const m = mergeMeds(profile.meds, found)
      setMatches(m)
      // what is already saved is never replaced by default: a photo can misread 850 as 8,50
      setChoices(m.map(x => ({ on: x.status === 'new', med: x.med })))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const edit = (i: number, patch: Partial<Med>) =>
    setChoices(choices.map((c, j) => (j === i ? { ...c, med: { ...c.med, ...patch } } : c)))

  const apply = () => {
    let meds = [...profile.meds]
    matches?.forEach((m, i) => {
      const { on, med } = choices[i]
      if (!on) return
      if (m.at != null) meds[m.at] = { ...meds[m.at], ...med }
      else meds = [...meds, med]
    })
    onSave(meds)
  }

  const picked = choices.filter(c => c.on).length

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <h3>Leer mi medicación</h3>

        {!matches && (
          <>
            <p className="muted">
              Haz una foto a <b>las cajas</b> —juntas, con el nombre visible— y las paso al
              botiquín. Tú confirmas todo antes de que se guarde nada.
            </p>
            <label className="btn ghost" style={{ textAlign: 'center', cursor: 'pointer' }}>
              {photo ? 'Cambiar foto' : '📷 Hacer la foto'}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={async e => {
                  const f = e.target.files?.[0]
                  if (f) {
                    const p = await shrink(f)
                    setPhoto(p)
                    read(p)
                  }
                  e.target.value = ''
                }}
              />
            </label>
            {photo && (
              <img
                src={photo.preview}
                alt="Tu medicación"
                style={{ width: '100%', borderRadius: 12, maxHeight: 220, objectFit: 'cover' }}
              />
            )}
            <p className="muted small">
              La foto viaja a Google para leerla; Glyno no la guarda. Si fotografías{' '}
              <b>una receta</b>, ten en cuenta que ese papel lleva además tu nombre y tus datos:
              con las cajas basta.
            </p>
          </>
        )}

        {busy && <p className="muted">Leyendo la foto…</p>}

        {error && (
          <div className="card" style={{ borderColor: 'var(--red)', background: 'var(--red-soft)' }}>
            <p className="small">{error}</p>
          </div>
        )}

        {matches?.length === 0 && (
          <div className="card stack">
            <p className="muted">
              No he reconocido ninguna medicación en la foto. Prueba con más luz, sin reflejos y
              con el nombre de la caja bien visible.
            </p>
            <button className="btn ghost" onClick={() => setMatches(null)}>
              Probar con otra foto
            </button>
          </div>
        )}

        {!!matches?.length && (
          <>
            <p className="muted small">
              Esto es lo que he leído. Repásalo —sobre todo la dosis— y marca lo que quieras
              guardar. Lo que ya tenías no se toca si no lo marcas.
            </p>
            {matches.map((m, i) => (
              <div
                key={i}
                className="card stack"
                style={{ gap: 8, borderColor: choices[i].on ? 'var(--green)' : 'var(--line)' }}
              >
                <label className="row" style={{ gap: 10, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={choices[i].on}
                    onChange={e => setChoices(choices.map((c, j) => (j === i ? { ...c, on: e.target.checked } : c)))}
                    style={{ width: 22, height: 22, flex: 'none' }}
                  />
                  <span style={{ flex: 1, fontSize: 15 }}>
                    {m.status === 'new' && 'Nuevo en tu botiquín'}
                    {m.status === 'same' && 'Ya lo tienes, igual'}
                    {m.status === 'changed' && 'Ya lo tienes, con otra dosis'}
                  </span>
                </label>

                {m.status === 'changed' && (
                  <p className="muted small">
                    Tuya: <b>{m.mine?.dose || 'sin dosis'}</b> · en la foto: <b>{m.med.dose || 'no se lee'}</b>.
                    Si lo marcas, se queda la de la foto.
                  </p>
                )}

                <input
                  type="text"
                  value={choices[i].med.name}
                  onChange={e => edit(i, { name: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="850 mg · desayuno y cena"
                  value={choices[i].med.dose ?? ''}
                  onChange={e => edit(i, { dose: e.target.value })}
                />
                <div className="row" style={{ gap: 8 }}>
                  <select
                    value={choices[i].med.kind}
                    onChange={e => edit(i, { kind: e.target.value as Med['kind'] })}
                    style={{ flex: 1 }}
                  >
                    {(Object.keys(KIND_LABEL) as Med['kind'][]).map(k => (
                      <option key={k} value={k}>
                        {KIND_LABEL[k]}
                      </option>
                    ))}
                  </select>
                  <select
                    value={choices[i].med.weekday ?? ''}
                    onChange={e => edit(i, { weekday: e.target.value === '' ? undefined : Number(e.target.value) })}
                    style={{ flex: 1 }}
                  >
                    <option value="">Cada día</option>
                    {[1, 2, 3, 4, 5, 6, 0].map(d => (
                      <option key={d} value={d}>
                        Semanal · {WEEKDAY_LABEL[d]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
            <p className="muted small">
              La foto nunca quita nada: lo que no salga en ella se queda como está.
            </p>
          </>
        )}

        <div className="row">
          <button className="btn ghost" style={{ flex: 1 }} onClick={onClose}>
            Cancelar
          </button>
          {!!matches?.length && (
            <button className="btn" style={{ flex: 2 }} disabled={!picked} onClick={apply}>
              {picked ? `Guardar ${picked} en el botiquín` : 'No has marcado ninguno'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
