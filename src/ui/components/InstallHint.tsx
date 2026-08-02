import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
}

const isStandalone = () =>
  matchMedia('(display-mode: standalone)').matches ||
  ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true)

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent)

// tarjeta de instalación: botón nativo en Android/Chrome, guía en iOS.
// Solo aparece en navegador (no instalada) y se puede descartar para siempre.
export function InstallHint() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [hidden, setHidden] = useState(() => isStandalone() || localStorage.getItem('glyno.installHint') === 'no')

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => setHidden(true)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (hidden) return null
  if (!deferred && !isIos()) return null

  const dismiss = () => {
    localStorage.setItem('glyno.installHint', 'no')
    setHidden(true)
  }

  return (
    <div className="card stack">
      <span className="label">Lleva a Glyno contigo</span>
      {deferred ? (
        <>
          <p className="muted small">Instálala y tendrás a Glyno en tu pantalla de inicio, con o sin internet.</p>
          <button className="btn" onClick={() => deferred.prompt()}>
            Instalar Glyno
          </button>
        </>
      ) : (
        <>
          <p className="muted small">Para tenerla como una app en tu iPhone:</p>
          <p className="small" style={{ lineHeight: 1.7 }}>
            1. Toca el botón <b>compartir</b> de Safari (□ con flecha ↑)
            <br />
            2. Elige <b>«Añadir a pantalla de inicio»</b> y confirma
          </p>
        </>
      )}
      <button className="btn ghost small" onClick={dismiss}>
        No, gracias
      </button>
    </div>
  )
}
