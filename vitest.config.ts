import { defineConfig } from 'vitest/config'

// standalone config: domain/app tests are pure TS and don't need the app's
// Vite plugins (React, PWA) — Vitest picks this file over vite.config.ts
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
