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

## Ejercicio: entrenamientos desde Salud, NUNCA GPS propio (decidido 2026-08-04)

- Javier preguntó por rastrear caminatas/carreras con GPS (distancia, velocidad, kcal). Decidido
  que NO: (a) una PWA no puede usar GPS en segundo plano (pantalla encendida toda la ruta), y
  (b) sería competir con Strava/Entreno/Garmin sin aportar nada diabetes-específico — el mismo
  principio de «no perseguir cada sensor».
- Lo que SÍ: los entrenamientos ya acaban en Apple Salud (acción «Buscar entrenamientos» de
  Atajos) y en Health Connect (`ExerciseSessionRecord`). Las fases A y B los importan como una
  línea más: entries `exercise` con tipo, minutos y **distancia opcional** (`distanceKm?`).
- **Calorías quemadas y velocidad media: no se guardan ni se muestran.** Coherente con «el
  semáforo NUNCA las calorías» y con la tarjeta de movimiento sin compensación calórica: mostrar
  kcal quemadas invita al bucle «he quemado X, puedo comer Y», que es justo lo que no queremos.
- **Pasos automáticos y tarjeta de movimiento (decidido por Javier 2026-08-04)**: un día cuenta
  como «día que te has movido» a partir de un **umbral alto de pasos (~8.000, constante en
  domain/)**, además de por ejercicio registrado. Trade-off asumido: la tarjeta felicitará algún
  día de rutina sin ejercicio deliberado — el objetivo es que el usuario se mueva, no que use el
  botón. Los pasos por debajo del umbral no cuentan (que ir a la nevera no sea «moverse»).

## Coste oculto: 96 lecturas/día rompen la interfaz actual

Todo lo construido asume 4-5 glucemias diarias. Con sensor continuo:
- La **tabla día×momento del informe** explota (habría que mostrar medias por franja, no valores).
- El **historial semanal** y la gráfica de 14 días se saturan de puntos → pasar de puntos a
  **línea/banda con percentiles (estilo AGP)**: mediana + p25-p75 + p5-p95 por hora del día.
- `computeStats` sigue valiendo (TIR con 96 lecturas es incluso más correcto), pero conviene
  distinguir "TIR de sensor" de "TIR de 4 pinchazos" en el informe, porque no son comparables.
- Estimar 1-2 días de trabajo solo para esta parte, tanto como la integración en sí.

## Hoja de ruta consolidada (2026-08-04, tras repasarla con Javier)

- **Fase 0**: publicar el post de LinkedIn y leer la señal (GoatCounter + mensajes). Todo lo
  demás se dispara por demanda, no por estrategia.
- Orden recomendado: 0 → A (le sirve a Javier ya: sueño+pasos) → A0/B/C solo bajo demanda.
- **Decidido: en Android NO se reescribe en Kotlin.** La APK es Capacitor (WebView del mismo
  `dist` + plugins nativos). Una base de código, tres trajes; dos apps paralelas sería duplicar
  dominio, tests y pantallas para una ganancia invisible en una app de formularios y gráficas.
- La fontanería común (campos `extId`/`source`, Dexie v2 con índice, caso de uso de sync con
  dedupe) se construye UNA vez en la primera fase que se haga; el resto son grifos del mismo tubo.
- Las gráficas AGP (bandas de percentiles) van pegadas al primer grifo con densidad de sensor
  (A0 o B), no antes.

## Fases propuestas (en este orden)

### Fase A0 — Importar CSV del fabricante (0 €, pura web, la más barata de todas)
- **LibreView** (Abbott) y **Dexcom Clarity** permiten exportar el histórico de glucosa a CSV desde
  su web. Añadir a Glyno un importador de esos dos formatos (ya existe la infraestructura de
  importación de copias): el usuario exporta una vez por semana y arrastra el fichero.
- Fricción por lotes (1 min/semana) en vez de fricción por lectura. No es automático, pero da el
  histórico completo del sensor sin tocar nativo, sin tokens y sin APIs no oficiales.
- Dedupe igualmente obligatorio (`extId` derivado de fecha+valor+origen).
- Nota curiosa para glucómetro de dedo: los medidores Bluetooth estándar (perfil GATT 0x1808)
  se pueden leer con **Web Bluetooth** desde Chrome en Android/escritorio — nunca en iOS/Safari.
  Nicho, pero es la única vía «automática» 100% web que existe.

### Fase A — Puente con Atajos de iOS (0 €, ~2-3 h, sin Xcode)
- Entrega principal: **portapapeles**. El atajo deja el JSON copiado y en Ajustes hay un botón
  «Pegar datos de Salud». Motivo: en iOS la PWA instalada y Safari tienen **IndexedDB separadas** —
  si el atajo abre una URL, los datos entran en el Safari «equivocado», no en la app instalada.
- Entrega secundaria por URL: SOLO con fragmento (`#import=<json>`), JAMÁS query (`?import=`):
  la query viaja al servidor y dejaría glucemias en los logs de GitHub Pages. El fragmento no
  sale del navegador. (Corregido 2026-08-04; el plan original decía `?import=` — error.)
- Ambas rutas crean entries con `source: 'health'` y `extId` derivado (dedupe al reimportar).
- Atajo de iOS documentado y compartido por enlace de iCloud: acciones «Buscar muestras de salud»
  y «Buscar entrenamientos» (sueño, pasos, glucosa que escribe LibreLink, ejercicio con distancia)
  → formatea → copia al portapapeles. Automatización diaria a las 22:30 sin confirmación.
- **Forzar actualización a demanda (pedido 2026-08-04)**: botón «Traer datos de Salud ahora» en
  Glyno que lanza el atajo por su esquema de URL (`shortcuts://run-shortcut?name=Glyno%20Salud`);
  al volver a Glyno, aviso de pegado en un toque. El mismo atajo queda invocable por Siri, icono
  de inicio o botón de acción. iOS no permite leer el portapapeles sin gesto: 3 gestos es el
  mínimo real en la fase A. El dedupe por `extId` hace el botón idempotente.
- En fases B/C el botón es nativo de verdad: «Sincronizar ahora» + **sync automático al volver la
  app a primer plano** (visibilitychange/resume).
- Expectativa honesta: para glucosa, Salud va por detrás del sensor (LibreLink vuelca con
  retraso variable); el botón trae lo más fresco que Salud tenga. Pasos/sueño/entrenos: al día.
- En Android no hay equivalente preinstalado a Atajos. **Tasker** (~3,5€ del usuario, pago único)
  sí lee Health Connect y puede alimentar la misma fontanería (portapapeles / `#import`); tareas
  compartibles por TaskerNet. MacroDroid/Automate: soporte parcial según versión — verificar al
  retomarlo. PERO: en Android lo nativo (fase B) es gratis de distribuir, así que el puente por
  automatización tiene poco recorrido — mejor saltar directo a la APK cuando haya demanda.
- A favor de Android: la PWA instalada comparte almacén con Chrome (no existe el problema del
  «Safari equivocado» de iOS) y soporta **Web Share Target** (manifest `share_target`): Glyno
  puede aparecer en el menú compartir del sistema y recibir ficheros/texto directamente.
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
