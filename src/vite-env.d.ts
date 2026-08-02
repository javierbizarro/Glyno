/// <reference types="vite/client" />

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
}

interface Window {
  glynoInstallPrompt?: BeforeInstallPromptEvent
}

declare const __BUILD__: string
