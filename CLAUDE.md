# Glyno — copiloto de diabetes (PWA)

App personal para diabéticos: diario de glucemias/tensión/comidas/ejercicio/contexto,
mascota 3D (Glyno) y valoraciones con IA (Gemini free tier). Objetivo: coste 0 real.

## Cómo se trabaja en este proyecto

- TODO corre en Docker: `make up` / `make down` / `make reset` / `make logs` / `make clean`.
  NUNCA ejecutar npm/node en el host (el usuario no quiere instalar nada en local).
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
- Glyno 3D: procedural con three.js en `src/components/Mascot3D.tsx` (pera + brazos + brote).
  Saluda cada 5 s, parpadea, respira. Sin modelos externos.

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

## Memoria detallada

Lee `.claude/memoria.md` (decisiones de producto y técnica, estado de fases, pendientes)
y **actualízala al cerrar cada fase o decisión importante**.
