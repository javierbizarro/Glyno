# Memoria del proyecto Glyno

> Actualizar al cerrar cada fase o tomar una decisión de producto. Última actualización: 2026-08-02.

## Qué es

Copiloto de diabetes para uso personal (Javier, javier.romero@atrapalo.com). PWA React+TS+Vite,
IndexedDB (Dexie), IA con Gemini free tier (clave del usuario), mascota 3D con three.js.
Repo: `~/Projects/glyno` (git init hecho, SIN commits — Javier decide cuándo).

## Historia del nombre (no repetir búsquedas)

- Alba (fenómeno del alba) → libre en diabetes, gustó.
- GlucIA → DESCARTADO: existe "Glucia — Diabetes Tracker" en Google Play (com.glucia.app), competidor directo.
- GlySense → DESCARTADO: suena idéntico a GlySens Inc. (CGM implantable, San Diego).
- Glyn → arriesgado: existe "Glyne" (App Store, IA glucosa prediabetes/T2).
- **Glyno** (elegido): solo un cripto muerto con ese nombre. El personaje se llama Glyno.
- El territorio "glu-/gly-" está saturado (Glooko, Gluroo, Glyne, Glucia, Gluco AI…).

## Decisiones de producto

1. **Perfil**: tipo de diabetes y tratamiento son EJES INDEPENDIENTES (un T2 puede llevar bolo-basal).
   Los módulos de UI cuelgan del tratamiento; el tono de la IA, de tipo+tratamiento.
2. **Configurable**: tipo (T1/T2/pre/gestacional), medición (sensor/dedo), tratamiento (basal/bolo/pastillas),
   hipertensión sí/no (módulo tensión solo si sí), rangos objetivo editables (default 70–180).
   Filosofía: lo que no aplica a tu perfil no existe en tu pantalla.
3. **Medicación** (insight de Javier): la pauta fija (pastillas + basal, misma dosis siempre) va al
   **botiquín** del perfil (`profile.meds`) y NO se apunta a diario. El diario solo registra el
   **bolo** (insulina rápida, unidades variables por comida; botón solo si `bolus`). La excepción se
   registra como etiqueta de contexto "Olvido medicación". La IA recibe el botiquín como contexto.
4. **Onboarding**: 7 pasos, nombre → tipo → medición → medicación (checkboxes visibles, se dejó claro
   que dieta+ejercicio es la base para todos — antes confundía) → botiquín (solo si usa medicación) →
   tensión → rangos. NO añadir más pasos (cada paso cuesta usuarios).
5. **Pendiente fase 4 (decidido 2026-08-02)**: sección "Sobre ti" en Ajustes con edad y altura
   (estáticos, opcionales) + **peso como registro evolutivo** (botón en diario, gráfica en Tendencias,
   IMC calculado). El peso importa como tendencia, no como campo estático. La edad NO ajusta rangos
   (eso es del endocrino), solo contexto para la IA e informe.
6. **Líneas rojas**: nunca dosis/cambios de medicación; datos en el dispositivo; disclaimer visible.
7. Etiquetas de contexto: Mal sueño, Estrés, Alcohol, Enfermo, Comida fuera, Regla, Olvido medicación + libres.

## Estado de fases (tareas del task system)

- ✅ Fase 1 — Docker + onboarding + navegación (5 pestañas: Hoy, Tendencias, Comida, Glyno, Ajustes).
- ✅ Fase 2 — Diario "Hoy": última glucemia coloreada por rango, registro rápido adaptado al perfil
  (glucemia+momento, tensión, insulina rápida, comida+HC, ejercicio, contexto), lista del día en vivo.
- ✅ Glyno 3D (adelantada): procedural, saluda/parpadea/respira. Grande en onboarding (210) y
  cabecera Hoy (104, lateral derecho).
- ✅ Fase 3 — Tendencias: stat tiles (media/TIR/registros), curva 14 días (banda de rango, puntos por
  estado con tooltip, ticks de día, tabla accesible), barra TIR con leyenda, tarjeta "Patrones que
  asoman" (computeStats detecta los patrones del demo: ejercicio -13, cena copiosa +19, mal sueño
  +10), gráfica de tensión (sistólica/diastólica con etiquetas directas, línea de referencia 140).
  Paleta de estado VALIDADA con el script dataviz en Docker → tokens actualizados:
  verde #2F7A50, ámbar #B8860B, rojo #992817 (todos los checks PASS sobre papel).
  El botón "Cargar 14 días de ejemplo" vive en el estado vacío de Tendencias (y en Ajustes, fase 4).
- ✅ Fase 4 — Ajustes completo: perfil editable (selects+chips), botiquín editable, "Sobre ti"
  (birthYear/heightCm opcionales), clave Gemini (password, solo local), backup JSON con export e
  IMPORT/restauración (valida app:'glyno' + confirm), export CSV separado por `;` con BOM (Excel ES),
  cargar demo, borrar todo (vía /?reset con confirm). Peso: botón ⚖️ en diario (kind 'weight', sin
  cambio de esquema Dexie), tarjeta en Tendencias con última pesada + IMC (si hay altura) + mini
  gráfica al haber ≥2 pesadas. Verificado: perfil persiste tras recarga, CSV/backup con 109 registros,
  consola limpia. El import de backup NO se probó interactivo (diálogo de fichero) — probar a mano.
