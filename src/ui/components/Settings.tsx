import { useEffect, useRef, useState } from 'react'
import { TYPE_FULL, TYPE_LABEL, type DiabetesType, type Measurement, type Med, type Profile } from '../../domain/types'
import { WEEKDAY_LABEL } from '../../domain/medication'
import { resolveAiSource } from '../../domain/aiKey'
import { seedDemo } from '../../app/demo'
import { checkKey } from '../../app/aiKey'
import { prepareDeviceAi, probeDeviceAi } from '../../app/container'
import { isNative } from '../../app/platform'
import { appUrl, shareApp } from '../../app/share'
import type { DeviceAiState } from '../../ports/deviceAi'
import { buildBackup, buildCsv, parseBackup, restoreBackup } from '../../app/backup'
import { download } from '../format'
import { useDeviceAi } from '../hooks'
import { InstallHint } from './InstallHint'
import { HealthCard } from './HealthCard'
import { AiSetup } from './AiSetup'
import { MedsPhoto } from './MedsPhoto'

const KIND_LABEL: Record<Med['kind'], string> = {
  pill: 'Otra medicación',
  basal: 'Insulina basal',
  bolus: 'Insulina rápida',
}

const today = () => new Date().toISOString().slice(0, 10)

export function Settings({
  profile,
  onSave,
  onReplayTour,
  openAi,
  onAiOpened,
}: {
  profile: Profile
  onSave: (p: Profile) => void
  onReplayTour: () => void
  /** arriving from "activar la IA" elsewhere in the app: the wizard opens by itself */
  openAi?: boolean
  onAiOpened?: () => void
}) {
  const p = profile
  const set = (patch: Partial<Profile>) => onSave({ ...p, ...patch })
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')
  const [wizard, setWizard] = useState(!!openAi)
  // reading the med cabinet off a photo needs the AI on, like the plate
  const device = useDeviceAi()
  const aiOn = resolveAiSource(p, device.text) !== null
  useEffect(() => {
    if (openAi) onAiOpened?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const flash = (m: string) => {
    setMsg(m)
    setTimeout(() => setMsg(''), 3500)
  }

  const link = appUrl()
  const share = async () => {
    const outcome = await shareApp()
    if (outcome === 'copied') flash('Enlace copiado al portapapeles.')
    if (outcome === 'failed') flash('Copia el enlace de abajo y pásaselo a quien quieras.')
  }

  const exportCsv = async () => {
    const { csv, count } = await buildCsv(p)
    download(`glyno-diario-${today()}.csv`, new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    flash(`CSV exportado (${count} registros).`)
  }

  const exportBackup = async () => {
    const json = await buildBackup(p)
    download(`glyno-backup-${today()}.json`, new Blob([json], { type: 'application/json' }))
    flash('Copia creada. Guárdala en iCloud/Drive.')
  }

  const importBackup = async (file: File) => {
    try {
      const { preview, data } = parseBackup(await file.text())
      if (!confirm(`Se reemplazará TODO por la copia del ${preview.exportedAt} (${preview.count} registros). ¿Continuar?`)) return
      const restored = await restoreBackup(data)
      if (restored) onSave(restored)
      flash('Copia restaurada.')
    } catch (e) {
      flash(e instanceof Error ? e.message : 'No se pudo leer el fichero.')
    }
  }

  if (wizard) return <AiSetup profile={p} onSave={onSave} onClose={() => setWizard(false)} />

  return (
    <>
      <h1>Ajustes</h1>
      {msg && (
        <div className="card" style={{ borderColor: 'var(--green)', background: 'var(--green-soft)' }}>
          <span className="small">{msg}</span>
        </div>
      )}

      <div className="card stack">
        <span className="label">Perfil</span>
        <div className="stack">
          <span className="label">Nombre</span>
          <input type="text" value={p.name} onChange={e => set({ name: e.target.value })} />
        </div>
        <div className="row">
          <div className="stack" style={{ flex: 1 }}>
            <span className="label">Situación</span>
            <select value={p.type} onChange={e => set({ type: e.target.value as DiabetesType })}>
              {(Object.keys(TYPE_LABEL) as DiabetesType[]).map(t => (
                <option key={t} value={t}>
                  {TYPE_FULL[t]}
                </option>
              ))}
            </select>
          </div>
          <div className="stack" style={{ flex: 1 }}>
            <span className="label">Medición</span>
            <select value={p.measurement} onChange={e => set({ measurement: e.target.value as Measurement })}>
              <option value="meter">Glucómetro</option>
              <option value="sensor">Sensor</option>
              <option value="none">No la mido</option>
            </select>
          </div>
        </div>
        <div className="wrap">
          {(
            [
              ['basal', 'Insulina basal'],
              ['bolus', 'Insulina rápida'],
              ['pills', 'Otra medicación'],
              ['hypertension', 'Hipertensión'],
            ] as ['basal' | 'bolus' | 'pills' | 'hypertension', string][]
          ).map(([k, lbl]) => (
            <button key={k} className={`chip ${p[k] ? 'on' : ''}`} onClick={() => set({ [k]: !p[k] } as Partial<Profile>)}>
              {lbl}
            </button>
          ))}
        </div>
        <div className="row">
          <div className="stack" style={{ flex: 1 }}>
            <span className="label">Rango mín.</span>
            <input type="number" inputMode="numeric" value={p.low} onChange={e => set({ low: Number(e.target.value) })} />
          </div>
          <div className="stack" style={{ flex: 1 }}>
            <span className="label">Rango máx.</span>
            <input type="number" inputMode="numeric" value={p.high} onChange={e => set({ high: Number(e.target.value) })} />
          </div>
        </div>
      </div>

      <MedsEditor p={p} set={set} aiOn={aiOn} />

      <div className="card stack">
        <span className="label">Sobre ti (opcional)</span>
        <p className="muted small">Ayudan a Glyno a afinar el contexto (edad, IMC). No se usan para ajustar tus rangos.</p>
        <div className="row">
          <div className="stack" style={{ flex: 1 }}>
            <span className="label">Año de nacimiento</span>
            <input
              type="number"
              inputMode="numeric"
              placeholder="1980"
              value={p.birthYear ?? ''}
              onChange={e => set({ birthYear: e.target.value ? Number(e.target.value) : undefined })}
            />
          </div>
          <div className="stack" style={{ flex: 1 }}>
            <span className="label">Altura (cm)</span>
            <input
              type="number"
              inputMode="numeric"
              placeholder="175"
              value={p.heightCm ?? ''}
              onChange={e => set({ heightCm: e.target.value ? Number(e.target.value) : undefined })}
            />
          </div>
          <div className="stack" style={{ flex: 1 }}>
            <span className="label">Objetivo de peso (kg)</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.5"
              placeholder="—"
              value={p.targetWeightKg ?? ''}
              onChange={e => set({ targetWeightKg: e.target.value ? Number(e.target.value) : undefined })}
            />
          </div>
        </div>
        <p className="muted small">
          El peso se apunta en el diario (botón ⚖️), para ver su evolución. El objetivo es opcional
          y mejor si está pactado con tu equipo sanitario: Glyno solo lo dibuja en Tendencias —
          nunca propone dietas ni cuenta calorías.
        </p>
      </div>

      <AiCard p={p} set={set} onWizard={() => setWizard(true)} flash={flash} />

      <div className="card stack">
        <span className="label">Tus datos</span>
        <button className="btn ghost" onClick={exportBackup}>
          Crear copia de seguridad (JSON)
        </button>
        <button className="btn ghost" onClick={() => fileRef.current?.click()}>
          Restaurar copia de seguridad
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={e => {
            const f = e.target.files?.[0]
            if (f) importBackup(f)
            e.target.value = ''
          }}
        />
        <button className="btn ghost" onClick={exportCsv}>
          Exportar CSV (para tu médico)
        </button>
        <button className="btn ghost" onClick={async () => (await seedDemo(p), flash('14 días de ejemplo cargados.'))}>
          Cargar datos de ejemplo
        </button>
        <button
          className="btn ghost"
          style={{ color: 'var(--red)', borderColor: 'var(--red)' }}
          onClick={() => {
            if (confirm('Se borrará TODO: perfil y diario. ¿Seguro? (Haz antes una copia si dudas)'))
              // BASE_URL, not '/': a fork of this repo may be served under a subpath
              location.href = `${import.meta.env.BASE_URL}?reset`
          }}
        >
          Borrar todo y empezar de cero
        </button>
      </div>

      {isNative() && <HealthCard />}

      <InstallHint />

      <div className="card stack" data-tour="guide">
        <span className="label">Primeros pasos</span>
        <p className="muted small">La guía con la que te recibió Glyno, por si quieres repasarla.</p>
        <button className="btn ghost" onClick={onReplayTour}>
          Ver la guía otra vez
        </button>
      </div>

      <div className="card stack">
        <span className="label">Comparte Glyno</span>
        <p className="muted small">
          Si te está sirviendo, pásasela a quien creas que le puede venir bien. Es gratis, no pide
          cuenta y los datos de salud se quedan en el móvil de cada uno.
        </p>
        <button className="btn ghost" onClick={share}>
          Compartir la app
        </button>
        {/* keep the link always visible: if both the share sheet and the clipboard fail, this remains */}
        <a
          href={link}
          className="muted small"
          style={{ wordBreak: 'break-all', color: 'var(--ink-2)' }}
        >
          {link}
        </a>
      </div>

      <div className="card stack">
        <span className="label">Acerca de Glyno</span>
        <p className="muted small">
          v{__VERSION__} · compilada el {__BUILD__} · Tus datos de salud viven en este dispositivo y no salen
          de aquí (salvo lo que tú envíes a la IA con tu clave). Glyno no da consejo médico ni
          pautas de medicación: para eso, siempre tu equipo sanitario.
        </p>
        {/* the app pings nobody, so it must not claim it does: the stores count opens for us */}
        {!isNative() && (
          <p className="muted small">
            Contamos aperturas de la app de forma anónima (GoatCounter): la petición no lleva ningún
            dato tuyo — ni cookies ni identificadores —, solo «alguien la ha abierto». Como en
            cualquier web, GoatCounter ve tu IP al recibirla, pero no la guarda. Si tu navegador
            envía «Do Not Track» o Global Privacy Control, ni eso.
          </p>
        )}
        {/* the pages ship with the build, so inside the app they open offline and must not be
            handed to an external browser: capacitor://localhost means nothing to Safari */}
        <p className="muted small">
          {PAGINAS.map(([file, label], i) => (
            <span key={file}>
              {i > 0 && ' · '}
              <a
                href={`${import.meta.env.BASE_URL}info/${file}.html`}
                target={isNative() ? undefined : '_blank'}
                rel="noreferrer"
              >
                {label}
              </a>
            </span>
          ))}
        </p>
        <p className="muted small">
          El personaje de Glyno lo dibujó una niña de 8 años. 💛
        </p>
        {/* there is no service worker inside the app: updates arrive from the store */}
        {!isNative() && (
          <button
            className="btn ghost small"
            onClick={async () => {
              const regs = await navigator.serviceWorker?.getRegistrations()
              await Promise.all((regs ?? []).map(r => r.update()))
              location.reload()
            }}
          >
            Buscar actualización
          </button>
        )}
      </div>
    </>
  )
}

const PAGINAS: [string, string][] = [
  ['privacidad', 'Privacidad'],
  ['no-es-producto-sanitario', 'No es un producto sanitario'],
  ['en-que-se-basa', 'En qué se basa'],
  ['quien-hay-detras', 'Quién hay detrás'],
]

function MedsEditor({
  p,
  set,
  aiOn,
}: {
  p: Profile
  set: (patch: Partial<Profile>) => void
  aiOn: boolean
}) {
  const [photo, setPhoto] = useState(false)
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
  // '' = daily (the usual); a number is the due weekday for weekly meds like Ozempic
  const [weekday, setWeekday] = useState('')

  if (!kinds.length && !p.meds.length) return null

  const add = () => {
    if (!name.trim()) return
    set({
      meds: [
        ...p.meds,
        {
          name: name.trim(),
          dose: dose.trim() || undefined,
          kind: kinds.includes(kind) ? kind : kinds[0] ?? 'pill',
          weekday: weekday === '' ? undefined : Number(weekday),
        },
      ],
    })
    setName('')
    setDose('')
    setWeekday('')
  }

  return (
    <div className="card stack">
      <span className="label">Botiquín (pauta fija)</span>
      {p.meds.map((m, i) => (
        <div className="row between" key={i}>
          <span style={{ fontSize: 14.5 }}>
            {m.kind === 'pill' ? '💊' : '💉'} {m.name}
            {m.dose ? ` · ${m.dose}` : ''}{' '}
            <span className="muted small">
              ({KIND_LABEL[m.kind]}
              {m.weekday != null ? ` · los ${WEEKDAY_LABEL[m.weekday]}${m.weekday === 0 || m.weekday === 6 ? 's' : ''}` : ''})
            </span>
          </span>
          <button className="chip" onClick={() => set({ meds: p.meds.filter((_, j) => j !== i) })}>
            Quitar
          </button>
        </div>
      ))}
      {kinds.length > 1 && (
        <div className="wrap">
          {kinds.map(k => (
            <button key={k} className={`chip ${kind === k ? 'on' : ''}`} onClick={() => setKind(k)}>
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>
      )}
      {aiOn && (
        <button className="btn ghost" onClick={() => setPhoto(true)}>
          📷 Leer mi medicación de una foto
        </button>
      )}
      {photo && (
        <MedsPhoto
          profile={p}
          onSave={meds => {
            set({ meds })
            setPhoto(false)
          }}
          onClose={() => setPhoto(false)}
        />
      )}
      <p className="muted small">
        La dosis es texto libre: pon la cantidad y cuándo te toca, como «850 mg · desayuno y cena»
        o «22 U · antes de dormir». Si es semanal (Ozempic, Trulicity…), elige el día y Glyno te
        lo recordará en Hoy.
      </p>
      <div className="stack">
        <input type="text" placeholder="Metformina" value={name} onChange={e => setName(e.target.value)} />
        <input
          type="text"
          placeholder="850 mg · desayuno y cena"
          value={dose}
          onChange={e => setDose(e.target.value)}
        />
        <select value={weekday} onChange={e => setWeekday(e.target.value)}>
          <option value="">Cada día (o según pauta)</option>
          {[1, 2, 3, 4, 5, 6, 0].map(d => (
            <option key={d} value={d}>
              Semanal · los {WEEKDAY_LABEL[d]}
              {d === 0 || d === 6 ? 's' : ''}
            </option>
          ))}
        </select>
        <button className="btn ghost small" disabled={!name.trim()} onClick={add}>
          Añadir al botiquín
        </button>
      </div>
    </div>
  )
}

/** the one place the user meets the AI: what is on, and how to turn it on */
function AiCard({
  p,
  set,
  onWizard,
  flash,
}: {
  p: Profile
  set: (patch: Partial<Profile>) => void
  onWizard: () => void
  flash: (m: string) => void
}) {
  const [dev, setDev] = useState<DeviceAiState>('unsupported')
  // null while no download is running; 0..1 during it
  const [progress, setProgress] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    probeDeviceAi().then(setDev)
  }, [])

  const deviceReady = dev === 'available'
  const canDownload = dev === 'downloadable' || dev === 'downloading'
  const off = resolveAiSource(p, deviceReady) === null

  const verify = async () => {
    setBusy(true)
    const r = await checkKey(p.geminiKey)
    setBusy(false)
    flash(r.message)
  }

  const getModel = async () => {
    setProgress(0)
    try {
      setDev(await prepareDeviceAi(setProgress))
    } catch {
      flash('No se ha podido preparar la IA de este dispositivo. Prueba con la clave de Google.')
    } finally {
      setProgress(null)
    }
  }

  const downloadButton = (
    <button className="btn" disabled={progress !== null} onClick={getModel}>
      {progress === null
        ? 'Usar la IA de este dispositivo (sin clave)'
        : `Descargando… ${Math.round(progress * 100)} %`}
    </button>
  )

  return (
    <div className="card stack">
      <span className="label">Glyno IA</span>

      {off && (
        <>
          <p className="muted">
            Con la IA puedo valorar cómo vas y mirar la foto de tus platos. Hay dos maneras y las dos
            son gratis.
          </p>
          {canDownload ? (
            <>
              {downloadButton}
              <p className="muted small">
                Se descarga una vez (ocupa varios GB, mejor con wifi) y luego responde sin internet:
                no sale nada de este dispositivo. Escribe más sencillo que la de Google.
              </p>
              <button className="btn ghost" onClick={onWizard}>
                Prefiero la clave de Google, paso a paso
              </button>
            </>
          ) : (
            <button className="btn" onClick={onWizard}>
              Activar la IA paso a paso
            </button>
          )}
        </>
      )}

      {!!p.geminiKey && (
        <>
          <p className="muted">
            ✅ Clave guardada: {p.geminiKey.slice(0, 8)}…{p.geminiKey.slice(-4)} · solo en este
            dispositivo.
          </p>
          <div className="wrap">
            <button className="chip" onClick={verify} disabled={busy}>
              {busy ? 'Comprobando…' : 'Comprobar que funciona'}
            </button>
            <button className="chip" onClick={onWizard}>
              Cambiar la clave
            </button>
            <button
              className="chip"
              onClick={() => confirm('¿Quito la clave? Me quedo sin valoraciones ni análisis de platos.') && set({ geminiKey: '' })}
            >
              Quitar
            </button>
          </div>
          {canDownload && (
            <>
              <p className="muted small">
                Este dispositivo también puede llevar su propia IA y responder sin clave ni internet.
                Se descarga una vez y ocupa varios GB.
              </p>
              {downloadButton}
            </>
          )}
        </>
      )}

      {deviceReady && (
        <div className="card stack" style={{ borderColor: 'var(--green)', background: 'var(--green-soft)' }}>
          <p className="muted">
            ✅ Este dispositivo trae su propia IA{p.geminiKey ? '.' : ': no necesitas ninguna clave.'}
          </p>
          {!!p.geminiKey && (
            <>
              <span className="label">¿Cuál uso?</span>
              <div className="wrap">
                <button className={`chip ${!p.preferDevice ? 'on' : ''}`} onClick={() => set({ preferDevice: false })}>
                  La de Google
                </button>
                <button className={`chip ${p.preferDevice ? 'on' : ''}`} onClick={() => set({ preferDevice: true })}>
                  La de este dispositivo
                </button>
              </div>
              <p className="muted small">
                La de este dispositivo no envía nada a internet; la de Google escribe mejor y mira
                fotos sin fallar.
              </p>
            </>
          )}
        </div>
      )}

      <p className="muted small">Con IA o sin ella, Glyno nunca propone dosis ni cambios de medicación.</p>
    </div>
  )
}
