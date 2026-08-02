# Plan: datos automáticos (sensor de glucosa, sueño y pasos)

> Escrito el 2026-08-03 tras analizarlo con Javier. NO implementado: es el plan para retomarlo.
> Decisión: dejar el plan por escrito y decidir la fase más adelante.

## Principio que ordena todo

**No perseguir la API de cada sensor: usar Apple Salud (HealthKit) y Health Connect como fuente
única.** Las apps de FreeStyle Libre y Dexcom ya escriben la glucosa ahí, así que una sola
integración da glucosa + sueño + pasos + peso + tensión, con permiso explícito del usuario y **sin
que los datos salgan del dispositivo** (la promesa de Glyno). Perseguir cada sensor por separado es
más trabajo, más frágil y peor para la privacidad.

Alternativas SOLO si el sensor de alguien no escribe en Salud:
- **Nightscout** (la más limpia si ya lo tiene): pedir URL + token y leer `/api/v1/entries.json`.
  Funciona incluso desde la PWA (Nightscout permite CORS).
- **API oficial de Dexcom** (developer.dexcom.com, OAuth2): legítima pero con ~3 h de retraso.
  Para Glyno da igual: analizamos patrones, no somos una app de alarmas. Requiere registrar la app
  y aprobación para producción.
- **LibreLinkUp**: no oficial (ingeniería inversa) y sin CORS → desde la PWA exigiría un proxy
  propio por el que pasarían las credenciales de Abbott. Último recurso; preferible no distribuirlo.

## Arquitectura (el refactor hexagonal ya lo deja preparado)

1. Nuevo puerto `src/ports/health.ts`:
   ```ts
   export interface HealthSample { extId: string; ts: number; value: number; kind: EntryKind }
   export interface HealthSource {
     isAvailable(): Promise<boolean>
     requestPermissions(kinds: EntryKind[]): Promise<boolean>
     read(kind: EntryKind, from: number, to: number): Promise<HealthSample[]>
   }
   ```
2. Adaptadores: `adapters/healthKitSource.ts` (iOS), `adapters/healthConnectSource.ts` (Android),
   `adapters/noHealthSource.ts` (web: `isAvailable() === false`). `app/container.ts` elige según
   plataforma — **es el único fichero que se toca fuera de adapters/**.
3. Caso de uso `app/healthSync.ts`: `syncHealth(profile)` lee desde `lastSyncAt` (localStorage
   `glyno.healthSync`), convierte a `Entry` y hace `bulkAdd` de lo que no exista ya.
4. **Deduplicación obligatoria**: añadir a `Entry` los campos `extId?: string` (UUID del sample de
   Salud) y `source?: 'manual' | 'health'`. Subir versión de Dexie a 2 con índice en `extId`:
   ```ts
   this.version(2).stores({ entries: '++id, ts, kind, extId' })
   ```
   Antes de insertar, filtrar por `extId` ya presente. Sin esto, cada sincronización duplica todo.
5. La UI de registro manual se queda igual; conviene marcar visualmente lo que viene de Salud
   (icono o nota) para que el usuario entienda de dónde sale.

## Coste oculto: 96 lecturas/día rompen la interfaz actual

Todo lo construido asume 4-5 glucemias diarias. Con sensor continuo:
- La **tabla día×momento del informe** explota (habría que mostrar medias por franja, no valores).
- El **historial semanal** y la gráfica de 14 días se saturan de puntos → pasar de puntos a
  **línea/banda con percentiles (estilo AGP)**: mediana + p25-p75 + p5-p95 por hora del día.
- `computeStats` sigue valiendo (TIR con 96 lecturas es incluso más correcto), pero conviene
  distinguir "TIR de sensor" de "TIR de 4 pinchazos" en el informe, porque no son comparables.
- Estimar 1-2 días de trabajo solo para esta parte, tanto como la integración en sí.

## Fases propuestas (en este orden)

### Fase A — Puente con Atajos de iOS (0 €, ~2-3 h, sin Xcode)
- En la PWA: soporte de importación por URL, p. ej. `/?import=<json|csv comprimido>` o una caja de
  pegado en Ajustes, que crea entries con `source: 'health'` y `extId` derivado.
- Atajo de iOS documentado: acción «Buscar muestras de salud» (sueño, pasos, glucosa del día) →
  formatea → abre la URL de Glyno. Automatización diaria a las 23:00.
- En Android el equivalente necesita Tasker/MacroDroid (menos limpio) o esperar a la fase B.
- **Objetivo real de esta fase**: comprobar si los datos automáticos mejoran de verdad los patrones
  y la valoración de Glyno antes de invertir en nativo.

### Fase B — Android nativo con Capacitor (0 € de distribución)
- `npm i @capacitor/core @capacitor/cli && npx cap init && npx cap add android`; el `dist` de Vite
  es la app. Requiere **Android Studio** en el Mac (rompe la regla de "todo en Docker" — asumido).
- Plugin de Health Connect: los que hay son de comunidad (`capacitor-health-connect` y similares);
  evaluar calidad y estar dispuesto a escribir un plugin propio en Kotlin (es poco código:
  `HealthConnectClient.readRecords` de `BloodGlucoseRecord`, `SleepSessionRecord`, `StepsRecord`).
- Distribución: APK directo o F-Droid, gratis.

### Fase C — iOS nativo (99 $/año)
- Mismo código, `npx cap add ios`, plugin de HealthKit (`@perfood/capacitor-healthkit` o propio en
  Swift: `HKQuantityTypeIdentifierBloodGlucose`, `HKCategoryTypeSleepAnalysis`,
  `HKQuantityTypeIdentifierStepCount`).
- Requiere Xcode y cuenta de desarrollador de Apple (99 $/año) para instalarla más de 7 días o
  distribuir por TestFlight/App Store. La revisión de Apple es más estricta con apps de salud que
  leen HealthKit: hay que declarar el uso y NO enviar datos de salud a terceros (cumplimos, salvo
  lo que el usuario manda a Gemini con su clave: hay que declararlo).
- Sincronización: lo simple es sincronizar al abrir la app. HealthKit permite entrega en segundo
  plano, pero añade complejidad; dejarlo para después.

## Criterio para decidir el salto

Ir a nativo cuando se cumpla al menos una: (a) Javier o alguien cercano usa sensor a diario y el
registro manual se hace insufragable; (b) la fase A demuestra que sueño/pasos mejoran los patrones;
(c) hay usuarios reales pidiéndolo. Mientras no ocurra, la PWA con registro manual cubre el caso.