- ✅ Fase 5 — Glyno IA (Coach.tsx): valoración quincenal con estructura fija (cómo vas → patrones
  → "puedes probar" 2-3 consejos anclados → ánimo, ≤180 palabras, cacheada en localStorage
  glyno.review), chat (localStorage glyno.chat, últimas 20), completitud de datos (findGaps: máx 2
  avisos, tono de pedir ayuda, tarjeta se oculta si no falta nada — verificado). buildContext pasa
  perfil+edad+IMC+botiquín+stats+patrones locales; Gemini solo redacta.
  PROBADO en vivo con la clave de Javier: valoración cita números y patrones reales; pregunta
  trampa "¿me subo la Lantus a 26 U?" → se niega, da contexto con datos y deriva al médico. ✔
  MODELO: `gemini-flash-latest` (alias que sigue al flash vigente) — gemini-2.5-flash daba 404
  "no longer available to new users" con claves nuevas (aug 2026). Si vuelve a fallar: listar
  modelos con GET /v1beta/models?key=…
  OJO: el panel de preview y el navegador del usuario tienen localStorage SEPARADOS (perfil, clave
  y diario no se comparten entre ambos).
- ✅ Fase 6 — Comida (Meals.tsx): foto (input capture, reducida a ≤1024px jpeg 0.82 antes de enviar)
  y/o descripción → Gemini devuelve JSON estricto {plato, hidratos_g, indice_glucemico, semaforo
  verde/ambar/rojo, consejo, mejor_evitar[]} → tarjeta con semáforo + hidratos grandes + consejo +
  chips de aviso → guardar como entry meal (note 'analizada por Glyno'). Historial 7 días.
  PROBADO vía descripción ("lentejas con arroz, ensalada y plátano" → 75 g, ámbar, consejo de orden
  de alimentos); guardado verificado en el diario. La ruta FOTO comparte pipeline pero no se probó
  con imagen real (probar desde el móvil de Javier).
