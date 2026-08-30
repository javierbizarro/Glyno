# Historial de mejoras

Qué ha cambiado en Glyno, de lo más nuevo a lo más viejo. La versión que llevas se ve en
Ajustes → «Acerca de Glyno».

## 0.9.0 — 29 de agosto de 2026

### Añadido

- **Asistente de clave de IA**: activar la IA ya no es «vete a una página de Google y apáñatelas».
  En **Ajustes → Glyno IA** (y desde el aviso de Glyno o Comida) hay un asistente de **tres pasos**
  con dibujos de lo que vas a ver: abrir la página, crear la clave y copiarla, y pegarla aquí con
  un botón **«📋 Pegar la clave»**. Glyno comprueba sola que la clave funciona antes de guardarla y,
  si algo falla, lo dice en castellano («Google no acepta esa clave», «no hay conexión», «las claves
  empiezan por AIza»).
- **IA del propio dispositivo, sin clave**: si el navegador trae su propia IA (Chrome en Android y
  escritorio), Glyno la detecta y la usa — el texto no sale del dispositivo y no hace falta ninguna
  clave. Si hace falta descargar el modelo, hay un botón que lo prepara con su barra de progreso.
  Con clave *y* IA del dispositivo, tú eliges cuál manda. En el iPhone todavía no existe esa
  puerta para las apps web: llegará con la app nativa.
- En Ajustes, la clave guardada se ve enmascarada, con botones para **comprobar que funciona**,
  cambiarla o quitarla.

### Corregido

- **Las claves nuevas de Google (`AQ.…`) no se aceptaban.** Google ha cambiado el formato: ya no
  todas empiezan por `AIza`. Glyno daba por hecho el formato viejo y rechazaba las nuevas sin
  probarlas siquiera. Ahora reconoce las dos formas, rescata cualquier otra que Google invente
  mañana (de todo lo pegado, la clave es lo más largo sin espacios) y **ningún mensaje vuelve a
  decir por dónde tiene que empezar una clave**.
- La clave viaja ahora en una **cabecera** y no en la dirección de la petición: las direcciones
  acaban en registros e historiales, y los formatos nuevos llevan caracteres que ahí estorban.
- Cuando la clave está mal formada, Google responde con un error (401) que Glyno no entendía y
  soltaba en crudo. Ahora dice lo que hay que oír, y añade que una clave recién creada a veces
  tarda un par de minutos en funcionar.
- **El asistente rechazaba claves sin siquiera probarlas.** Si lo pegado no tenía la forma que
  Glyno esperaba, contestaba «las claves empiezan por AIza» y ahí se quedaba. Ahora esa forma es
  solo un consejo: salvo lo que es inútil enviar (una dirección web, algo demasiado corto), la
  clave se prueba **contra Google**, que es quien decide. Si Google la rechaza, entonces sí se
  añade la pista.
- **Y esa pista era ilegible**: en la tipografía de la app «AIza» y «Alza» se dibujan igual. Ahora
  la clave se escribe en tipografía monoespaciada (donde la i mayúscula y la ele se distinguen) y
  el aviso lo deletrea: «empiezan por A-I-z-a, y la segunda letra es una i mayúscula, no una ele».
- Al pegar en el recuadro, la clave se comprueba sola (y una sola vez).
- **Faltaban pasos y sobraban viajes.** El asistente daba por hecho cosas que Google pide de
  verdad (aceptar las condiciones, elegir un proyecto), y te hacía salir y volver tres veces.
  Ahora **todo lo que vas a encontrar allí se explica antes de salir**, en una lista, y solo
  sales **una vez**: en cuanto vuelves a Glyno, el asistente se planta solo en «pega la clave»,
  sin que tengas que buscar por dónde ibas.

### Mejorado

- **Las respuestas de la IA se leen aunque vengan torcidas.** Antes, si el modelo envolvía el
  análisis en markdown, se dejaba una coma de más o se quedaba a medias, salía un error. Ahora
  se repara lo reparable y, si aun así no hay manera, Glyno lo pregunta **una segunda vez** por
  su cuenta (solo cuando el fallo es del formato: si es la cuota o la conexión, no insiste).
  Las etiquetas en castellano que devuelven algunos modelos («verde», «alto», «casero») también
  se entienden. Lo único que nunca se inventa son los gramos de hidratos: si no se pueden leer,
  se vuelve a preguntar.

## 0.8.0 — 29 de agosto de 2026

### Retirado

- **El atajo de Salud «Glyno Salud» se retira.** Resultó demasiado frágil (dependía de textos
  según el idioma, ventanas de fechas y avisos de iOS que rompían la ejecución) y daba números
  que no siempre eran de fiar — y un dato erróneo es peor que no tener el dato. Los datos
  automáticos de Apple Salud volverán con la **app nativa**, leyendo HealthKit directamente:
  sin atajos, sin portapapeles y con los entrenamientos incluidos. El diario manual, como
  siempre, no cambia.

