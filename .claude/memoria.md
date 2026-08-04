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
6. **Líneas rojas**: nunca dosis/cambios de medicación; datos de salud en el dispositivo (únicas
   excepciones: Gemini con clave propia y el ping anónimo de GoatCounter); disclaimer visible.
7. Etiquetas de contexto: Mal sueño, Estrés, Alcohol, Enfermo, Comida fuera, Regla, Olvido medicación + libres.
8. **Modo "Sin diagnóstico" (2026-08-03)**: `DiabetesType` incluye `'none'` para quien no es
   diabético pero quiere cuidarse. REGLA EXPLÍCITA DE JAVIER: **la app sigue siendo de diabetes y
   NO cambia de tono ni de identidad** — es una puerta abierta, no un reposicionamiento. Por eso el
   informe se sigue llamando "control glucémico" y Glyno sigue siendo "copiloto de diabetes"
   (se revirtieron los cambios de tono que había hecho al principio).
   Lo que SÍ cambia en modo 'none': rangos por defecto 70–140 (`DEFAULT_TARGETS`, referencia de
   persona sana; prediabetes también 70–140, resto 70–180), el onboarding salta los pasos de
   medicación y botiquín, el informe oculta la **HbA1c estimada** (el GMI solo está validado en
   diabetes con CGM; fuera de ahí engaña) y su cabecera dice "Sin diagnóstico de diabetes", y el
   prompt añade una nota factual para que la IA no hable de «tu diabetes».
   Etiquetas: `TYPE_FULL` (menús/encabezados: "Diabetes tipo 2", "Prediabetes"…) vs `TYPE_LABEL`
   (corta). Ojo: componer "Diabetes " + TYPE_LABEL daba "Diabetes prediabetes".
9. **Medición de glucosa opcional (2026-08-03)**: `Measurement` incluye `'none'` ("No la mido"),
   para quien usa Glyno solo para tensión, peso u otros registros. Efectos: el onboarding TERMINA
   en el paso de tensión (no pregunta rango objetivo — `finish()` se llama desde
   `chooseHypertension`), en Hoy desaparece la tarjeta "Última glucemia" si además no hay ninguna
   glucemia registrada (el botón de Glucemia SÍ se mantiene, por si mide algún día), `findGaps` no
   reclama ayunas ni más mediciones, y el informe/prompt omiten el método de medición.

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
  consola limpia. El import de backup NO se probó interactivo (diálogo de fichero) — sigue
  PENDIENTE de probar a mano (confirmado 2026-08-04: es la única verificación manual que falta).
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
  de alimentos); guardado verificado en el diario. La ruta FOTO quedó verificada por Javier desde
  su móvil (confirmado 2026-08-04).
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
  PÚBLICO (Pages gratis).
  **OJO con las rutas absolutas**: en Pages la app NO está en la raíz. Todo enlace o redirección
  interna debe usar `import.meta.env.BASE_URL` (vale '/' en local y '/Glyno/' en Pages). Ya mordió
  dos veces: el `?reset` de main.tsx y el botón "Borrar todo" de Settings, que llevaba a
  javierbizarro.github.io/?reset → 404 (corregido 2026-08-03). Verificación rápida:
  `grep -o '"/?reset"' dist/assets/*.js` debe salir vacío tras `DEPLOY_BASE=/Glyno/ npm run build`.
  La clave de Gemini que quedó expuesta en el chat de una sesión ya fue REGENERADA por Javier
  (confirmado 2026-08-04).
- ✅ Historial semanal (2026-08-03): `ui/components/History.tsx`, se abre desde el botón
  "Historial" de Tendencias (sustituye el contenido de la pestaña, sin portal, conserva la barra de
  pestañas). Navegador ‹ · «Esta semana»/«Semana pasada»/«20–26 jul» · › (siguiente deshabilitado
  en la semana actual, hacia atrás sin límite; semanas vacías muestran "Nada registrado").
  Por semana: media, TIR, días con datos (n/7), gráfica de 7 días con separadores diarios y letras
  L M X J V S D, y lista día a día con todos los registros (solo se tiñen las glucemias fuera de
  rango). Piezas nuevas: `domain/week.ts` (weekRange, lunes-domingo y a prueba de cambios de hora),
  `ports.watchBetween(from,to)` + su adaptador Dexie, y `ui/entryDisplay.ts` (entryText/KIND_ICO
  extraídos de Today y compartidos). Sin IA. Verificado en 375px.
- ✅ Informe médico (2026-08-02): botón "Informe médico" en Tendencias → vista de impresión
  (ui/components/Report.tsx en PORTAL a body + app/report.ts getReportData) con selector 14/30/90
  días. Contiene: cabecera clínica (edad, tipo, tratamiento+botiquín, periodo, rango), 6 métricas
  (incl. **HbA1c estimada GMI = 3.31 + 0.02392·media**, con asterisco de "orientativa"), gráfica
  del periodo, medias por momento del día, TABLA día×momento con fuera-de-rango coloreado (rojo
  bajo/ámbar alto, print-color-adjust exact), tensión (nº ≥140/90), peso/IMC, patrones y pie legal
  ("Glyno no emite juicio clínico"). PDF vía window.print() (título del documento = nombre de
  fichero). VERIFICADO en navegador con 14 y 90 días.
  IMPRESIÓN (bug corregido 2026-08-02): salía una primera hoja EN BLANCO y sin márgenes porque
  `#root` tiene min-height:100dvh y seguía ocupando página aunque su contenido estuviera oculto.
  Solución: `@page { size: A4 portrait; margin: 14mm 12mm }` + en @media print ocultar `#root`
  entero (el informe va en portal a body, así que sobrevive) + html/body height:auto. Añadido
  thead como table-header-group para repetir cabecera de la tabla diaria en cada página.
  Truco de verificación: copiar las reglas de @media print a un <style> temporal y medir/capturar.
  MÁRGENES (2ª iteración): `@page` estaba bien parseado pero NO basta — Safari lo ignora y el
  diálogo de Chrome puede anularlo con «Márgenes: ninguno». Solución definitiva: `.report` lleva
  `padding: 8mm 10mm` en @media print (el relleno lateral se aplica en todas las hojas y ningún
  navegador lo ignora) + `@page margin: 12mm 8mm` para el espaciado vertical entre páginas.
  El CSV quedó como formato de DATOS con columna `estado` (glucosa vs rango; tensión ≥140/90);
  buildCsv ahora requiere el Profile.