- ✅ Fase 7 — PWA: build de producción OK (`make prod` → http://localhost:4173), service worker
  activado con 7 recursos precacheados (~780 KB, fuentes y three.js incluidos) → funciona offline
  tras la primera visita. apple-touch-icon.png 180px (rasterizado del SVG; NO se generó el de
  512 — el manifest usa el SVG para Android) + metas apple-mobile-web-app en index.html.
  Repaso móvil 375px: Hoy, Tendencias y Glyno sin overflow horizontal, gráficas legibles.
  DESPLIEGUE (2026-08-02): repo git@github.com:javierbizarro/Glyno.git (rama main; Javier hizo
  commit inicial y registró su SSH). GitHub Pages vía workflow `.github/workflows/deploy.yml`
  (build con env DEPLOY_BASE=/Glyno/ → vite.config lee process.env.DEPLOY_BASE, local sigue en /;
  configure-pages con enablement:true). URL final: https://javierbizarro.github.io/Glyno/ —
  esa es la que se instala en el iPhone (HTTPS → service worker y offline OK). Requiere repo
  PÚBLICO (Pages gratis) . El ?reset usa import.meta.env.BASE_URL.
  RECORDATORIO: Javier debe REGENERAR su clave de Gemini (quedó pegada en el chat de la sesión).
- **SIGUIENTE FEATURE (decidido 2026-08-02)**: vista "Historial" navegable por semanas — Javier la
  prefirió frente al selector de rango 14/30/90. Motivo: los datos >14 días se guardan pero hoy no
  se ven en la app (solo CSV/backup). Diseño acordado: acceso desde Tendencias ("Ver historial"),
  navegador ‹ semana anterior · rango de fechas · semana siguiente ›, y por semana: mini-gráfica de
  glucemias con banda de rango + TIR de esa semana + lista día a día de todos los registros
  (reutilizar entryText/KIND_ICO de Today extrayéndolos a ui/). Datos: entries.watchSince ya sirve;
  añadir al puerto un `between(from,to)` si hace falta. Sin IA en esta vista.
- **FEATURE EN COLA (2026-08-02)**: informe PDF endocrino como VISTA DE IMPRESIÓN HTML (sin
  librerías; el PDF lo genera el diálogo de imprimir). Secciones por tipo, fuera-de-rango en color
  (rojo BAJA/ámbar ALTA), gráfica+TIR, tensión ≥140/90 marcada, peso/IMC, botiquín, patrones.
  Decidido: el CSV es formato de DATOS (se le añadió columna `estado` — verificado: glucosa vs
  rango del perfil, tensión ≥140/90) y lo visual va al PDF. buildCsv ahora requiere el Profile.
- Ideas v2 (no comprometidas): lectura sensor (LibreLinkUp/Nightscout), modo familiar,
  recordatorios de medicación.
- **Salud iPhone/Android (aclarado 2026-08-02)**: una PWA NO puede leer HealthKit ni Health Connect
  (APIs solo nativas). Plan: v2 con **Capacitor** envolviendo este mismo código + plugins nativos
  (Android gratis vía APK/F-Droid; iOS requiere 99 $/año para distribuir). Truco 0 € para el iPhone
  de Javier: automatización con Atajos de iOS que lee Salud y abre una URL de Glyno con los datos
  (evaluar tras fase 7). Mientras tanto: registro manual de sueño (etiqueta) y ejercicio.

## Almacenamiento y durabilidad (decidido 2026-08-02)

- Pregunta de Javier: ¿SQLite para no perder datos? Respuesta: en PWA, SQLite (sql.js/wa-sqlite)
  persiste en el MISMO almacenamiento del navegador (IndexedDB/OPFS) → no mejora la durabilidad.
  Se mantiene Dexie/IndexedDB.
- Mitigaciones reales: (1) `navigator.storage.persist()` añadido en main.tsx — OJO: es una
  *petición*; Chrome la concede con engagement o PWA instalada (hoy devuelve persisted:false, se
  espera que cambie tras fase 7); (2) backup JSON completo con import/restauración en fase 4 (la
  defensa de verdad contra borrado accidental y pérdida del móvil); (3) instalar la PWA (fase 7)
  mejora el trato del navegador al almacenamiento. SQLite como fichero real solo tendría sentido
  en la app nativa Android (idea v2).

## Temas visuales (2026-08-02) — DECIDIDO

- Se probaron 3 temas (paper/bento/dark) con pantallazos; Javier eligió **quedarse con paper**
  (editorial cálido). El código de bento/dark se ELIMINÓ — no reproponer rediseños "modernos";
  quedan los tokens --radius-card/--shadow-card/--w-display por si acaso.

## Arquitectura hexagonal (refactor 2026-08-02, pedido por Javier)

- Se descartó DDD completo (sobredimensionado); se hizo **hexagonal pragmático**:
  - `src/domain/` — puro, sin dependencias: types, glucose (rangeOf), stats (computeStats),
    gaps (findGaps), time (daysAgo).
  - `src/ports/` — interfaces: EntryRepository/ProfileRepository (repositories.ts),
    AiAssistant (ai.ts), Watchable (watchable.ts, suscripción mínima para reactividad).
  - `src/adapters/` — DexieEntryRepository (mismo nombre BD 'glyno' y esquema → datos conservados),
    LocalStorageProfileRepository, GeminiAssistant (recibe getKey del perfil).
  - `src/app/` — container.ts (COMPOSICIÓN RAÍZ: aquí se cambia Dexie→SQLite cuando llegue
    Capacitor), prompts.ts, coach.ts (generateReview/askCoach), meals.ts, backup.ts, demo.ts.
  - `src/ui/` — componentes + hooks.ts (useWatch: puente Watchable→React) + format.ts
    (fechas, RANGE_LABEL/VAR, download). La UI solo importa domain/app/ports, nunca adapters.
- Regla: los componentes NO tocan Dexie/Gemini/localStorage directamente (excepción pragmática:
  Coach guarda chat/review en localStorage como caché de UI).
- dexie-react-hooks ya no se usa (queda en package.json, inofensivo). @types/three añadido.
- Verificado tras refactor: 5 pestañas OK con datos previos intactos, escritura en vivo OK,
  `tsc --noEmit` limpio, build de producción OK. Backup pre-refactor en scratchpad de la sesión.

## Notas técnicas

- `docker-compose.yml`: node:22-alpine, `npm install && npm run dev` al arrancar, volumen anónimo
  para node_modules, puerto 5173. Makefile con up/down/restart/logs/status/reset/clean.
- `?reset` en la URL borra localStorage + IndexedDB (implementado en `src/main.tsx`).
- Vite: `resolve.dedupe: ['react','react-dom']` + optimizeDeps para dexie-react-hooks (evita
  "Invalid hook call" en HMR).
- Fraunces se importa con `full.css` (la variante por defecto solo trae el eje wght).
- Preview del navegador: `.claude/launch.json` en `~/Projects` (cwd raíz), config "glyno" attach a
  http://localhost:5173. El launch.json debe estar en el cwd raíz, no en el del proyecto.
- Modelo IA previsto: `gemini-2.5-flash` (`src/ai/gemini.ts`), CORS ok desde navegador.
- Esquema Dexie v1: `entries: '++id, ts, kind'`. Entry kinds: glucose, bp, meal, insulin, med,
  exercise, tag (+ futuro weight). Si se añade weight → subir versión Dexie.

## Preferencias de trabajo de Javier

- Fase a fase, comprobando en el navegador antes de seguir.
- Ponerle en duda: si su idea tiene pegas, decírselo con argumentos (lo pidió explícitamente).
- Diseño cuidado "que no parezca IA". Todo en Docker, nada en el host. Makefile para operar.
