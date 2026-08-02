/// <reference types="vite/client" />

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
}

interface Window {
  glynoInstallPrompt?: BeforeInstallPromptEvent
}
