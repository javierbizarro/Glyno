import type { Entry } from '../../domain/types'
import { entries } from '../../app/container'
import { fmtDayShort, fmtTime } from '../format'
import { entryText, KIND_ICO } from '../entryDisplay'

/** confirmación antes de borrar: un toque suelto no debería llevarse un registro por delante */
export function DeleteEntrySheet({ entry, onClose }: { entry: Entry; onClose: () => void }) {
  const del = async () => {
    if (entry.id != null) await entries.remove(entry.id)
    onClose()
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <h3>¿Borrar este registro?</h3>
        <div className="row card" style={{ padding: '12px 14px' }}>
          <span className="entry-ico">{KIND_ICO[entry.kind]}</span>
          <span style={{ flex: 1, fontSize: 14.5 }}>{entryText(entry)}</span>
          <span className="muted small">
            {fmtDayShort(entry.ts)} {fmtTime(entry.ts)}
          </span>
        </div>
        <p className="muted small">Solo desaparece de tu diario. Esto no se puede deshacer.</p>
        <div className="row">
          <button className="btn ghost" style={{ flex: 1 }} onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn"
            style={{ flex: 1, background: 'var(--red)' }}
            onClick={del}
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  )
}