## 0.7.0 — 29 de agosto de 2026

### Añadido

- **Apuntar con la hora real**: si registras algo tarde (la comida de las 14:00 apuntada a
  las 17:00), la hoja de registro deja ajustar la hora — «¿Fue antes? Ajusta la hora» — y el
  registro cae donde de verdad ocurrió. El momento sugerido de la glucemia se recalcula con
  esa hora.

### Corregido

- El atajo contaba los pasos de ayer junto a los de hoy (salían más de 20.000): ahora toma
  solo el día en curso, también en minutos de actividad y distancia en bici.

## 0.6.0 — 4 de agosto de 2026

### Añadido

- **Los 150 minutos semanales**: el atajo trae ahora los minutos de ejercicio detectados por
  el iPhone (el anillo de actividad) y la distancia en bici diaria, y la tarjeta de
  movimiento muestra tu progreso hacia los 150 minutos semanales que recomiendan la OMS y la
  ADA — en minutos, nunca en calorías. Lo apuntado a mano y lo detectado no se suman dos
  veces: cada día cuenta el máximo de los dos.
- Un día con 30+ minutos de actividad detectada, o con 3+ km de bici, cuenta como día activo
  aunque los pasos no lleguen.

### Corregido

- El atajo suma cualquier muestra de sueño (el filtro por «Dormido» dejaba fuera las
  entradas manuales de Salud) y ya no intenta leer sesiones de entrenamiento, que Atajos no
  permite leer en el iOS actual.

## 0.5.3 — 4 de agosto de 2026

### Añadido

- El atajo «Glyno Salud» ya está **publicado en iCloud**: el botón de Ajustes abre la vista
  previa de Atajos en un solo toque, también desde la app instalada.
- El importador entiende los formatos que Atajos imprime tal cual: «8.734 pasos»,
  «6 h 52 min», «412 min», «92,1 kg».

## 0.5.2 — 4 de agosto de 2026

### Corregido

- «Añadir el atajo» daba «la importación ha fallado»: el mecanismo de importación directa de
  Atajos solo acepta enlaces de iCloud. El botón vuelve a la descarga del fichero (con la app
  ya fuera del medio), y la guía explica las alternativas mientras publicamos el enlace de
  iCloud definitivo.

## 0.5.1 — 4 de agosto de 2026

### Corregido

- El botón «Añadir el atajo» no hacía nada desde la app instalada (la app interceptaba la
  descarga y te llevaba a Hoy). Ahora abre la app Atajos directamente, y los ficheros
  descargables quedan fuera de la caché de la aplicación.

## 0.5.0 — 4 de agosto de 2026

### Añadido

- **Datos automáticos desde Apple Salud** (primera fase, sin coste y sin apps intermedias): un
  atajo de iOS lee tu sueño, pasos, entrenamientos y la glucosa que vuelque tu sensor, y Glyno
  lo importa desde el portapapeles con un botón en Ajustes → «Salud del iPhone». Nada sale de
  tu dispositivo. El atajo **se instala con un toque** desde Ajustes (fichero firmado servido
  por la propia web); el formato es texto normal (`pasos 8734`, `sueño 6h35`) y hasta puedes
  escribir las líneas a mano en una nota. Guía en `docs/atajo-salud.md`.
- Reimportar no duplica nada, y los pasos de hoy se actualizan si vuelves a importar más tarde.
- Los registros importados se distinguen en el diario con «· Salud».
- **Los pasos cuentan como movimiento**: a partir de 8.000 pasos el día cuenta como activo y la
  tarjeta de Hoy te lo reconoce («Hoy ya llevas 9.241 pasos») sin que tengas que apuntar nada.
- **El sueño entra en los patrones**: con dos o más noches de menos de 6 horas, Tendencias y
  Glyno muestran cuánto sube tu glucosa tras dormir poco. El contexto de la IA incluye tu sueño
  y pasos medios.
- Los entrenamientos importados guardan la distancia. Las calorías quemadas no se importan a
  propósito: en Glyno el movimiento no compensa comida.

### Corregido

- La tarjeta «Última glucemia» podía enseñar una lectura antigua si los datos entraban
  desordenados (solo pasaba con importaciones).

## 0.4.0 — 4 de agosto de 2026

### Añadido

- **Ayuda con el peso, sin contar calorías**: la gráfica de peso de Tendencias usa ahora la
  **media semanal** (el dato diario baila con el agua y la sal), en Ajustes puedes poner un
  objetivo de peso opcional — mejor pactado con tu equipo sanitario — que se dibuja en la
  gráfica, y con IMC alto aparece el recordatorio de que perder un 5-10 % ya mejora mucho el
  control glucémico.
