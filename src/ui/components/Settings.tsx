import { useRef, useState } from 'react'
import { TYPE_FULL, TYPE_LABEL, type DiabetesType, type Measurement, type Med, type Profile } from '../../domain/types'
import { WEEKDAY_LABEL } from '../../domain/medication'
import { seedDemo } from '../../app/demo'
import { buildBackup, buildCsv, parseBackup, restoreBackup } from '../../app/backup'
import { healthImportSummary, importHealthPayload } from '../../app/healthImport'
import { download } from '../format'
import { InstallHint } from './InstallHint'

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
}: {
  profile: Profile
  onSave: (p: Profile) => void
  onReplayTour: () => void
}) {
  const p = profile
  const set = (patch: Partial<Profile>) => onSave({ ...p, ...patch })
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')

  const flash = (m: string) => {
    setMsg(m)
    setTimeout(() => setMsg(''), 3500)
  }

  // no fixed URL: share the address the app is being used from
  const appUrl = location.origin + import.meta.env.BASE_URL
  const share = async () => {
    const text =
      'Glyno, un copiloto para el día a día con diabetes: apunta tus glucemias, te busca patrones y prepara el informe para el médico. Gratis y sin cuentas.'
    if (navigator.share) {
      // if the user cancels the system sheet, there's nothing to tell them
      try {
        await navigator.share({ title: 'Glyno', text, url: appUrl })
      } catch {
        /* cancelled */
      }
      return
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${appUrl}`)
      flash('Enlace copiado al portapapeles.')
    } catch {
      flash('Copia el enlace de abajo y pásaselo a quien quieras.')
    }
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

      <MedsEditor p={p} set={set} />

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

      <HealthCard />

      <div className="card stack">
        <span className="label">Glyno IA</span>
        <p className="muted small">
          Consigue tu clave gratuita en{' '}
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--green)', fontWeight: 600 }}>
            aistudio.google.com/apikey
          </a>{' '}
          (botón «Create API key», sin tarjeta). Se guarda solo en tu dispositivo y se usa únicamente
          para las valoraciones y la foto del plato.
        </p>
        <input
          type="password"
          placeholder="Clave de la API de Gemini"
          value={p.geminiKey}
          onChange={e => set({ geminiKey: e.target.value.trim() })}
        />
      </div>

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
              // BASE_URL: on GitHub Pages the app lives under /Glyno/, not at the root
              location.href = `${import.meta.env.BASE_URL}?reset`
          }}
        >
          Borrar todo y empezar de cero
        </button>
      </div>

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
          href={appUrl}
          className="muted small"
          style={{ wordBreak: 'break-all', color: 'var(--ink-2)' }}
        >
          {appUrl}
        </a>
      </div>

      <div className="card stack">
        <span className="label">Acerca de Glyno</span>
        <p className="muted small">
          v{__VERSION__} · compilada el {__BUILD__} · Tus datos de salud viven en este dispositivo y no salen
          de aquí (salvo lo que tú envíes a la IA con tu clave). Glyno no da consejo médico ni
          pautas de medicación: para eso, siempre tu equipo sanitario.
        </p>
        <p className="muted small">
          Contamos aperturas de la app de forma anónima (GoatCounter): la petición no lleva ningún
          dato tuyo — ni cookies ni identificadores —, solo «alguien la ha abierto». Como en
          cualquier web, GoatCounter ve tu IP al recibirla, pero no la guarda. Si tu navegador
          envía «Do Not Track» o Global Privacy Control, ni eso.
        </p>
        <p className="muted small">
          El personaje de Glyno lo dibujó una niña de 8 años. 💛
        </p>
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
      </div>
    </>
  )
}

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent)

// the published «Glyno Salud» shortcut (Javier's iCloud share, validated on device).
// If the shortcut changes, share it again and update this link — iCloud links are frozen snapshots.
const SHORTCUT_ICLOUD_URL = 'https://www.icloud.com/shortcuts/533f34e58cfb47938b4158c6927d29af'

function HealthCard() {
  const [msg, setMsg] = useState('')

  const paste = async () => {
    let text: string
    try {
      text = await navigator.clipboard.readText()
    } catch {
      // the browser's raw permission error is English noise: say it in ours
      setMsg('No he podido leer el portapapeles. Dale permiso al navegador y vuelve a intentarlo.')
      return
    }
    try {
      setMsg(healthImportSummary(await importHealthPayload(text)))
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="card stack">
      <span className="label">Salud del iPhone</span>
      <p className="muted small">
        Con el atajo «Glyno Salud», Glyno importa de Apple Salud tu sueño, pasos, entrenamientos
        y la glucosa que vuelque tu sensor — sin que nada salga del dispositivo. Instálalo con un
        toque, ejecútalo y pega aquí lo que deja copiado.{' '}
        <a
          href="https://github.com/javierbizarro/Glyno/blob/main/docs/atajo-salud.md"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--green)', fontWeight: 600 }}
        >
          Guía completa
        </a>
        .
      </p>
      {isIos() && (
        <a
          className="btn ghost small"
          // import-shortcut only accepts icloud.com/shortcuts links (a self-hosted file
          // URL fails with "not valid"); with the iCloud link it opens the Shortcuts
          // preview in one tap, even from the installed PWA
          href={`shortcuts://import-shortcut?url=${encodeURIComponent(SHORTCUT_ICLOUD_URL)}`}
        >
          ⬇️ Añadir el atajo «Glyno Salud»
        </a>
      )}
      <div className="row">
        {isIos() && (
          <button
            className="btn ghost small"
            style={{ flex: 1 }}
            onClick={() => {
              location.href = 'shortcuts://run-shortcut?name=Glyno%20Salud'
            }}
          >
            Traer datos de Salud
          </button>
        )}
        <button className="btn small" style={{ flex: 1 }} onClick={paste}>
          📋 Pegar datos de Salud
        </button>
      </div>
      {msg && <p className="small">{msg}</p>}
    </div>
  )
}

function MedsEditor({ p, set }: { p: Profile; set: (patch: Partial<Profile>) => void }) {
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