- **Datos automáticos — FASE A IMPLEMENTADA (2026-08-04)**; plan completo y fases B/C en
  `.claude/plan-datos-automaticos.md`. Lo construido:
  - **Fontanería común**: `Entry` gana `extId?` (clave de dedupe), `source?: 'manual'|'health'`
    y `distanceKm?` (solo entrenos; kcal y velocidad fuera a propósito). Dexie **v2** con índice
    `extId`. Puerto: `update(id, patch)` y `byExtIds(ids)`.
  - **`app/healthImport.ts` (TDD, 15 tests)**: `importHealthPayload(text)` parsea el contrato
    JSON del atajo `{app:'glyno',type:'health',samples:[…]}` — kinds `glucose`/`exercise` con
    `ts` puntual, `steps`/`sleep`/`weight` diarios con `date` (ts representativo 12:00/07:30/
    08:00). Valida rangos plausibles (inválidas se descartan y se cuentan), dedupe por `extId`
    contra la BD y dentro del lote, y los DIARIOS SE ACTUALIZAN si cambia el valor (los pasos de
    hoy crecen durante el día) mientras los puntuales solo se ignoran. `healthImportSummary` da
    el texto en castellano («De Salud: 12 registros nuevos y 1 al día.»).
  - **Rutas de entrega**: portapapeles (Ajustes → «Salud del iPhone» → «Pegar datos de Salud»,
    con errores de permiso en castellano) y fragmento `#import=` (main.tsx lo guarda en
    sessionStorage y limpia el hash; App lo importa al montar y muestra un `.toast` — botón
    fijo sobre la tabbar, 6 s o toque). JAMÁS query string (dejaría glucemias en logs).
    En iOS «Traer datos de Salud» lanza el atajo por `shortcuts://run-shortcut?name=Glyno%20Salud`
    (botón solo visible en iOS).
  - **Kinds nuevos** `steps` y `sleep` (👣/🌙 en `entryDisplay`; «11.000 pasos», «Sueño · 6 h
    52 min»). Todo lo importado lleva sufijo «· Salud» en el diario.
  - **Pasos → movimiento**: `STEP_ACTIVE_THRESHOLD = 8000` (constante en domain/movement.ts,
    decidido por Javier: umbral alto, ir a la nevera no es moverse). Cuenta para «X de 7 días»
    y para hoy: `movedToday` + reconocimiento «Hoy ya llevas 9.241 pasos» (el ejercicio
    apuntado gana). La hipo reciente sigue silenciando todo.
  - **Sueño → patrones**: `computeStats` gana `sleepMean`, `stepsMean`, `sleepDelta` y
    `shortSleepDays` (`SHORT_SLEEP_MIN = 360`; noche corta = <6 h, agrupación por día de
    calendario como el ejercicio). Fila «Tras dormir <6 h (×n)» en Tendencias y en el prompt
    (mínimo 2 noches); el contexto añade «sueño medio 6,7 h · pasos medios 7.432/día».
  - **BUG CAZADO por la importación**: `watchLastByKind` usaba `.last()` de Dexie = último
    INSERTADO, no el más reciente por ts. Con registro manual nunca asomó (insertas en orden);
    al importar días desordenados la «Última glucemia» enseñaba la más vieja. Arreglado con
    `sortBy('ts')`.
  - **`thousands()` en `domain/number.ts`**: el node de Alpine lleva ICU recortado y
    `toLocaleString('es-ES')` NO separa miles en los tests (en el navegador sí). Formateador
    propio determinista; no volver a usar toLocaleString para miles.
  - **Doc del atajo**: `docs/atajo-salud.md` (contrato JSON, receta de Atajos, automatización
    22:30, Siri, alternativa `#import=`, expectativas honestas: la glucosa en Salud va por
    detrás del sensor). Enlazada desde la tarjeta de Ajustes. PENDIENTE: Javier monta el atajo
    en su iPhone con esa doc (la receta es orientativa, hay que validarla en el dispositivo) y
    lo comparte por iCloud; probar también el pegado real (el panel no permite automatizar el
    portapapeles).
  - Resumen del plan original: fuente única Apple Salud / Health Connect (Libre y Dexcom ya
    escriben ahí); B) Android con Capacitor, C) iOS 99 $/año — por demanda. Sensor directo:
    Nightscout (limpia), Dexcom oficial (retraso 3 h, irrelevante), LibreLinkUp (evitar).
    OJO pendiente para densidad de sensor: gráficas AGP (percentiles) — van con A0 o B.
- Ideas v2 (no comprometidas): modo familiar, recordatorios de medicación, foto del ticket de la
  compra para saber qué hay en casa.
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

## Medicación no insulínica (2026-08-03)

- Javier detectó que **Ozempic no encajaba**: no es insulina ni pastilla (GLP-1 inyectable semanal;
  igual Trulicity, Mounjaro, Victoza). Se decidió NO crear una cuarta categoría, porque para la app
  lo único que cambia el comportamiento es si la dosis varía a diario (solo el bolo).
