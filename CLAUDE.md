# Glyno — copiloto de diabetes (PWA)

App personal para diabéticos: diario de glucemias/tensión/comidas/ejercicio/contexto,
mascota 3D (Glyno) y valoraciones con IA (Gemini free tier). Objetivo: coste 0 real.

## Cómo se trabaja en este proyecto

- TODO corre en Docker: `make up` / `make down` / `make reset` / `make logs` / `make clean`.
  NUNCA ejecutar npm/node en el host (el usuario no quiere instalar nada en local).
  **ÚNICA EXCEPCIÓN, pactada el 2026-08-30: la app iOS.** Capacitor, CocoaPods y Xcode no pueden
  correr en Docker. `make ios` compila los assets DENTRO de Docker y solo la parte nativa
  (`npx cap copy`, `xcodebuild`, `simctl`) en el Mac. Nada más se ejecuta fuera del contenedor.
- Los datos del usuario viven en el navegador (IndexedDB `glyno` + localStorage `glyno.profile`).
  `make reset` los borra abriendo `/?reset`. Apagar Docker NO borra datos.
- UI 100% en español, tono cercano (Glyno habla de tú). PERO el código y los commits van
  **en inglés**: comentarios, identificadores, mensajes de commit y las claves del JSON que
  devuelve Gemini. Son español (NO traducir): textos de UI, cuerpos de los prompts, datos de
  demo y los valores que se guardan en el diario ('ayunas', 'Mal sueño', 'sugerida por Glyno'…).
- Metodología pactada con Javier: **fase a fase, comprobando cada una en el navegador antes de seguir**.
  Hay tareas creadas con el estado de cada fase.
- **TDD en `domain/` y `app/`**: la lógica nueva nace con su test (Vitest, `src/**/*.test.ts`,
  en inglés). La UI no lleva TDD estricto. Nunca testear la respuesta real de Gemini (no
  determinista): se testean los prompts (líneas rojas incluidas) y el parseo. `make test` para
  correr la batería; el pre-commit (`.githooks/`, activado por `make up`) y el CI la ejecutan
  siempre. Si un test estorba, se arregla el test o el código — jamás se commitea con `--no-verify`
  salvo emergencia pactada.
- Javier quiere que se le **lleve la contraria** cuando su idea tenga pegas: consejo honesto, no complacencia.

## Diseño (que no parezca hecho por IA)

- Papel cálido `#F7F2E9`, tinta `#23271F`, verde `#3D6B4F`, ámbar `#96721B` (alta), rojo `#A63D2A` (baja).
- Tipografías (fontsource, empaquetadas, sin CDN): **Lora** titulares, **Fraunces** SOLO numerales
  grandes (su J descendente parece deformada en titulares — ya mordimos esa piedra), **Inter** UI.
- Glyno 3D: procedural con three.js en `src/ui/components/Mascot3D.tsx` — cuerpo redondeado,
  brazos con globos y **brote** en la cabeza. La CARA (ojos grandes con dos brillos y sonrisa
  ancha) es la que dibujó la hija de Javier: no se toca. Late, parpadea y respira. Sin modelos
  externos. NO usar un corazón como cuerpo (se lee como app de tensión, y la app ya usa 🫀 para
  eso) ni una corona (es la insignia universal de «premium», justo lo contrario de Glyno).
  El mismo dibujo alimenta `Mascot.tsx` (plano, barra de pestañas) y `public/icon.svg`.

## Líneas rojas de producto

- NUNCA sugerir dosis ni cambios de medicación (ni la IA ni la UI). Disclaimer visible.
- Los datos de salud no salen del dispositivo. Dos únicas excepciones, ambas documentadas en el
  README: llamadas a Gemini con la clave del propio usuario, y un ping anónimo de apertura a
  GoatCounter (`src/app/analytics.ts` — sin cookies ni identificadores; respeta DNT/GPC; NUNCA
  añadir más telemetría ni eventos).
- Si algún día calcula dosis → sería producto sanitario (MDR/CE). No entrar ahí.

## Arquitectura (hexagonal pragmática)

`domain/` (puro) ← `ports/` (interfaces) ← `adapters/` (Dexie/localStorage/Gemini) ← `app/`
(casos de uso; `container.ts` es la composición raíz) ← `ui/` (React; usa `useWatch` de
`ui/hooks.ts` para reactividad). REGLA: la UI nunca importa de `adapters/`; la lógica de negocio
nueva va a `domain/` si es pura o a `app/` si orquesta puertos.

## App iOS (Capacitor, desde 0.10.0)

- `make ios` = build nativa (`NATIVE=1`, sin service worker) + `cap copy` + `xcodebuild` +
  instalar y lanzar en el simulador (`SIM` en el Makefile). El proyecto vive en `ios/`.
- **La build de simulador va FIRMADA** (`CODE_SIGN_IDENTITY="-"`): sin firmar, Xcode descarta los
  entitlements y HealthKit lanza una excepción de ObjC que mata la app.
- **Plugin propio en Swift**: `ios/App/App/HealthPlugin.swift` (HealthKit, solo lectura). Capacitor
  NO lo descubre solo: se registra en `MainViewController.swift`, que el `SceneDelegate` usa como
  raíz. Si vuelve a salir «plugin is not implemented on ios», mirar ahí.
- **Nunca pedir permiso de lectura sobre un tipo de correlación** (`HKCorrelationTypeIdentifier…`):
  HealthKit lanza excepción. La tensión se pide como sistólica + diastólica y se LEE como
  correlación.
- Lo nativo se decide con `app/platform.ts` (`isNative()`): fuera el ping de GoatCounter, fuera
  «Buscar actualización», fuera la tarjeta de instalar, y compartir con URL fija.
- **Guardar ficheros (copia JSON, CSV): NUNCA con `<a download>`** — WKWebView lo ignora y el botón
  no hace nada. `app/saveFile.ts` decide: ancla en web, `@capacitor/filesystem` (cache) + hoja de
  compartir en nativo. Un plugin nuevo exige `npx cap sync ios` y el paquete en el `node_modules`
  del host (el SPM apunta ahí): copiarlo con `docker compose cp`, sin npm en el Mac.
- Los datos de Salud entran por `app/healthSync.ts` → `importHealthSamples` (dedupe por `extId`,
  que para muestras puntuales es el UUID de HealthKit). Sincroniza sola al abrir y al volver.

## Memoria detallada

Lee `.claude/memoria.md` (decisiones de producto y técnica, estado de fases, pendientes)
y **actualízala al cerrar cada fase o decisión importante**.
