import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource-variable/fraunces/full.css'
import '@fontsource-variable/lora'
import '@fontsource-variable/inter'
import './theme.css'
import App from './App'
import { resetAll } from './app/container'

// persistent storage: the browser won't purge IndexedDB under storage pressure
navigator.storage?.persist?.()

// on-screen keyboard height: the logging sheets are anchored at the bottom and the keyboard covers them
const vv = window.visualViewport
if (vv) {
  const trackKeyboard = () => {
    const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
    document.documentElement.style.setProperty('--kb', `${Math.round(kb)}px`)
  }
  vv.addEventListener('resize', trackKeyboard)
  vv.addEventListener('scroll', trackKeyboard)
  trackKeyboard()
}

// beforeinstallprompt fires before React mounts: it must be captured here or it is lost
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault()
  window.glynoInstallPrompt = e as BeforeInstallPromptEvent
  window.dispatchEvent(new Event('glyno:installable'))
})

// "make reset" opens /?reset: wipes profile and diary, leaving the app as freshly installed
if (new URLSearchParams(location.search).has('reset')) {
  resetAll().finally(() => location.replace(import.meta.env.BASE_URL))
} else {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}