- Con IMC ≥ 27, Glyno (la IA) activa solo su **modo peso**: lee tu tendencia semanal y orienta
  sus consejos a saciedad, raciones y orden de los alimentos — en lenguaje de glucosa, nunca
  contando calorías ni proponiendo dietas. El plan concreto sigue siendo de tu equipo sanitario.
- La IA recibe la evolución del peso (tendencia semanal), no solo la última pesada.
- Los datos de ejemplo incluyen pesadas semanales para ver la gráfica en acción.

## 0.3.0 — 4 de agosto de 2026

### Añadido

- **Recordatorio de medicación semanal** (Ozempic, Trulicity y compañía): en el botiquín puedes
  marcar qué día te toca, y ese día aparece en Hoy la tarjeta «Hoy toca…» con un botón para
  apuntarlo en un toque. La pauta se ve también en Ajustes y en el informe médico.
- Glyno (la IA) ahora sabe qué es cada fármaco de tu botiquín — insulina basal, rápida o
  medicación no insulínica — y su pauta semanal si la tiene.

### Corregido

- En iPhone (y con el teclado abierto) el último mensaje del chat quedaba pegado o tapado por la
  caja de escribir.
- El paseo tras la cena también se sugiere pasada la medianoche: la ventana es de digestión, no
  de calendario.
- Con el diario vacío, la IA ya no recibe porcentajes inventados («0 % en rango» sin ninguna
  medición).
- Ajustes internos de reloj: el momento sugerido de la glucemia y la tarjeta de movimiento
  calculan sus ventanas respecto al instante correcto.

## 0.2.0 — 3 y 4 de agosto de 2026

### Añadido

- **Informe médico imprimible** (14/30/90 días): métricas con HbA1c estimada orientativa, tabla
  día×momento coloreada, tensión, peso y patrones. Pensado para llevarlo al endocrino.
- **Historial navegable por semanas**, con media, tiempo en rango y el día a día completo.
- **Recomendaciones de qué comer** según la hora, tu última glucemia y los platos que ya
  apuntaste (tu diario hace de despensa), con salvaguarda si vienes de una hipoglucemia.
- **Análisis de comida más completo**: fibra, calorías orientativas y grado de procesamiento.
  El semáforo valora la glucosa y la calidad, nunca las calorías.
- **Tarjeta de movimiento** en Hoy: sugerencias según glucemia y comidas, sin calorías, sin
  rachas y sin culpa.
- **Modo sin diagnóstico**: rangos de referencia de persona sana, onboarding más corto y sin
  HbA1c estimada.
- **Perfil glucémico clásico de 7 puntos** (ayunas, antes/después de cada comida, al dormir),
  con el momento pre-marcado según la hora.
- **Medicación no insulínica** bien recogida (pastillas e inyectables tipo Ozempic), con
  ejemplos en los formularios del botiquín.
- **Registro en un toque**: chips con tus comidas, dosis y ejercicios habituales.
- **Borrar un registro** (con confirmación), por si el dedo mete 999 donde no era.
- **Tour de bienvenida** de 6 pasos, saltable y repetible desde Ajustes.
- **Compartir Glyno** desde Ajustes, con la hoja nativa del móvil.
- **Rediseño del personaje**: el corazón con corona, bracitos y globos — sobre el dibujo en
  papel de la hija de Javier, que firma el diseño.
- Contador anónimo de aperturas con servicio propio (sin cookies ni identificadores; respeta
  «No rastrear» y GPC). Es la única telemetría admitida y está documentada en el README.
- Batería de tests automáticos que corre antes de cada commit y en cada despliegue.
- Documentación pública: README, guía de colaboración y condiciones de uso.

### Corregido

- El chat se ancla abajo como un chat de verdad, con el aviso legal como nota de cabecera.
- La foto del plato tiene en cuenta tu rango, tu última glucemia y la hipertensión (avisa de la
  sal), con salvaguarda en hipoglucemia.
- Las tendencias se dibujan desde la primera medición, avisando cuando los porcentajes aún
  bailan.
- El teclado del móvil ya no tapa las hojas de registro.
- El onboarding no preselecciona respuestas que no diste.
- «Borrar todo» funcionaba mal en la versión instalada desde GitHub Pages (ruta del reset).
- El sello de compilación de «Acerca de Glyno» sale en hora española.

## 0.1.0 — 2 de agosto de 2026

- Primera versión: onboarding por perfiles, diario de Hoy (glucemia, tensión, comida, insulina
  rápida, ejercicio, peso y contexto), tendencias de 14 días con patrones, Glyno 3D, valoración
  quincenal y chat con IA (Gemini con tu propia clave), copia de seguridad JSON con
  restauración, export CSV e instalación como app (PWA) servida desde GitHub Pages.
