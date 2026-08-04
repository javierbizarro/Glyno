import { useState } from 'react'
import type { Entry, Profile } from '../../domain/types'
import { computeStats } from '../../domain/stats'
import { rangeOf } from '../../domain/glucose'
import { daysAgo } from '../../domain/time'
import { bmiOf, WEIGHT_FOCUS_BMI, weeklyWeights, weightTrendPerWeek } from '../../domain/weight'
import { entries as repo } from '../../app/container'
import { seedDemo } from '../../app/demo'
import { useWatch } from '../hooks'
import { fmtDayShort, fmtTime, RANGE_LABEL, RANGE_VAR } from '../format'
import { Report } from './Report'
import { History } from './History'

export function Trends({ profile }: { profile: Profile }) {
  const [reportOpen, setReportOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const entries = useWatch(() => repo.watchSince(daysAgo(13)), [])

  if (!entries) return null
  if (historyOpen) return <History profile={profile} onClose={() => setHistoryOpen(false)} />
  const glucose = entries.filter(e => e.kind === 'glucose' && e.value != null)
  const stats = computeStats(entries, profile)

  // only stays empty when there's NOTHING: a single entry already starts drawing,
  // and someone who doesn't measure glucose may still log blood pressure or weight
  if (entries.length === 0) {
    return (
      <>
        <h1>Tendencias</h1>
        <div className="card stack" data-tour="trends">
          <p className="muted">
            Aquí aparecerán tus últimos 14 días: la curva de glucemia con tu rango objetivo, el tiempo
            en rango y los patrones. Empieza a apuntar y esto se va llenando.
          </p>
          <button className="btn ghost" onClick={() => seedDemo(profile)}>
            Cargar 14 días de ejemplo
          </button>
          <p className="muted small">Los datos de ejemplo se borran en Ajustes o registrando los tuyos.</p>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="row between">
        <h1>Tendencias</h1>
        <div className="wrap">
          <button className="btn ghost small" onClick={() => setHistoryOpen(true)}>
            Historial
          </button>
          <button className="btn ghost small" onClick={() => setReportOpen(true)}>
            Informe
          </button>
        </div>
      </div>
      <span className="label">Últimos 14 días</span>
      {reportOpen && <Report profile={profile} onClose={() => setReportOpen(false)} />}

      {glucose.length > 0 && (
        <>
          <div className="stat-tiles" data-tour="trends">
            <div className="card">
              <span className="serif" style={{ color: stats.mean != null && rangeOf(stats.mean, profile) !== 'in' ? RANGE_VAR[rangeOf(stats.mean!, profile)] : 'var(--ink)' }}>
                {Math.round(stats.mean ?? 0)}
              </span>
              <div className="label">Media</div>
            </div>
            <div className="card">
              <span className="serif" style={{ color: 'var(--green)' }}>{Math.round(stats.tir)}%</span>
              <div className="label">En rango</div>
            </div>
            <div className="card">
              <span className="serif">{stats.n}</span>
              <div className="label">Registros</div>
            </div>
          </div>

          {stats.n < 10 && (
            <p className="muted small">
              Con {stats.n} {stats.n === 1 ? 'medición' : 'mediciones'} los porcentajes bailan mucho:
              esto se vuelve fiable a partir de unos días de registros.
            </p>
          )}

          <div className="card">
            <div className="row between" style={{ marginBottom: 8 }}>
              <span className="label">Glucemia</span>
              <span className="muted small">rango {profile.low}–{profile.high}</span>
            </div>
            <GlucoseChart points={glucose} profile={profile} />
            <details className="table-view">
              <summary>Ver como tabla</summary>
              <table className="data">
                <thead>
                  <tr><th>Día</th><th>Hora</th><th>mg/dl</th><th>Momento</th></tr>
                </thead>
                <tbody>
                  {[...glucose].reverse().slice(0, 20).map(e => (
                    <tr key={e.id}>
                      <td>{fmtDayShort(e.ts)}</td>
                      <td>{fmtTime(e.ts)}</td>
                      <td style={{ color: RANGE_VAR[rangeOf(e.value!, profile)], fontWeight: 600 }}>{e.value}</td>
                      <td className="muted">{e.note ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </div>

          <div className="card stack">
            <span className="label">Tiempo en rango</span>
            <TirBar pctLow={stats.pctLow} tir={stats.tir} pctHigh={stats.pctHigh} />
          </div>
        </>
      )}

      {(stats.tagEffects.length > 0 || stats.exerciseDelta != null) && (
        <div className="card stack">
          <span className="label">Patrones que asoman</span>
          {stats.exerciseDelta != null && stats.exerciseDays >= 2 && (
            <PatternRow
              label={`Días con ejercicio (${stats.exerciseDays})`}
              delta={stats.exerciseDelta}
            />
          )}
          {stats.tagEffects.slice(0, 4).map(t => (
            <PatternRow key={t.label} label={`Tras «${t.label}» (×${t.n})`} delta={t.delta} />
          ))}
          <p className="muted small">
            Medias comparadas con tu media general. Glyno los interpretará contigo en su pestaña.
          </p>
        </div>
      )}

      {profile.hypertension && <BpCard entries={entries} />}
      <WeightCard profile={profile} />
    </>
  )
}

function WeightCard({ profile }: { profile: Profile }) {
  const weights = useWatch(() => repo.watchByKind('weight'), [])
  if (!weights || weights.length === 0) return null
  const last = weights[weights.length - 1]
  const bmi = bmiOf(last.value, profile.heightCm)
  const focus = bmi != null && bmi >= WEIGHT_FOCUS_BMI
  const target = profile.targetWeightKg

  // the chart draws the WEEKLY MEAN: the daily number bounces with water and salt,
  // the week is the honest granularity for a trend
  const weekly = weeklyWeights(weights)
  const trend = weightTrendPerWeek(weekly)
  const kg = (x: number) => String(Math.round(x * 10) / 10).replace('.', ',')

  const CH = 104
  const vals = weekly.map(s => s.mean)
  const all = target ? [...vals, target] : vals
  const vmin = Math.min(...all) - 1
  const vmax = Math.max(...all) + 1
  const t0 = weekly[0].from
  const t1 = weekly[weekly.length - 1].from
  const Xw = (ts: number) => 10 + (t1 > t0 ? (ts - t0) / (t1 - t0) : 0) * (W - 78)
  const Yw = (v: number) => 12 + (1 - (v - vmin) / (vmax - vmin)) * (CH - 34)
  const path = weekly.map((s, i) => `${i ? 'L' : 'M'}${Xw(s.from).toFixed(1)} ${Yw(s.mean).toFixed(1)}`).join(' ')
  const lastMean = weekly[weekly.length - 1]

  return (
    <div className="card stack">
      <div className="row between">
        <span className="label">Peso</span>
        <span className="muted small">
          {kg(last.value!)} kg{bmi ? ` · IMC ${bmi.toFixed(1)}` : ''}
        </span>
      </div>
      {weekly.length >= 2 ? (
        <>
          <svg viewBox={`0 0 ${W} ${CH}`} style={{ width: '100%', display: 'block' }} role="img" aria-label="Media semanal del peso">
            {target != null && (
              <g>
                <line x1={10} x2={W - 68} y1={Yw(target)} y2={Yw(target)} stroke="var(--green)" strokeWidth="1.2" strokeDasharray="4 4" />
                <text x={W - 64} y={Yw(target) + 3.5} fontSize="10" fill="var(--green)">
                  objetivo {kg(target)}
                </text>
              </g>
            )}
            <path d={path} fill="none" stroke="var(--ink)" strokeWidth="2" />
            {weekly.map(s => (
              <circle key={s.from} cx={Xw(s.from)} cy={Yw(s.mean)} r="3.5" fill="var(--ink)" stroke="var(--card)" strokeWidth="1.4" />
            ))}
            <text x={Xw(lastMean.from) + 7} y={Yw(lastMean.mean) + 3.5} fontSize="10" fill="var(--ink-2)">
              {kg(lastMean.mean)}
            </text>
            {[weekly[0], lastMean].map((s, i) => (
              <text
                key={s.from}
                x={i === 0 ? 2 : Xw(s.from)}
                y={CH - 4}
                fontSize="9.5"
                fill="var(--ink-3)"
                textAnchor={i === 0 ? 'start' : 'middle'}
              >
                {fmtDayShort(s.from)}
              </text>
            ))}
          </svg>
          <p className="muted small">
            Media semanal de tus pesadas.
            {trend != null && Math.abs(trend) >= 0.05
              ? ` Ahora mismo, ${trend < 0 ? 'bajando' : 'subiendo'} ${kg(Math.abs(trend))} kg por semana.`
              : ''}
            {target != null && last.value! > target ? ` Objetivo pactado: ${kg(target)} kg.` : ''}
          </p>
        </>
      ) : (
        <p className="muted small">
          Apunta el peso una vez por semana: la gráfica usa la media semanal, que es la que no baila
          con el agua y la sal del día.
        </p>
      )}
      {focus && (
        <p className="muted small">
          Con tu IMC, perder un 5-10 % del peso mejora mucho el control glucémico. El cómo — ritmo y
          plan — se pacta con tu equipo sanitario, no con una app.
        </p>
      )}
    </div>
  )
}

function PatternRow({ label, delta }: { label: string; delta: number }) {
  const up = delta > 0
  return (
    <div className="row between">
      <span style={{ fontSize: 14.5 }}>{label}</span>
      <span className={`pill ${up ? 'high' : 'in'}`}>
        {up ? '+' : ''}
        {Math.round(delta)} mg/dl
      </span>
    </div>
  )
}

function TirBar({ pctLow, tir, pctHigh }: { pctLow: number; tir: number; pctHigh: number }) {
  const segs = [
    { k: 'low', pct: pctLow, color: 'var(--red)', label: 'Baja' },
    { k: 'in', pct: tir, color: 'var(--green)', label: 'En rango' },
    { k: 'high', pct: pctHigh, color: 'var(--amber)', label: 'Alta' },
  ].filter(s => s.pct > 0.5)
  return (
    <>
      <div className="tir-bar">
        {segs.map(s => (
          <div key={s.k} style={{ width: `${s.pct}%`, background: s.color, borderRadius: 4 }} />
        ))}
      </div>
      <div className="legend">
        {segs.map(s => (
          <span className="item" key={s.k}>
            <span className="dot" style={{ background: s.color }} />
            {s.label} · <b>{Math.round(s.pct)}%</b>
          </span>
        ))}
      </div>
    </>
  )
}

const W = 360
const H = 190
const ML = 4
const MR = 30
const MT = 8
const MB = 20

function GlucoseChart({ points, profile }: { points: Entry[]; profile: Profile }) {
  const [tip, setTip] = useState<Entry | null>(null)
  const t0 = daysAgo(13)
  const t1 = Date.now()
  const sorted = [...points].sort((a, b) => a.ts - b.ts)

  // scale fitted to the data: out-of-range excursions gain resolution
  const vals = sorted.map(e => e.value!)
  const YMIN = Math.max(40, Math.min(profile.low - 25, Math.min(...vals) - 12))
  const YMAX = Math.min(320, Math.max(profile.high + 30, Math.max(...vals) + 14))

  const X = (ts: number) => ML + ((ts - t0) / (t1 - t0)) * (W - ML - MR)
  const Y = (v: number) => {
    const c = Math.max(YMIN, Math.min(YMAX, v))
    return MT + (1 - (c - YMIN) / (YMAX - YMIN)) * (H - MT - MB)
  }

  const out = (e: Entry) => rangeOf(e.value!, profile) !== 'in'
  const outliers = sorted.filter(out)
  // selective direct labels: all out-of-range points if there are few; otherwise only the extremes
  const labelled = new Set(
    (outliers.length <= 6
      ? outliers
      : [
          outliers.reduce((a, b) => (a.value! > b.value! ? a : b)),
          outliers.reduce((a, b) => (a.value! < b.value! ? a : b)),
        ]
    ).map(e => e.id),
  )
  const path = sorted.map((e, i) => `${i ? 'L' : 'M'}${X(e.ts).toFixed(1)} ${Y(e.value!).toFixed(1)}`).join(' ')
  const dayTicks = [11, 7, 3, 0].map(d => daysAgo(d))

  const onMove = (ev: React.PointerEvent<SVGSVGElement>) => {
    const rect = ev.currentTarget.getBoundingClientRect()
    const px = ((ev.clientX - rect.left) / rect.width) * W
    let best: Entry | null = null
    let bd = 24
    for (const e of sorted) {
      const d = Math.abs(X(e.ts) - px)
      if (d < bd) {
        bd = d
        best = e
      }
    }
    setTip(best)
  }

  return (
    <div style={{ position: 'relative' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', display: 'block', touchAction: 'none' }}
        onPointerMove={onMove}
        onPointerLeave={() => setTip(null)}
        role="img"
        aria-label="Glucemias de los últimos 14 días"
      >
        {/* target range band */}
        <rect
          x={ML}
          y={Y(profile.high)}
          width={W - ML - MR}
          height={Y(profile.low) - Y(profile.high)}
          fill="var(--green-soft)"
          rx="4"
        />
        {[profile.low, profile.high].map(v => (
          <g key={v}>
            <line x1={ML} x2={W - MR} y1={Y(v)} y2={Y(v)} stroke="var(--line)" strokeWidth="1" />
            <text x={W - MR + 4} y={Y(v) + 3.5} fontSize="10" fill="var(--ink-3)">
              {v}
            </text>
          </g>
        ))}
        {/* day ticks */}
        {dayTicks.map(ts => (
          <text key={ts} x={X(ts)} y={H - 6} fontSize="9.5" fill="var(--ink-3)" textAnchor="middle">
            {fmtDayShort(ts)}
          </text>
        ))}
        {/* thin line + points by state (out-of-range ones get a halo and are larger) */}
        <path d={path} fill="none" stroke="var(--ink-3)" strokeWidth="1.4" opacity="0.55" />
        {sorted.map(e => {
          const r = rangeOf(e.value!, profile)
          const isOut = r !== 'in'
          return (
            <g key={e.id}>
              {isOut && (
                <circle cx={X(e.ts)} cy={Y(e.value!)} r="8.5" fill="none" stroke={RANGE_VAR[r]} strokeWidth="1.4" opacity="0.4" />
              )}
              <circle
                cx={X(e.ts)}
                cy={Y(e.value!)}
                r={tip?.id === e.id ? 6 : isOut ? 5.2 : 3.8}
                fill={RANGE_VAR[r]}
                stroke="var(--card)"
                strokeWidth="1.6"
              />
              {labelled.has(e.id) && (
                <text
                  x={X(e.ts)}
                  y={Y(e.value!) + (r === 'low' ? 18 : -11)}
                  fontSize="10"
                  fontWeight="650"
                  fill={RANGE_VAR[r]}
                  textAnchor="middle"
                >
                  {e.value}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      {tip && (
        <div
          className="chart-tip"
          style={{ left: `${(X(tip.ts) / W) * 100}%`, top: `${(Y(tip.value!) / H) * 100}%` }}
        >
          <b>{tip.value}</b> mg/dl · {RANGE_LABEL[rangeOf(tip.value!, profile)]}
          <br />
          {fmtDayShort(tip.ts)} {fmtTime(tip.ts)}
          {tip.note ? ` · ${tip.note}` : ''}
        </div>
      )}
    </div>
  )
}

function BpCard({ entries }: { entries: Entry[] }) {
  const bps = entries.filter(e => e.kind === 'bp' && e.sys && e.dia).sort((a, b) => a.ts - b.ts)
  if (bps.length < 2) return null
  const t0 = daysAgo(13)
  const t1 = Date.now()
  const ymin = 40
  const ymax = 180
  const X = (ts: number) => ML + ((ts - t0) / (t1 - t0)) * (W - ML - 58)
  const Y = (v: number) => 8 + (1 - (Math.max(ymin, Math.min(ymax, v)) - ymin) / (ymax - ymin)) * (120 - 8 - 16)
  const line = (get: (e: Entry) => number) =>
    bps.map((e, i) => `${i ? 'L' : 'M'}${X(e.ts).toFixed(1)} ${Y(get(e)).toFixed(1)}`).join(' ')
  const last = bps[bps.length - 1]

  return (
    <div className="card">
      <div className="row between" style={{ marginBottom: 8 }}>
        <span className="label">Tensión</span>
        <span className="muted small">
          media {Math.round(bps.reduce((s, e) => s + e.sys!, 0) / bps.length)}/
          {Math.round(bps.reduce((s, e) => s + e.dia!, 0) / bps.length)}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} 120`} style={{ width: '100%', display: 'block' }} role="img" aria-label="Tensión arterial">
        <line x1={ML} x2={W - 58} y1={Y(140)} y2={Y(140)} stroke="var(--line)" strokeWidth="1" strokeDasharray="3 3" />
        <text x={ML + 2} y={Y(140) - 4} fontSize="9.5" fill="var(--ink-3)">140</text>
        <path d={line(e => e.sys!)} fill="none" stroke="var(--ink)" strokeWidth="2" />
        <path d={line(e => e.dia!)} fill="none" stroke="var(--green)" strokeWidth="2" />
        <text x={X(last.ts) + 6} y={Y(last.sys!) + 3} fontSize="10" fill="var(--ink)">
          Sistólica
        </text>
        <text x={X(last.ts) + 6} y={Y(last.dia!) + 3} fontSize="10" fill="var(--green)">
          Diastólica
        </text>
      </svg>
    </div>
  )
}