- Cambio: la categoría `pills` pasa a llamarse **«Otra medicación»** ("Otra medicación para la
  diabetes · Pastillas (metformina…) o inyectables como Ozempic o Trulicity"). `treatmentSummary`
  dice "otra medicación no insulínica" en vez de "medicación oral" (salía en el informe médico y era
  falso para quien usa GLP-1). La clave interna del perfil sigue siendo `pills` a propósito: no
  merece una migración de perfiles guardados (documentado en types.ts).
- La periodicidad se escribe en el campo de dosis (texto libre). Javier preguntó "¿qué tengo que
  poner?" ⇒ la etiqueta abstracta no bastaba: ahora el **placeholder es el ejemplo**
  («Metformina» / «850 mg · desayuno y cena») y en Ajustes hay una línea de ayuda con tres ejemplos.
  Los dos campos van **apilados**, no en fila: en 375px una fila cortaba los placeholders.
  Icono 💊 para otra medicación y 💉 para las insulinas.
- ✅ **Recordatorio semanal implementado (2026-08-04)**: `Med.weekday?` (opcional, convención
  `getDay()` de JS: 0=domingo — documentado en types.ts) + `domain/medication.ts` con
  `dueWeeklyMeds(meds, entries, now)` (TDD) y `WEEKDAY_LABEL`. Tarjeta «Medicación semanal» en Hoy
  (entre Última glucemia y los botones rápidos): «Hoy toca Ozempic (0,5 mg)» + botón «✓ Ya está»
  que guarda un entry `kind:'med'` con note 'pauta semanal' — al guardarlo la tarjeta desaparece
  (el registro del día la silencia; el de la semana pasada no, hay test). El match del nombre
  ignora mayúsculas y espacios. En Ajustes el alta de medicación tiene un select de pauta
  («Cada día (o según pauta)» / «Semanal · los martes»…, lunes primero, guarda `weekday`) y la
  fila muestra «· los martes» (plural solo sábados/domingos). El informe médico añade
  «(semanal, martes)» al botiquín. Onboarding SIN tocar a propósito (no engordarlo; la dosis en
  texto libre sigue valiendo y el select vive en Ajustes). Sin avisos push (eso sigue siendo del
  plan nativo); esto es el recordatorio in-app a coste 0. LÍNEA ROJA respetada: si el día pasó sin
  apuntar, la app NO dice nada de dosis dobles ni recuperar tomas — solo recuerda el día señalado.
  Posible mejora futura: avisar de «ayer tocaba y no quedó apuntado» (solo hecho factual).

## Sello de compilación en UTC (bug 2026-08-03)

- El sello de «Acerca de Glyno» salía 2 h antes: `new Date().toISOString()` da UTC y GitHub Actions
  compila en UTC. Corregido con `toLocaleString('es-ES', { timeZone: 'Europe/Madrid', … })` en
  vite.config. Verificado compilando con el contenedor en TZ=UTC: el bundle salió con la hora
  española correcta.

## Momentos del día, teclado y orientación (2026-08-03)

- **MOMENTS pasa al perfil glucémico clásico de 7 puntos** (ayunas, después de desayunar, antes de
  comer, después de comer, antes de cenar, después de cenar, antes de dormir). Antes eran 4 y eran
  ambiguos: "antes/después de comer" no decía de qué comida. Es lo que espera un endocrino y lo que
  hace útil la tabla del informe. Los datos antiguos siguen siendo válidos (subconjunto).
  Etiquetas cortas para el informe en `ui/entryDisplay.ts` → `MOMENT_SHORT` ("Post desayuno"…),
  porque "después de desayunar" no cabe como cabecera. Demo actualizado para generar los 7.
- `suggestMoment` (reescrito 2026-08-03 por aviso de Javier): **MANDA LA HORA DEL DÍA**. Antes la
  regla posprandial tenía prioridad, así que a quien solo se mide ANTES de las comidas se le
  proponía «después» solo por haber registrado el plato. Ahora las franjas horarias deciden y el
  registro de comida solo sirve para pasar de «antes» a «después» DENTRO de la misma franja:
  <4,5 o ≥23 → antes de dormir · <11 → ayunas (o después de desayunar) · <13 → después de desayunar
  o nada · <15,5 → antes de comer (o después) · <19 → después de comer · <21,5 → antes de cenar (o
  después) · resto → después de cenar / antes de dormir. Verificados 9 casos horarios.
- **Comida entre horas**: `mealMoment` pasa a 5 franjas con `'entre horas'` (11-13 y 23-5) para que
  el picoteo no se cuente como desayuno o comida: desayuno 5-11 · entre horas 11-13 · comida 13-16 ·
  merienda 16-20 · cena 20-23 · entre horas 23-5. `MEAL_MOMENT_LABEL` da el texto para la UI y el
  prompt («un tentempié», «la merienda»…), que antes decía cosas como "ideas para entre horas".
- **Teclado en móvil**: las hojas de registro van ancladas abajo y el teclado las tapaba. Solución:
  `main.tsx` escucha `visualViewport` y publica `--kb` (alto del teclado); `.sheet` usa
  `margin-bottom: var(--kb)` + `max-height` + scroll, y el viewport lleva
  `interactive-widget=resizes-content`. Verificado por Javier con teclado real en el iPhone
  (confirmado 2026-08-04).
- **Orientación**: `orientation: 'portrait'` en el manifest (lo respeta Android instalado; iOS lo
  ignora). NO se bloquea el horizontal con un overlay a propósito: sería un problema de
  accesibilidad (quien rota para ver más grande, o para leer el informe). En su lugar, media query
  `(orientation: landscape) and (max-height: 520px)` que compacta paddings, títulos y barra de
  pestañas para que el horizontal se vea intencionado. Verificado a 812×375.

## Registro en un toque (2026-08-03)

- El diario se alimenta de sí mismo: `domain/meals.ts` añade `usualDoses` (dosis de rápida más
  repetidas a esa hora), `usualExercises` (actividad + minutos redondeados a 5) y `suggestMoment`
  (ayunas / después de comer / antes de dormir según la hora y si ya ha comido hoy).
- En las hojas de registro de Hoy: chips de comidas habituales («Lo que sueles tomar», con sus
  hidratos medios), chips de dosis, chips de ejercicio — un toque guarda y cierra —, momento de la
  glucemia ya premarcado y peso precargado con la última pesada. `Today` observa 30 días para tener
  historial suficiente (antes solo el día).

## Onboarding: defaults engañosos (bug 2026-08-03)

- Javier reportó que la hipertensión no quedaba marcada en Ajustes. El guardado y el pintado eran
  CORRECTOS (verificado de punta a punta). La causa era de diseño: en los pasos de tipo, medición y
  tensión, la opción por defecto (`t2`, `meter`, `hypertension:false`) salía **resaltada como si ya
  la hubieras elegido**, así que pasando rápido te llevabas una respuesta que no diste.
- Solución: estado local `answered` por paso; nada se resalta hasta que el usuario toca. Si
  `initial` existe (re-editar perfil) se considera ya contestado. Verificado con onboarding virgen:
  ninguna opción preseleccionada y el caso "sin medicación + hipertenso" guarda y pinta bien.

## Calorías: sí, pero secundarias (2026-08-03)

- Javier propuso primero **contar calorías y compensarlas con ejercicio** (pasos). Se DESCARTÓ la
  compensación con tres argumentos: (1) la métrica que mueve la glucosa son los hidratos, no las
  kcal; (2) "compensar comida con ejercicio" puede inducir hipoglucemias tardías si hay insulina y
  refuerza conductas alimentarias desordenadas, frecuentes en diabetes; (3) restar dos estimaciones
  malas (kcal comidas y gastadas) da una cifra peor y falsamente precisa.
- Luego preguntó por **calorías orientativas para saber si un plato es sano**. Se implementó así:
  el análisis de comida devuelve además `fibra_g`, `calorias_kcal` y `procesado`
  (casero/procesado/ultraprocesado), mostrados como **línea secundaria** bajo los hidratos, y el
  prompt lleva instrucción EXPLÍCITA de que el semáforo valora glucosa y calidad, **nunca calorías**
  (con ejemplos: aceite de oliva y frutos secos son calóricos y sanos).
- Las kcal **no se guardan** en el diario a propósito: sin acumulado diario no hay dinámica de app
  de dieta. Añadirlo luego sería trivial si se decide.
- Verificado en vivo la inversión que justifica el diseño: ensalada con nueces, aguacate y aceite →
  **480 kcal, semáforo VERDE** (6 g HC, 6 g fibra, casero); pan blanco con mermelada y zumo →
  **300 kcal, semáforo ROJO** (70 g HC, 2 g fibra, ultraprocesado).
- ✅ Implementado el enfoque alternativo: **tarjeta «Movimiento» en Hoy** (`domain/movement.ts`,
  `movementState`, lógica pura y sin IA → funciona offline). Muestra «X de 7 días» como dato neutro
  y una sugerencia contextual, en este orden de prioridad:
  1. hipo reciente (`needsHypoCare`) → **ninguna sugerencia** (moverse es lo contrario de lo que hace falta),
  2. ya se movió hoy → reconocimiento («Ya te has movido hoy, 45 min») y desaparece el botón,
  3. comió hace 15-90 min → paseo de 10-15 min (lo que más recorta el pico posprandial),
  4. glucemia sobre rango en las últimas 3 h → paseo tranquilo,
  5. entre las 9 y las 22 sin moverse → invitación suave.
  Si hay patrón propio se añade «los días que te mueves tu media baja N mg/dl» (solo si la mejora
  supera 3 mg/dl y hay ≥2 días). Botón de un toque «Apuntar 15 min de paseo».
  Nada de calorías, nada de compensar, nada de rachas. Verificados los 6 casos con datos sintéticos
  y el registro en un toque en la app (la tarjeta pasó a «4 de 7 días» y ocultó el botón).

## Recomendaciones de comida (2026-08-03)

- Pestaña Comida con dos modos (chips): **«¿Qué como ahora?»** y «Analizar un plato».
- **Idea clave de Javier**: NO hace falta foto de la nevera ni despensa manual — el propio diario
  es la despensa. `domain/meals.ts` → `usualMeals(entries, moment)` agrupa los platos ya
  registrados por frecuencia (y por momento del día vía `mealMoment`), y el prompt le pide
  priorizarlos "porque son los que tiene en casa y le gustan". Se descartó la foto de nevera:
  reconocer tuppers/cajones es poco fiable y decepciona.
- Entradas del prompt: momento del día + hora, última glucemia (valor y minutos), buildContext
  (perfil, botiquín, stats y patrones) y los platos habituales. Salida JSON:
  {opciones[{plato,hidratos_g,por_que}], evitar[], nota}. Cada opción tiene botón «Esto voy a
  comer» → `logMeal(...)` con note 'sugerida por Glyno'.
- **Salvaguarda clínica**: si la última glucemia está bajo rango y es de hace <2 h
  (`needsHypoCare` en domain/glucose.ts) NO se llama a la IA; se muestra un texto fijo remitiendo
  a la pauta del equipo sanitario. Verificado con una glucemia de 58.
- Probado en vivo: propuso "Tortilla y ensalada 42 g HC — tu cena habitual más ligera…" y
  "Pollo con ensalada", evitando "pizza y postre" por la hora. Usa 30 días de historial.

## Chat anclado abajo (2026-08-03)

- Javier: molestaba tener que hacer scroll para escribir en el chat de Glyno. Primer intento con
  `position: sticky` en la caja de escribir: **NO funciona** si la tarjeta del chat queda entera por
  debajo del pliegue (sticky no sube un elemento a la vista, solo lo retiene).
- Solución: `.chat-dock` **fijo** sobre la barra de pestañas, con `bottom: calc(var(--kb) +
  var(--tabbar))`. `--tabbar` lo publica `App` midiendo la barra con un `ResizeObserver` (su alto
  cambia con el área segura del iPhone) y `--kb` cubre los navegadores que no reajustan el viewport.
- Hace falta un **hueco final** en el contenido o el último elemento queda debajo de la
  caja; la primera versión lo puso en medio y tapaba el aviso legal.
- **Hueco final recalculado (2026-08-04)**: los 32 px fijos solo funcionaban con la barra de
  pestañas de escritorio. En iPhone (`--tabbar` ≈ 90 con área segura) o con teclado (`--kb`) la
  última burbuja («Pensando…») quedaba pegada o DEBAJO de la caja — reportado por Javier. Ahora es
  `.chat-end` en theme.css: `calc(var(--kb) + var(--tabbar) + 77px - 96px)` (77 = caja ~65 + 12 de
  aire; 96 = padding inferior de `.screen`, 82 en la media query de landscape, que tiene su
  override). OJO: el gap de 16 px del flex `.screen` también suma (la caja es fixed y no cuenta
  para el gap). Verificado en el panel: hueco constante de 28,5 px con teclado simulado (300px),
  con tabbar 90 y en estado normal.

## Chat de verdad, segunda vuelta (2026-08-03)

- Javier: «no se ancla abajo como un chat de verdad». El problema era la tarjeta con su propio
  scroll interno (`maxHeight: 340`): doble scroll y la conversación a media página mientras la caja
  de escribir estaba abajo. Fuera la tarjeta: `.chat-thread` con `margin-top: auto` cuelga la
  conversación del fondo del `.screen` y el scroll es el de la página, como en cualquier chat.
- El aviso legal pasó de párrafo suelto al pie a **nota de cabecera de la conversación** (patrón
  del aviso de cifrado de WhatsApp): visible con el chat vacío y se aleja con el historial.
- Auto-scroll con regla `stick`: pegado al final salvo que el usuario suba a leer (umbral 160 px);
  tu propio mensaje siempre baja. TRES trampas que ya nos comimos, no rehacer:
  1. `Coach` pinta `null` hasta que Dexie entrega las entradas → en el montaje la página mide lo
     que el viewport y bajar es un no-op. El efecto espera a `ready` (`!!entries`).
  2. El scroll suave dispara eventos intermedios «lejos del final» que ponían `stick` a false y la
     respuesta llegaba sin bajar → ventana `autoUntil` de 900 ms en la que el listener no toca `stick`.
  3. Con la página en segundo plano el scroll suave NO corre (va con rAF): si la respuesta de
     Gemini llega mientras miras otra app, la animación muere → remate `settle` a los 950 ms con
     scroll seco si `stick` sigue activo. Descubierto porque el panel del navegador oculto
     reproduce exactamente ese estado.
- El icono **inactivo** de la pestaña Glyno seguía siendo la pera con antena del personaje viejo;
  ahora es el corazón con corona en trazo de línea (con ojos y sonrisa para que no parezca un
  «favoritos»), a juego con el resto de la barra. El activo sigue siendo el `Mascot` a color.
- Al probar se machacó el historial de chat (`glyno.chat`) con una conversación de prueba; se dejó
  limpio. Eran pruebas de fases anteriores, nada del usuario real.

## Ayuda con el peso cuando el IMC lo pide (plan 2026-08-04 → ✅ IMPLEMENTADO 2026-08-04)

- Javier: adelgazar es clave para un diabético con IMC alto; la app debe ayudar. Acordado el CÓMO:
  **automonitorización y calidad, jamás contador de calorías** (presupuestos kcal = adherencia
  pésima + bucles de culpa + riesgo de hipos en insulinizados; coherente con «el semáforo NUNCA
  las calorías» y sin gamificación con culpa). La palanca: lo bueno para la glucosa es casi
  siempre bueno para el peso — se dice en lenguaje de glucosa, no de báscula.
- Implementación (todo TDD en dominio/app; 183 tests):
  1. **`domain/weight.ts`**: `bmiOf`, `WEIGHT_FOCUS_BMI = 27`, `weeklyWeights` (media semanal
     por semanas lunes-domingo vía `weekRange`, que ahora acepta origen `from` como `daysAgo`),
     `weightTrendPerWeek` (kg/semana entre la primera y la última media; usa el span real).
  2. **Tendencias**: la tarjeta Peso pinta la MEDIA SEMANAL (ya no las pesadas sueltas), con
     línea discontinua verde del objetivo, texto de tendencia («bajando 0,5 kg por semana»)
     solo si |tendencia| ≥ 0,05, y con IMC ≥ 27 la línea educativa del 5-10 % con derivación
     al equipo. La etiqueta del primer lunes va con textAnchor start (se recortaba).
  3. **Ajustes → Sobre ti**: tercer campo «Objetivo de peso (kg)» (`profile.targetWeightKg`),
     con texto de «pactado con tu equipo sanitario» y «nunca propone dietas ni cuenta calorías».
  4. **IA**: `buildContext` recibe ahora la SERIE de pesos (antes solo la última pesada — firma
     cambiada en coach/meals y los componentes pasan `watchByKind('weight')`). Añade línea
     `PESO: última pesada X kg · IMC · tendencia ±Y kg/semana · objetivo pactado…` y, con
     IMC ≥ 27, el bloque **MODO PESO**: saciedad/raciones/orden en lenguaje de glucosa,
     «NUNCA cuentes ni menciones calorías», 5-10 % con plan pactado con su equipo, tendencia
     sin culpa. Tests pinnean el umbral, el bloque y sus líneas rojas.
  5. Demo: una pesada semanal con deriva suave a la baja para que la gráfica tenga tendencia.
  6. Kcal quemadas por ejercicio: siguen fuera (ver plan-datos-automaticos.md).

## Contador anónimo de visitas (2026-08-03)

- Javier quería saber cuánta gente usa la app. Opciones valoradas: nada / GoatCounter / analítica
  completa. Elegido **GoatCounter** (cuenta de Javier: `glyno.goatcounter.com`) con una decisión
  clave: **NO se carga su script** (regla «nada de CDNs») — el ping es nuestro, 4 líneas en
  `src/app/analytics.ts` vía `new Image()` al endpoint `/count` (p=/app, t=Glyno, rnd=cache buster).
  La URL completa está testeada: exactamente esas 3 claves, nada personal.
- Guardas (TDD-first, `analytics.test.ts`): DNT ('1' y 'yes'), Global Privacy Control, y hosts de
  desarrollo (localhost/127.0.0.1/[::1]/*.local) → no se envía nada. Nunca en la rama `?reset`.
- La promesa «tus datos no salen de tu dispositivo» pasó a «tus datos DE SALUD no salen» en los
  6 sitios donde vivía (README, CONTRIBUTING, CLAUDE.md, manifest, Acerca de, onboarding, tarjeta
  de compartir), con párrafo de transparencia en Acerca de y sección en el README.
- **Línea roja nueva en CLAUDE.md y CONTRIBUTING**: este ping es la ÚNICA telemetría admitida.
  Nada de eventos, identificadores ni más analítica.
- Límite honesto: las aperturas offline no cuentan (PWA). Es aproximación, no censo.
- Al verificar quedó registrada 1 visita de prueba (2026-08-03, deliberada, avisado Javier).
- Revisión adversaria (3 lentes) aplicada: los textos decían «sin ningún dato tuyo», que era
  prometer de más — la IP llega a GoatCounter como en toda petición web (la usa para agrupar
  visitas y no la guarda); ahora se dice tal cual. Guarda de dev reforzada: `import.meta.env.DEV`
  + IPs literales (el dev server escucha en 0.0.0.0 y probar desde el móvil en LAN habría
  contaminado las estadísticas). DNT legado (`window.doNotTrack`), GPC mencionado en los textos,
  ping envuelto en try/catch (jamás puede romper el arranque), y aviso también en el onboarding.

## Guía tour para nuevos usuarios (2026-08-03)

- Pedido por Javier: tour de bienvenida re-lanzable desde Ajustes. Diseño: **6 pasos, saltable
  siempre** (viene justo tras el onboarding, que ya es largo), Glyno de guía con foco recortado
  (`.tour-hole` con box-shadow gigante) sobre el elemento real de cada pantalla; la guía cambia de
  pestaña sola. Anclajes por `data-tour` (quick / trends ×2 / meals / coach / guide).
- Se auto-muestra **una vez** (`glyno.tourSeen` en localStorage, `src/ui/tour.ts`, con test
  TDD-first). Replay manual: tarjeta «Primeros pasos» en Ajustes. Escape también cierra (cuenta
  como vista). Los usuarios existentes la ven una vez tras actualizar (no hay flag previo) —
  decisión consciente: anuncia la función y se salta en un toque.
- Trampa evitada y regla nueva: **nada de requestAnimationFrame para medir tras scrollIntoView**
  — no dispara con la página oculta (misma familia que el scroll suave del chat) y es innecesario:
  tras un scroll instantáneo la medida síncrona ya vale. El objetivo de cada paso se busca con
  reintentos (las pantallas montan async por Dexie) y cae a bocadillo centrado si no aparece.

## TDD, tests en pre-commit y en la pipeline (2026-08-03)

- Pedido por Javier. Acordado con matices: **TDD estricto solo en `domain/` y `app/`** (funciones
  puras); la UI no lleva TDD (caro y frágil en componentes React). Lo existente se cubrió con
  **tests de caracterización** (fijan el comportamiento actual); lo nuevo nace test-first.
- **Nunca testear la respuesta real de Gemini** (no determinista). Se testean los prompts —
  incluidas las líneas rojas (nunca dosis, bloque de hipo, cláusula de sal) — y el parseo
  (`extractJson` con fences/prosa/basura). Las reglas de producto viven ahora en tests.
- Infra: Vitest 4 con `vitest.config.ts` propio (sin plugins de Vite: los tests de dominio son TS
  puro, entorno node). Tests colocados junto al código (`src/**/*.test.ts`), en inglés.
- **Pre-commit sin husky**: husky exige `npm install` en el host y aquí no se instala nada fuera
  de Docker. En su lugar: `.githooks/pre-commit` versionado + `git config core.hooksPath .githooks`
  (lo deja hecho `make up`, target `hooks`). El hook corre `tsc` + `vitest` DENTRO del contenedor;
  si el contenedor está parado usa `docker compose run --rm --no-deps`. Escape: `--no-verify`.
- CI: job `test` en deploy.yml del que depende `deploy`, y `test.yml` aparte para PRs.
- `make test` = tsc + vitest en Docker.
- Batería inicial: 142 tests en 9 ficheros (~220 ms). Primer red→green del repo: el de-dupe de
  `suggestMeal` usaba `startsWith` contra el texto formateado y se tragaba platos de otras
  franjas cuyo nombre fuera prefijo de uno habitual; ahora compara etiquetas crudas.
- Hallazgos de los tests de caracterización — **decididos el 2026-08-04**:
  - ✅ CORREGIDO `suggestMoment`: `daysAgo` acepta ahora un origen (`daysAgo(n, from)`) y las
    comidas de hoy se filtran por el día de `now`. `movementState` igual (todas sus ventanas
    salen de `now`); sus tests congelan el reloj real en 2020 a propósito para cazar cualquier
    `Date.now()` accidental.
  - ✅ CORREGIDO el paseo post-comida: la ventana 15-90 min es de digestión, no de calendario —
    una cena a las 23:55 cuenta a las 00:15.
  - ✅ CORREGIDO el contexto con diario vacío: «ÚLTIMOS 14 DÍAS: sin glucemias registradas» (sin
    porcentajes inventados ni «0 hipoglucemias»; la tensión media sí se mantiene si existe).
    Nota: el «NaN%» literal ya no se reproducía (tir lleva guarda `n ?`); lo engañoso era el «0%».
  - SE QUEDAN COMO ESTÁN (decisión razonada, no dejadez):
    - `tagEffects` con la media global como base: excluir las lecturas post-etiqueta dejaría la
      base casi vacía para quien etiqueta a diario; la dilución actual INFRAVALORA efectos, que
      es el sesgo seguro para una app que no debe sobreafirmar patrones. Y `n>=2` cuenta lecturas
      porque es lo que estabiliza la media de la ventana.
    - Ejercicio por día de calendario: con registro manual esporádico, el día es la granularidad
      honesta; ventanas causales serían precisión falsa. El texto ya dice «los días que te
      mueves», no «después de moverte».
    - `logMeal` descarta `carbs: 0`: «cero hidratos» y «no lo sé» siguen siendo indistinguibles
      en la UI actual (el campo es opcional); cambiarlo pediría UI nueva para un caso marginal.

## Idiomas: app en castellano, código y commits en inglés (2026-08-03)

- Pedido por Javier. La frontera importa y ya está pensada, no rediscutir:
  - **Inglés**: comentarios, identificadores, mensajes de commit y las claves del contrato JSON
    con Gemini (`dish`, `carbs_g`, `traffic_light: green|amber|red`, `glycemic_index`,
    `processing`, `advice`, `better_avoid`, `options`, `avoid`, `note`, `why`). Los valores de
    `MealMoment` también (`breakfast`, `between-meals`, `lunch`, `afternoon-snack`, `dinner`) —
    son internos, no se persisten.
  - **Castellano (NO traducir jamás)**: textos de UI, cuerpos de los prompts (Glyno habla
    español), datos de demo, y sobre todo los **valores persistidos en el diario**: momentos
    ('ayunas', 'después de cenar'…), etiquetas ('Mal sueño'…), notas ('sugerida por Glyno',
    'analizada por Glyno'). Traducirlos corrompería los diarios existentes.
- Los valores ingleses que llegan a la UI llevan mapa de etiqueta (`LIGHT_LABEL`, `GI_LABEL`,
  `PROCESSING_LABEL` en Meals.tsx): `glycemic_index`/`processing` se pintaban tal cual.
- Historia git anterior en español: se queda. Reescribir historia publicada no compensa.

## Qué contexto ve la IA en cada pantalla (auditado 2026-08-03)

- Todo el contexto sale de `buildContext` (`app/prompts.ts`): perfil (tipo, medición, tratamiento,
  hipertensión, rango, edad, IMC), BOTIQUÍN (nombre + dosis), números de 14 días y patrones.
  Lo reciben **chat** y **valoración** (`app/coach.ts`) y las **sugerencias de comida**.
- La **foto del plato** era la excepción: `mealPrompt` solo llevaba tipo + tratamiento, así que el
  semáforo era el mismo viniendo de 90 que de 240, y a un hipertenso no le avisaba de la sal aunque
  la app le registre las tensiones. Corregido: ahora recibe **rango objetivo, última glucemia con su
  antigüedad e hipertensión**, más dos reglas (exigir más si viene alta; mencionar la sal si es
  hipertenso).
- **El botiquín se queda fuera de la foto a propósito**: para juzgar un plato no aporta nada que el
  tratamiento no diga ya, y tener nombres y dosis delante acerca al modelo a «con tu insulina puedes
  permitirte…». En el chat sí va, porque ahí el usuario pregunta por su medicación.
- Salvaguarda de hipoglucemia en la foto: si la última glucemia está bajo rango y es reciente
  (`needsHypoCare`), el prompt prohíbe decir «evita hidratos» y poner el semáforo en rojo por los
  azúcares. Comprobado con Gemini: «zumo de naranja + galletas» a 58 mg/dl devuelve semáforo verde,
  `mejor_evitar` vacío y «te vendrá perfecto para remontar»; sin la regla habría dicho lo contrario.
  Un «bocadillo de chorizo y queso curado» a 243 devuelve rojo y menciona la sal por la hipertensión.
- `lastGlucoseText` (en `domain/glucose.ts`) formatea la última glucemia para los prompts y la
  antigüedad va SIEMPRE (min / h / días): antes las sugerencias decían «hace 4300 min».
- Arreglado de paso: las sugerencias de comida llamaban a `buildContext` sin el último peso, así que
  ahí faltaba el IMC que el chat sí tenía.
- ✅ Resuelto (2026-08-04): el botiquín del contexto lleva ahora el `kind` de cada fármaco —
  «Metformina 850 mg (no insulínica); Lantus 22 U (insulina basal); Humalog (insulina rápida)» —
  y la pauta semanal si la hay: «Ozempic 0,5 mg (no insulínica, semanal: martes)». Con test.
  Sigue FUERA del prompt de foto de comida a propósito (esa exclusión no cambia).

## Borrar un registro (2026-08-03)

- Javier: «eliminar un registro por si te has equivocado». Las filas del diario (en Hoy y en
  Historial) son ahora `<button className="entry-row">` que abren `DeleteEntrySheet`.
- Con **confirmación obligatoria**: la hoja repite el registro (icono + texto + día y hora) para que
  se vea que no te has equivocado de fila, y avisa «Solo desaparece de tu diario. Esto no se puede
  deshacer». Descartada la papelera por fila (ensucia el diario, y en móvil se pulsa sin querer).
- No hay deshacer ni borrado lógico a propósito: el diario es del usuario y un registro fantasma
  falsearía las medias. Nuevo método `remove(id)` en el puerto `EntryRepository` (`.delete` de Dexie).
- Consciente: **borrar cambia las medias y el informe del endocrino**. Es lo que se quiere (un dedo
  gordo metiendo 999 mg/dl estropea más), pero por eso la confirmación no se puede saltar.

## Tendencias con pocos datos (2026-08-03)

- Javier: «cuando hay datos, aunque sean pocos, ir cargando la tendencia». Antes el estado vacío
  tapaba la pantalla hasta tener unas cuantas glucemias; ahora solo aparece si **no hay ningún
  registro** (`entries.length === 0`), lo que además arregla a quien solo apunta tensión o peso.
- Cada bloque de glucemia se pinta solo si `glucose.length > 0`; con 1 y con 2 mediciones la gráfica
  y el tiempo en rango ya salen bien (comprobado; la escala aguanta un único punto).
- Contrapartida honesta: con `stats.n < 10` se avisa de que «los porcentajes bailan mucho». Sin ese
  texto un 50% en rango con 2 lecturas parece un dato real y no lo es.

## Compartir la app (2026-08-03)

- Tarjeta «Comparte Glyno» en Ajustes con `navigator.share` (hoja nativa del sistema en el móvil) y
  **portapapeles como respaldo**. La URL NO está fija: se compone con
  `location.origin + import.meta.env.BASE_URL`, así funciona igual en Pages, en local o en un fork.
- Aprendido: `navigator.clipboard.writeText` puede fallar sin permiso/activación y el `catch` dejaba
  al usuario **sin ningún aviso** (fallo silencioso detectado al probarlo). Ahora hay tres niveles:
  hoja nativa → portapapeles con aviso → aviso + **el enlace siempre visible en la tarjeta** para
  copiarlo a mano. Cancelar la hoja nativa no muestra nada, que es lo correcto.

## Rediseño del personaje: el corazón con corona (2026-08-03)

- **La hija de Javier dibujó a Glyno en papel** y ese diseño SUSTITUYE a la pera verde. Elementos que
  hay que respetar: corazón por capas (contorno azul oscuro, aro lila, centro rosa), ojos grandes con
  dos brillos, sonrisa pequeña, **corona** dorada arriba (al principio la interpreté como fuego:
  es una corona), dos antenas onduladas con un corazoncito en la punta y una colita ondulada.
- Los dos corazoncitos NO son antenas: son **GLOBOS** que sujeta con **bracitos** mediante cuerdas
  (en el dibujo se ve la X del nudo en la mano). Corregido el 2026-08-03 a petición de Javier.
- 3D (`Mascot3D.tsx`): corazón con `THREE.Shape` + `ExtrudeGeometry` biselado en tres capas
  concéntricas. Piezas y por qué están donde están (medidas reales del cuerpo: cara frontal en
  z≈0.61, lóbulos hasta y≈1.31, media anchura máx. ≈1.36):
  - **Corona**: banda cilíndrica + aro + 5 conos con bolita, APOYADA sobre los lóbulos
    (y = 1.135·1.2 − 0.06, z = 0.28). Es la única colocación en la que se ve: dentro de la muesca
    queda enterrada entre los lóbulos y detrás solo asoman las puntas (se probaron ambas).
  - **Brazos**: hombro bajo y abierto (±0.95, −0.45, 0.2) con rotación z = ∓1.05 y mano a 0.62 del
    hombro ⇒ la mano cae en |x|≈1.48, FUERA de la silueta. Con z pequeño quedaban embebidos.
  - **Globos**: un grupo por lado anclado EN la mano; dentro, cuerda `TubeGeometry` desde el origen
    y el corazón colgado por su punta (`HEART_HALF · escala` por encima del final de la cuerda).
    Al animar se rota el grupo ⇒ la cuerda nunca se despega de la mano.
  - **OJO**: la posición de la mano se calcula con trigonometría a mano, NO con `localToWorld`:
    justo tras `add()` las matrices de mundo aún no están actualizadas y salía descolocada.
  - **Los globos se recortaban al oscilar**: en un lienzo CUADRADO lo que limita es el ANCHO, no el
    alto. Con la cuerda abierta hacia fuera el borde del globo llegaba a 2,12 y el semiancho visible
    era 2,0. Arreglado subiendo los globos casi en vertical (desplazamiento x de la cuerda 0,35 →
    0,1), vaivén 0,13 → 0,11 y cámara 5,5 → 5,75: queda ~14% de margen. Para recalcularlo:
    semiancho visible = tan(fov/2) · distancia; borde del globo = mano + offset + vaivén + 1,135·escala.
  Animación: **latido lub-dub** (un corazón no "respira"), parpadeo, balanceo del cuerpo, globos
  oscilando desfasados y colita.
- Paleta: rosa #DE7A90, lila #B792C0, contorno #2F3757 (índigo oscuro: honra el azul del dibujo sin
  salirse del tono sobrio de la app), oro #D99A3C/#F0C24E. El rosa se distingue del rojo de alerta
  (#992817) para no confundir con "glucemia baja".
- Iconos: `public/icon.svg` rehecho con el mismo personaje (degradados) y `apple-touch-icon.png`
  regenerado (180px, vía descarga del canvas). `Mascot.tsx` (barra de pestañas) usa la versión plana
  sin antenas, que a 22px serían ruido.
- **Anécdota de depuración**: parecía que el 3D no renderizaba (solo un trazo fino). La escena estaba
  bien (26 mallas, 2,93 × 2,82) — la **página estaba desplazada** y solo se veía el borde inferior
  del canvas. Antes de dudar del código: `window.scrollTo(0, 0)`.

## Instalación (2026-08-03)
  `apple-touch-icon.png` (180px) se generó rasterizando el SVG en el navegador y **descargándolo**
  (`a.download` → ~/Downloads → mv a public/): evita pegar 22 KB de base64 a mano, que corrompe.
- **Botón de instalar que no aparecía**: dos causas. (1) `beforeinstallprompt` se dispara antes de
  que React monte → ahora se captura en `main.tsx` (`window.glynoInstallPrompt` + evento
  `glyno:installable`); tipos en `src/vite-env.d.ts`. (2) En Safari (y en el panel de preview, que
  es WebKit) ese evento NO EXISTE: no es un fallo de la app. `InstallHint` tiene ahora tres
  estados: botón nativo (Android/Chrome), guía de «Añadir a pantalla de inicio» (iOS) y guía de
  escritorio (Safari «Añadir al Dock» / Chrome icono ⊕).
- (3) La causa real de que Javier no la viera en el iPhone: **solo estaba en Hoy y Ajustes, y quien
  entra por primera vez ve el ONBOARDING**. Ahora `InstallHint` está también en el paso de
  bienvenida — que además es el mejor momento para instalar, porque en iOS la app añadida a la
  pantalla de inicio puede tener su propio almacenamiento y perderías el onboarding hecho en Safari
  (si pasa, se migra con la copia JSON). En Hoy se movió arriba (tras los botones rápidos) para que
  no haya que hacer scroll.
- **Diagnóstico de versiones**: Ajustes → "Acerca de Glyno" muestra `compilada el <fecha>`
  (`define: __BUILD__` en vite.config) y hay un botón **«Buscar actualización»** que fuerza
  `registration.update()` + reload. Sirve para saber si un móvil está sirviendo una versión
  cacheada por el service worker antes de buscar el fallo en otra parte.

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

## Documentación pública y licencia (2026-08-03)

- Se añadieron `README.md`, `CONTRIBUTING.md` y `LICENSE`.
- **`CHANGELOG.md` (2026-08-04, pedido por Javier)**: historial de mejoras de cara al usuario,
  en castellano y sin jerga, enlazado desde la cabecera del README. Convención: al cerrar un
  paquete de mejoras se sube la versión en `package.json` (que es lo que muestra «Acerca de
  Glyno») y se añade su sección al changelog, agrupando en Añadido/Corregido/Cambiado.
- **Decisión de Javier: «colaborativa pero no open source»** ⇒ source-available con TODOS LOS
  DERECHOS RESERVADOS. El LICENSE permite usar la app, leer/clonar el código, ejecutar copia propia
  para uso personal y enviar PRs; exige permiso escrito para redistribuir, publicar en tiendas, uso
  comercial o reutilizar partes. Incluye cesión de aportaciones (inbound = mismas condiciones, con
  posibilidad de relicenciar) y descargo de garantía + "no es producto sanitario".
  Está en lenguaje llano y así se dice: no es asesoramiento jurídico.
- El repo debe seguir PÚBLICO para que GitHub Pages sea gratis; público ≠ open source, que es
  exactamente lo que se buscaba.
- CONTRIBUTING recoge las convenciones (español de España, hexagonal con `ui` sin tocar `adapters`,
  comentarios mínimos, sin dependencias nuevas ni CDNs, móvil primero, paleta validada) y una lista
  explícita de **lo que no se acepta**: calculadoras de dosis, predicción de hipos, enviar datos
  de salud a servidores o cualquier telemetría más allá del contador anónimo de aperturas
  (`src/app/analytics.ts`), y gamificación con rachas.
- Verificado: sin claves en ficheros ni en el historial de git antes de dar visibilidad al repo.

## Versiones de CI y Node (2026-08-03)

- GitHub avisaba de que node20 está deprecado: las actions v4 lo usaban. Actualizadas a las últimas
  (todas ya en node24): `checkout@v7`, `setup-node@v7` (node-version 24), `configure-pages@v6`,
  `upload-pages-artifact@v5`, `deploy-pages@v5`.
- Docker local subido a `node:24-alpine` para que dev y CI corran el mismo Node. Verificado:
  v24.18.0, Vite arranca, `tsc --noEmit` limpio, build OK y las 5 pestañas funcionan.
- Para comprobar versiones sin adivinar:
  `curl -s https://api.github.com/repos/actions/checkout/releases/latest | grep tag_name`
  y el runtime real en `https://raw.githubusercontent.com/<action>/<tag>/action.yml` (línea `using:`).

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
