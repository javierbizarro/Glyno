import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource-variable/fraunces/full.css'
import '@fontsource-variable/lora'
import '@fontsource-variable/inter'
import './theme.css'
import App from './App'
import { resetAll } from './app/container'

// almacenamiento persistente: el navegador no purgará IndexedDB por presión de espacio
navigator.storage?.persist?.()

// beforeinstallprompt se dispara antes de que React monte: hay que guardarlo aquí o se pierde
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault()
  window.glynoInstallPrompt = e as BeforeInstallPromptEvent
  window.dispatchEvent(new Event('glyno:installable'))
})

// "make reset" abre /?reset: borra perfil y diario y deja la app como recién instalada
if (new URLSearchParams(location.search).has('reset')) {
  resetAll().finally(() => location.replace(import.meta.env.BASE_URL))
} else {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}
