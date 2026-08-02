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
  PÚBLICO (Pages gratis).
  **OJO con las rutas absolutas**: en Pages la app NO está en la raíz. Todo enlace o redirección
  interna debe usar `import.meta.env.BASE_URL` (vale '/' en local y '/Glyno/' en Pages). Ya mordió
  dos veces: el `?reset` de main.tsx y el botón "Borrar todo" de Settings, que llevaba a
  javierbizarro.github.io/?reset → 404 (corregido 2026-08-03). Verificación rápida:
  `grep -o '"/?reset"' dist/assets/*.js` debe salir vacío tras `DEPLOY_BASE=/Glyno/ npm run build`.
  RECORDATORIO: Javier debe REGENERAR su clave de Gemini (quedó pegada en el chat de la sesión).
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
- **Datos automáticos (sensor de glucosa, sueño, pasos)**: PLAN ESCRITO, sin implementar, en
  `.claude/plan-datos-automaticos.md` (decidido así el 2026-08-03). Resumen: la fuente única debe
  ser Apple Salud / Health Connect (las apps de Libre y Dexcom ya escriben ahí ⇒ una integración da
  glucosa + sueño + pasos sin sacar datos del dispositivo); el puerto `HealthSource` + adaptadores
  encajan en la arquitectura actual; hace falta dedupe con `extId` (Dexie v2) y **agregación tipo
  AGP porque 96 lecturas/día rompen la UI actual**. Fases: A) puente con Atajos de iOS (0 €, sin
  Xcode), B) Android nativo con Capacitor (0 € distribución), C) iOS (99 $/año). Alternativas de
  sensor: Nightscout (limpia), API oficial de Dexcom (retraso 3 h, irrelevante para nosotros),
  LibreLinkUp (no oficial, necesita proxy: evitar).
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
- La periodicidad se escribe en el campo de dosis, que ahora se llama «Dosis y cuándo»
  («0,5 mg · los martes»). Icono 💊 para otra medicación y 💉 para las insulinas.
- IDEA PENDIENTE (no implementada): los GLP-1 son **semanales**, y acordarse del pinchazo semanal es
  un dolor real → recordatorio/registro de "hoy toca Ozempic" tendría valor. Requiere estructura de
  periodicidad en `Med` y avisos (ver plan de nativo).

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
- `suggestMoment` premarca el momento correcto: posprandial si hay comida de hace 45 min-3,5 h
  (distinguiendo desayuno/comida/cena), y por hora si no. **OJO con el orden de los ifs**: la
  madrugada va PRIMERO, porque a la 1:00 `h < 11` daba "ayunas" (bug corregido). Verificados los
  7 casos horarios.
- **Teclado en móvil**: las hojas de registro van ancladas abajo y el teclado las tapaba. Solución:
  `main.tsx` escucha `visualViewport` y publica `--kb` (alto del teclado); `.sheet` usa
  `margin-bottom: var(--kb)` + `max-height` + scroll, y el viewport lleva
  `interactive-widget=resizes-content`. NO se pudo verificar con teclado real (el panel de preview
  no lo tiene): comprobar en el iPhone.
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

## Icono e instalación (2026-08-03)

- **Logo = la criaturilla**: `public/icon.svg` rehecho como ilustración con degradados radiales
  (cuerpo de pera sombreado, brazos, pies, barriga, ojos con brillo, mofletes y brote con dos
  hojas) a juego con el Glyno 3D. `Mascot.tsx` (barra de pestañas) usa la misma silueta plana.
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
