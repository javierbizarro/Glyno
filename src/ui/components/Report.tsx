import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { MOMENTS, treatmentSummary, TYPE_FULL, type Entry, type Profile } from '../../domain/types'
import { rangeOf } from '../../domain/glucose'
import { WEEKDAY_LABEL } from '../../domain/medication'
import { getReportData, type ReportData } from '../../app/report'
import { fmtDayShort } from '../format'
import { MOMENT_SHORT } from '../entryDisplay'

const fmtDate = (ts: number) => new Date(ts).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })

function valClass(v: number, p: Profile): string {
  const r = rangeOf(v, p)
  return r === 'low' ? 'val-low' : r === 'high' ? 'val-high' : ''
}

export function Report({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  const [days, setDays] = useState(14)
  const [data, setData] = useState<ReportData | null>(null)

  useEffect(() => {
    getReportData(profile, days).then(setData)
  }, [profile, days])

  useEffect(() => {
    const prev = document.title
    document.title = `Informe Glyno — ${profile.name} — ${new Date().toLocaleDateString('es-ES')}`
    return () => {
      document.title = prev
    }
  }, [profile.name])

  if (!data) return null
  const { stats } = data
  const general = profile.type === 'none'
  // GMI is validated for diabetes with continuous monitoring: outside that it's misleading
  const showGmi = !general && data.gmi != null
  const age = profile.birthYear ? new Date().getFullYear() - profile.birthYear : null
  const bmi =
    data.weight.last?.value && profile.heightCm
      ? (data.weight.last.value / Math.pow(profile.heightCm / 100, 2)).toFixed(1)
      : null

  // day × moment table
  const dayKey = (ts: number) => new Date(ts).toDateString()
  const dayList: string[] = []
  for (let d = days - 1; d >= 0; d--) {
    const t = new Date()
    t.setHours(12, 0, 0, 0)
    t.setDate(t.getDate() - d)
    dayList.push(t.toDateString())
  }
  const byDayMoment = new Map<string, Map<string, number[]>>()
  for (const e of data.glucose) {
    const dk = dayKey(e.ts)
    if (!byDayMoment.has(dk)) byDayMoment.set(dk, new Map())
    const m = e.note && (MOMENTS as readonly string[]).includes(e.note) ? e.note : 'otras'
    const bucket = byDayMoment.get(dk)!
    bucket.set(m, [...(bucket.get(m) ?? []), e.value!])
  }
  const cols = [...MOMENTS, 'otras']

  return createPortal(
    <div className="report-overlay">
      <div className="report-toolbar no-print">
        <button className="btn ghost small" onClick={onClose}>
          ← Volver
        </button>
        <div className="wrap">
          {[14, 30, 90].map(d => (
            <button key={d} className={`chip ${days === d ? 'on' : ''}`} onClick={() => setDays(d)}>
              {d} días
            </button>
          ))}
        </div>
        <button className="btn small" onClick={() => window.print()}>
          Guardar PDF
        </button>
      </div>

      <div className="report">
        <header>
          <h1>Informe de control glucémico</h1>
          <p className="rep-sub">
            {profile.name}
            {age ? ` · ${age} años` : ''} ·{' '}
            {general ? 'Sin diagnóstico de diabetes' : TYPE_FULL[profile.type]}
            {profile.measurement !== 'none' &&
              ` · ${profile.measurement === 'sensor' ? 'sensor continuo' : 'glucómetro capilar'}`}
            <br />
            Tratamiento: {treatmentSummary(profile)}
            {profile.meds.length > 0 && (
              <>
                {' — '}
                {profile.meds
                  .map(
                    m =>
                      `${m.name}${m.dose ? ` ${m.dose}` : ''}${m.weekday != null ? ` (semanal, ${WEEKDAY_LABEL[m.weekday]})` : ''}`,
                  )
                  .join(' · ')}
              </>
            )}
            <br />
            Periodo: {fmtDate(data.from)} – {fmtDate(data.to)} ({data.days} días) · Rango objetivo:{' '}
            {profile.low}–{profile.high} mg/dl · Generado el {fmtDate(Date.now())}
          </p>
        </header>

        <section className="rep-metrics">
          <div>
            <b>{stats.n}</b>
            <span>mediciones</span>
          </div>
          <div>
            <b>{stats.mean != null ? Math.round(stats.mean) : '—'}</b>
            <span>media mg/dl</span>
          </div>
          {showGmi && (
            <div>
              <b>{data.gmi!.toFixed(1).replace('.', ',') + ' %'}</b>
              <span>HbA1c estimada*</span>
            </div>
          )}
          <div>
            <b>{Math.round(stats.tir)} %</b>
            <span>en rango</span>
          </div>
          <div>
            <b className="val-low">{Math.round(stats.pctLow)} %</b>
            <span>bajas</span>
          </div>
          <div>
            <b className="val-high">{Math.round(stats.pctHigh)} %</b>
            <span>altas</span>
          </div>
        </section>

        <section>
          <h2>Glucemia · {data.days} días</h2>
          <ReportChart glucose={data.glucose} profile={profile} from={data.from} days={data.days} />
        </section>

        <section>
          <h2>Medias por momento del día</h2>
          <table className="rep-table">
            <thead>
              <tr>
                {data.momentMeans.map(m => (
                  <th key={m.label}>{MOMENT_SHORT[m.label] ?? m.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {data.momentMeans.map(m => (
                  <td key={m.label}>
                    {m.mean != null ? (
                      <>
                        <span className={valClass(m.mean, profile)}>{Math.round(m.mean)}</span>{' '}
                        <small>(n={m.n})</small>
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2>Registro diario (mg/dl)</h2>
          <table className="rep-table rep-daily">
            <thead>
              <tr>
                <th>Día</th>
                {cols.map(c => (
                  <th key={c}>{MOMENT_SHORT[c] ?? c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dayList.map(dk => {
                const bucket = byDayMoment.get(dk)
                return (
                  <tr key={dk}>
                    <td className="rep-day">{fmtDayShort(new Date(dk).getTime())}</td>
                    {cols.map(c => (
                      <td key={c}>
                        {bucket?.get(c)?.map((v, i) => (
                          <span key={i}>
                            {i > 0 && ' / '}
                            <span className={valClass(v, profile)}>{v}</span>
                          </span>
                        )) ?? ''}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>

        {profile.hypertension && data.bp.n > 0 && (
          <section>
            <h2>Tensión arterial</h2>
            <p>
              {data.bp.n} lecturas · media{' '}
              <b>
                {Math.round(data.bp.mean!.sys)}/{Math.round(data.bp.mean!.dia)}
              </b>{' '}
              mmHg ·{' '}
              <span className={data.bp.high > 0 ? 'val-high' : ''}>
                {data.bp.high} lecturas ≥140/90
              </span>
            </p>
          </section>
        )}

        {(data.weight.last || bmi) && (
          <section>
            <h2>Peso</h2>
            <p>
              {data.weight.first && data.weight.last && data.weight.first.id !== data.weight.last.id ? (
                <>
                  {data.weight.first.value} kg → <b>{data.weight.last.value} kg</b> (
                  {(data.weight.last.value! - data.weight.first.value!).toFixed(1)} kg en el periodo)
                </>
              ) : (
                <b>{data.weight.last?.value} kg</b>
              )}
              {bmi ? ` · IMC ${bmi}` : ''}
              {profile.heightCm ? ` (talla ${profile.heightCm} cm)` : ''}
            </p>
          </section>
        )}

        {(stats.tagEffects.length > 0 || (stats.exerciseDelta != null && stats.exerciseDays >= 2)) && (
          <section>
            <h2>Patrones observados</h2>
            <ul>
              {stats.exerciseDelta != null && stats.exerciseDays >= 2 && (
                <li>
                  Días con ejercicio ({stats.exerciseDays}): media {Math.round(stats.exerciseDelta)} mg/dl
                  respecto a su media general.
                </li>
              )}
              {stats.tagEffects.slice(0, 5).map(t => (
                <li key={t.label}>
                  Tras «{t.label}» (×{t.n}): {t.delta > 0 ? '+' : ''}
                  {Math.round(t.delta)} mg/dl respecto a su media general.
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="rep-foot">
          {showGmi && (
            <>
              * HbA1c estimada (GMI) calculada a partir de la media de glucemias del periodo;
              orientativa, no sustituye a la analítica.{' '}
            </>
          )}
          Informe generado por Glyno a partir del registro personal
          {general ? ' de la persona' : ' del paciente'}; los valores en{' '}
          <span className="val-low">rojo</span> están bajo el rango y en{' '}
          <span className="val-high">ámbar</span> sobre el rango de referencia ({profile.low}–
          {profile.high} mg/dl
          {general ? ', valores de persona sin diabetes' : ''}). Glyno no emite juicio clínico.
        </footer>
      </div>
    </div>,
    document.body,
  )
}

const W = 700
const H = 180

function ReportChart({ glucose, profile, from, days }: { glucose: Entry[]; profile: Profile; from: number; days: number }) {
  if (glucose.length < 2) return <p>Sin datos suficientes en el periodo.</p>
  const to = Date.now()
  const vals = glucose.map(e => e.value!)
  const ymin = Math.max(40, Math.min(profile.low - 25, Math.min(...vals) - 12))
  const ymax = Math.min(320, Math.max(profile.high + 30, Math.max(...vals) + 14))
  const X = (ts: number) => 4 + ((ts - from) / (to - from)) * (W - 38)
  const Y = (v: number) => 6 + (1 - (Math.max(ymin, Math.min(ymax, v)) - ymin) / (ymax - ymin)) * (H - 26)
  const sorted = [...glucose].sort((a, b) => a.ts - b.ts)
  const ticks = [Math.round(days * 0.85), Math.round(days * 0.55), Math.round(days * 0.25), 0].map(
    d => to - d * 86400e3,
  )
  const color = (v: number) => {
    const r = rangeOf(v, profile)
    return r === 'low' ? '#b3261e' : r === 'high' ? '#9a6a00' : '#2F7A50'
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%' }} role="img" aria-label="Glucemias del periodo">
      <rect x={4} y={Y(profile.high)} width={W - 38} height={Y(profile.low) - Y(profile.high)} fill="#e9f1ea" />
      {[profile.low, profile.high].map(v => (
        <g key={v}>
          <line x1={4} x2={W - 34} y1={Y(v)} y2={Y(v)} stroke="#d6d2c6" strokeWidth="1" />
          <text x={W - 30} y={Y(v) + 3.5} fontSize="10" fill="#8a8e7f">
            {v}
          </text>
        </g>
      ))}
      {ticks.map(ts => (
        <text key={ts} x={X(ts)} y={H - 4} fontSize="9" fill="#8a8e7f" textAnchor="middle">
          {fmtDayShort(ts)}
        </text>
      ))}
      <path
        d={sorted.map((e, i) => `${i ? 'L' : 'M'}${X(e.ts).toFixed(1)} ${Y(e.value!).toFixed(1)}`).join(' ')}
        fill="none"
        stroke="#b9bdb0"
        strokeWidth="1.2"
      />
      {sorted.map(e => (
        <circle key={e.id} cx={X(e.ts)} cy={Y(e.value!)} r={days > 30 ? 2.2 : 3.2} fill={color(e.value!)} />
      ))}
    </svg>
  )
}
