import { useState } from 'react'
import type { Entry, Profile } from '../../domain/types'
import { computeStats } from '../../domain/stats'
import { rangeOf } from '../../domain/glucose'
import { weekRange } from '../../domain/week'
import { entries as repo } from '../../app/container'
import { useWatch } from '../hooks'
import { fmtDayLong, fmtTime, RANGE_VAR } from '../format'
import { entryText, KIND_ICO } from '../entryDisplay'
import { DeleteEntrySheet } from './DeleteEntrySheet'

const DAY_INITIAL = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

function weekLabel(from: number, to: number, offset: number): string {
  if (offset === 0) return 'Esta semana'
  if (offset === -1) return 'Semana pasada'
  const a = new Date(from)
  const b = new Date(to - 1)
  const sameMonth = a.getMonth() === b.getMonth()
  const start = a.toLocaleDateString('es-ES', sameMonth ? { day: 'numeric' } : { day: 'numeric', month: 'short' })
  const end = b.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  return `${start}–${end}`
}

export function History({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  const [offset, setOffset] = useState(0)
  const [toDelete, setToDelete] = useState<Entry | null>(null)
  const { from, to } = weekRange(offset)
  const week = useWatch(() => repo.watchBetween(from, to), [from])

  const glucose = week?.filter(e => e.kind === 'glucose' && e.value != null) ?? []
  const stats = week ? computeStats(week, profile) : null

  const days: { key: number; label: string; entries: Entry[] }[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(from)
    d.setDate(d.getDate() + i)
    const next = new Date(d)
    next.setDate(next.getDate() + 1)
    const dayEntries = (week ?? []).filter(e => e.ts >= d.getTime() && e.ts < next.getTime())
    if (dayEntries.length) days.push({ key: d.getTime(), label: fmtDayLong(d.getTime()), entries: dayEntries })
  }

  return (
    <>
      <div className="row" style={{ gap: 10 }}>
        <button className="btn ghost small" onClick={onClose}>
          ← Volver
        </button>
        <h1 style={{ fontSize: 22 }}>Historial</h1>
      </div>

      <div className="card row between" style={{ padding: '10px 12px' }}>
        <button className="chip" onClick={() => setOffset(o => o - 1)} aria-label="Semana anterior">
          ‹
        </button>
        <span style={{ fontWeight: 600, fontSize: 14.5 }}>{weekLabel(from, to, offset)}</span>
        <button
          className="chip"
          disabled={offset >= 0}
          style={{ opacity: offset >= 0 ? 0.35 : 1 }}
          onClick={() => setOffset(o => Math.min(0, o + 1))}
          aria-label="Semana siguiente"
        >
          ›
        </button>
      </div>

      {week && week.length === 0 && (
        <div className="card">
          <p className="muted">Nada registrado esta semana.</p>
        </div>
      )}

      {week && week.length > 0 && (
        <>
          <div className="stat-tiles">
            <div className="card">
              <span className="serif">{stats!.mean != null ? Math.round(stats!.mean) : '—'}</span>
              <div className="label">Media</div>
            </div>
            <div className="card">
              <span className="serif" style={{ color: 'var(--green)' }}>
                {glucose.length ? `${Math.round(stats!.tir)}%` : '—'}
              </span>
              <div className="label">En rango</div>
            </div>
            <div className="card">
              <span className="serif">{days.length}/7</span>
              <div className="label">Días</div>
            </div>
          </div>

          {glucose.length > 0 && (
            <div className="card">
              <span className="label">Glucemia de la semana</span>
              <WeekChart glucose={glucose} profile={profile} from={from} to={to} />
            </div>
          )}

          {toDelete && <DeleteEntrySheet entry={toDelete} onClose={() => setToDelete(null)} />}

          {days.map(d => (
            <div key={d.key}>
              <span className="label">{d.label}</span>
              <div className="card" style={{ marginTop: 6, padding: '4px 16px' }}>
                {d.entries.map(e => {
                  // only out-of-range values get colored: normal ones must not draw attention
                  const out = e.kind === 'glucose' && rangeOf(e.value!, profile) !== 'in'
                  return (
                    <button className="entry-row" key={e.id} onClick={() => setToDelete(e)} title="Tocar para borrar">
                      <span className="entry-ico">{KIND_ICO[e.kind]}</span>
                      <span
                        style={{
                          flex: 1,
                          fontSize: 14.5,
                          color: out ? RANGE_VAR[rangeOf(e.value!, profile)] : undefined,
                          fontWeight: out ? 600 : undefined,
                        }}
                      >
                        {entryText(e)}
                      </span>
                      <span className="muted small">{fmtTime(e.ts)}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </>
      )}
    </>
  )
}

const W = 340
const H = 150
const PAD = 4
const RIGHT = 26
const BOTTOM = 18

function WeekChart({ glucose, profile, from, to }: { glucose: Entry[]; profile: Profile; from: number; to: number }) {
  const vals = glucose.map(e => e.value!)
  const ymin = Math.max(40, Math.min(profile.low - 20, Math.min(...vals) - 10))
  const ymax = Math.min(320, Math.max(profile.high + 25, Math.max(...vals) + 12))
  const X = (ts: number) => PAD + ((ts - from) / (to - from)) * (W - PAD - RIGHT)
  const Y = (v: number) =>
    6 + (1 - (Math.max(ymin, Math.min(ymax, v)) - ymin) / (ymax - ymin)) * (H - 6 - BOTTOM)

  const dayBounds = Array.from({ length: 8 }, (_, i) => {
    const d = new Date(from)
    d.setDate(d.getDate() + i)
    return d.getTime()
  })

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }} role="img" aria-label="Glucemias de la semana">
      <rect
        x={PAD}
        y={Y(profile.high)}
        width={W - PAD - RIGHT}
        height={Y(profile.low) - Y(profile.high)}
        fill="var(--green-soft)"
        rx="3"
      />
      {[profile.low, profile.high].map(v => (
        <g key={v}>
          <line x1={PAD} x2={W - RIGHT} y1={Y(v)} y2={Y(v)} stroke="var(--line)" strokeWidth="1" />
          <text x={W - RIGHT + 3} y={Y(v) + 3.5} fontSize="9" fill="var(--ink-3)">
            {v}
          </text>
        </g>
      ))}
      {dayBounds.slice(1, 7).map(ts => (
        <line key={ts} x1={X(ts)} x2={X(ts)} y1={6} y2={H - BOTTOM} stroke="var(--line)" strokeWidth="0.8" />
      ))}
      {DAY_INITIAL.map((d, i) => (
        <text
          key={d + i}
          x={(X(dayBounds[i]) + X(dayBounds[i + 1])) / 2}
          y={H - 5}
          fontSize="9.5"
          fill="var(--ink-3)"
          textAnchor="middle"
        >
          {d}
        </text>
      ))}
      {glucose.map(e => (
        <circle
          key={e.id}
          cx={X(e.ts)}
          cy={Y(e.value!)}
          r={4}
          fill={RANGE_VAR[rangeOf(e.value!, profile)]}
          stroke="var(--card)"
          strokeWidth="1.4"
        />
      ))}
    </svg>
  )
}
