import { useEffect, useState } from 'react'
import { isNative } from '../../app/platform'

const isStandalone = () =>
  matchMedia('(display-mode: standalone)').matches ||
  ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true)

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent)

// Install card: native button where the browser allows it (Android/Chrome),
// manual guide on iOS. Hidden if already installed or if the user dismisses it —
// and absent altogether inside the app, which is already installed by definition.
export function InstallHint() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    () => window.glynoInstallPrompt ?? null,
  )
  const [hidden, setHidden] = useState(
    () => isNative() || isStandalone() || localStorage.getItem('glyno.installHint') === 'no',
  )

  useEffect(() => {
    const onInstallable = () => setDeferred(window.glynoInstallPrompt ?? null)
    const onInstalled = () => {
      window.glynoInstallPrompt = undefined
      setHidden(true)
    }
    window.addEventListener('glyno:installable', onInstallable)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('glyno:installable', onInstallable)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (hidden) return null

  const dismiss = () => {
    localStorage.setItem('glyno.installHint', 'no')
    setHidden(true)
  }

  const install = async () => {
    await deferred?.prompt()
    window.glynoInstallPrompt = undefined
    setDeferred(null)
  }

  return (
    <div className="card stack">
      <span className="label">Lleva a Glyno contigo</span>
      {deferred ? (
        <>
          <p className="muted small">Instálala y tendrás a Glyno en tu pantalla de inicio, con o sin internet.</p>
          <button className="btn" onClick={install}>
            Instalar Glyno
          </button>
        </>
      ) : isIos() ? (
        <>
          <p className="muted small">Para tenerla como una app en tu iPhone:</p>
          <p className="small" style={{ lineHeight: 1.7 }}>
            1. Toca el botón <b>compartir</b> de Safari (□ con flecha ↑)
            <br />
            2. Elige <b>«Añadir a pantalla de inicio»</b> y confirma
          </p>
        </>
      ) : (
        // Desktop Safari offers no install API: explaining it is the only option
        <>
          <p className="muted small">
            Glyno se instala como una app. Desde el móvil es un momento; en este ordenador:
          </p>
          <p className="small" style={{ lineHeight: 1.7 }}>
            <b>Safari</b>: menú Compartir → «Añadir al Dock»
            <br />
            <b>Chrome</b>: icono de instalar (⊕) en la barra de direcciones
          </p>
        </>
      )}
      <button className="btn ghost small" onClick={dismiss}>
        No, gracias
      </button>
    </div>
  )
}
