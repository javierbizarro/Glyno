import { useState } from 'react'
import { health } from '../../app/container'
import { healthImportSummary } from '../../app/healthImport'
import { lastSync, syncHealth } from '../../app/healthSync'
import { timeAgo } from '../format'

/**
 * Salud on the iPhone. Only ever reads, and says so where the user decides — the permission
 * sheet iOS shows says the same thing, and both are true: nothing read here leaves the phone.
 */
export function HealthCard() {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [since, setSince] = useState(lastSync())

  const sync = async () => {
    setBusy(true)
    setMsg('')
    try {
      // asking every time is free: iOS only shows the sheet for what it has not asked yet
      await health.request()
      const result = await syncHealth(health)
      setMsg(result ? healthImportSummary(result) : 'Este dispositivo no tiene Salud.')
      setSince(lastSync())
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'No he podido leer Salud.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card stack">
      <span className="label">Salud del iPhone</span>
      <p className="muted small">
        Glucosa, pasos, sueño, peso, tensión y entrenamientos entran solos en tu diario. Glyno
        solo lee: no escribe nada en Salud y nada de esto sale de tu iPhone.
      </p>
      <button className="btn ghost" onClick={sync} disabled={busy}>
        {busy ? 'Leyendo Salud…' : 'Traer datos de Salud'}
      </button>
      {msg && <span className="small">{msg}</span>}
      <span className="muted small">
        {since ? `Última lectura ${timeAgo(since)}.` : 'Todavía no he leído nada de Salud.'}
      </span>
    </div>
  )
}
