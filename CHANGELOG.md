# Historial de mejoras

Qué ha cambiado en Glyno, de lo más nuevo a lo más viejo. La versión que llevas se ve en
Ajustes → «Acerca de Glyno».

## 0.10.0 — 30 de agosto de 2026

### Añadido

- **Glyno como app de iPhone de verdad.** Hasta ahora era una web que te añadías a la pantalla de
  inicio; ahora hay una app nativa, con su icono, su pantalla de arranque y sin la barra de Safari
  por medio. Por dentro es la misma Glyno de siempre — los datos, el diario y todo lo demás no
  cambian.
- **Salud del iPhone: tus datos entran solos.** Glucosa, pasos, sueño, peso, tensión y
  entrenamientos pasan de la app Salud a tu diario **sin que tengas que apuntar nada**. La primera
  vez trae el histórico del último año; después se pone al día sola cada vez que abres Glyno o
  vuelves a ella. Nada se duplica: cada dato se guarda con el identificador que le da Salud, y los
  totales del día (los pasos, por ejemplo) se actualizan según crecen en vez de repetirse.
  Está en **Ajustes → Salud del iPhone**, y ahí decides tú: Glyno solo **lee**, nunca escribe nada
  en Salud, y nada de eso sale de tu iPhone.
- Los entrenamientos llegan con su nombre y su distancia (Caminar, Correr, Bici, Natación…), que es
  algo que la ruta antigua de Atajos no sabía hacer. Y la **tensión** entra por primera vez sola.
- Al apuntar ejercicio, si Salud ya vio actividad hoy Glyno te lo dice («Salud ya ha visto 42 min de
  actividad hoy»), para que solo apuntes lo que le falte — nadar, pesas o la bici estática, que el
  móvil no ve.

- **Glyno ya no necesita IA para darte la valoración quincenal.** Si no has activado la IA —o si la
  tienes activada pero falla, porque no hay internet o se agotó la cuota gratuita— Glyno la escribe
  ella misma con tus mismos números: cómo vas, qué patrones asoman, dos o tres cosas que probar y
  una frase de cierre. Es instantánea y no sale nada de tu móvil. Te dice siempre quién la ha
  escrito, porque con la IA activada te la cuenta con más soltura y no queremos colártela.

- **Leer la medicación de una foto ahora admite la hoja de tratamiento**, no solo las cajas. Suele
  ser más cómoda —lo lleva todo y con las pautas— y antes te la desaconsejábamos. Se sigue diciendo
  con claridad lo que hay que saber: la foto viaja a Google, así que tapa con el dedo la cabecera
  del papel, donde van tu nombre y tu tarjeta sanitaria. Y Glyno tiene orden de no copiar nada de
  eso aunque salga en la imagen.

- **IA en el propio iPhone, sin clave** (iPhone 15 Pro y posteriores, con Apple Intelligence
  activado). Cuando está, Glyno responde sin cuenta, sin internet y sin que nada salga del móvil.
  Cuando no está —que es la mayoría de iPhones— todo sigue igual que hasta ahora. La IA del
  dispositivo no sabe mirar fotos: el plato sigue necesitando la clave de Google.
- **Gráfica de «un día promedio» para quien lleva sensor.** Si tus glucemias entran a ritmo de
  sensor, la curva de 14 días se convierte en una mancha ilegible; en su lugar Glyno dibuja tus
  catorce días superpuestos en uno solo: una línea con dónde sueles estar a cada hora y dos bandas
  con cuánto te baila. Es como se leen los sensores en la consulta. Con mediciones de dedo no
  aparece, porque con cuatro pinchazos al día esos porcentajes no significarían nada.

- **Si llevas sensor, Glyno deja de hablarte como si te pincharas el dedo.** Ya no te pide
  glucemias en ayunas ni «un par de mediciones al día» —tienes 288—, y la valoración te habla de
  **tiempo en rango** en vez de contarte cuántas veces mediste. Lo que sí te dirá, si hace falta,
  es que tu sensor no le está llegando y cómo traerlo desde Salud.

### Corregido

- **El informe médico no se imprimía dentro de la app.** El botón usaba el diálogo del navegador,
  que dentro de una app no existe: se pulsaba y no pasaba nada. Ahora abre la hoja de impresión del
  iPhone, con el informe ya maquetado en A4, y desde ahí se guarda como PDF o se manda a una
  impresora. De paso se llama **«Imprimir»**, que es lo que hace, y los tres periodos (14, 30 y 90
  días) ya no se amontonan: van en su propia fila.
- **La cabecera del informe se metía debajo de la isla dinámica.**
- **El informe se salía por la derecha en el móvil.** La tabla del registro diario está pensada
  para un A4 y en una pantalla de teléfono no cabía: ahora solo salen los momentos en los que de
  verdad mides —una columna de guiones no informa de nada—, y la tabla reparte el ancho disponible
  en vez de desbordarse. En papel no cambia nada.
- **Con varias medicinas, la cabecera del informe se leía como un muro.** El botiquín va ahora en
  su propia línea, con su etiqueta «Medicación:», separado del tratamiento.
- La foto del plato y la del botiquín podían cerrar la app de golpe: faltaba declararle a iOS para
  qué usa Glyno la cámara y las fotos.
- **La app giraba a horizontal**, donde nada estaba pensado para verse. Ahora se queda en vertical,
  como ya hacía la versión web.
- **El icono de Glyno en la barra de abajo seguía siendo un corazón con corona**, el cuerpo que
  perdió hace dos versiones. Ahora es la Glyno de verdad, con su brote.
- **Con la IA del propio iPhone, preguntarle por una dosis devolvía un mensaje de ánimo que nunca
  respondía a la pregunta** — y de ahí alguien podía salir pensando que le habían dicho que sí.
  Ahora lo primero que dice es que eso no lo decide ella, y sigue con tus números para que se los
  lleves a tu equipo. Sin relleno genérico ni exclamaciones.
- Glyno anunciaba como patrón diferencias de 1 o 2 mg/dl, que son ruido de medición y no significan
  nada. Ahora se calla por debajo de 5, y tampoco se los pasa a la IA para que los redacte.

### Cambiado

- Dentro de la app **no hay contador de aperturas**: el ping anónimo de GoatCounter se queda solo
  en la versión web. La app no manda absolutamente nada a ningún sitio, y por eso ya no lo promete.
- Desaparecen las cosas que en una app no significan nada: la tarjeta de «instalar Glyno» (ya está
  instalada) y el botón de «buscar actualización» (las actualizaciones vienen de la tienda).
- **Compartir Glyno** manda ahora una dirección fija de la web. Antes compartía «la dirección en la
  que estás», que dentro de una app es un enlace que no abre nada.

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
- **Glyno cambia de cuerpo (y de sombrero).** Su cara —los ojos grandes y la sonrisa que dibujó
  una niña de 8 años— es exactamente la misma. Lo que cambia es el cuerpo, que era un corazón y
  ahora es redondeado, y lo que le crece en la cabeza, que era una corona y ahora es un brote.
  Dos motivos: un corazón en una app de salud se lee como tensión (y la app ya usa uno para eso),
  y una corona es el icono universal de «premium», que es justo lo que Glyno no es. Un brote,
  además, dice lo que sí hace: cuidarse poco a poco.
  **También se despide de los globos.** Eran de la lámina original y hacían gracia, pero no
  sobrevivían a ningún tamaño pequeño y hacían que el Glyno de la app no se pareciera al del
  icono. Se queda con sus brazos, que ahora sí asoman. El icono de la app, el personaje pequeño
  de la barra de pestañas y el Glyno grande salen del **mismo dibujo**, que antes eran tres
  hechos por separado.
- **El botiquín se puede rellenar con una foto.** En Ajustes → Botiquín, «📷 Leer mi medicación
  de una foto»: haces una foto a las cajas y Glyno saca el nombre, la dosis tal como está impresa
  y si es una pastilla, una insulina lenta o una rápida. **Nada se guarda sin que tú lo
  confirmes**: sale una lista donde puedes corregir cada campo y marcar solo lo que quieras.
  Lo que ya tenías manda: si el medicamento ya está con otra dosis, te enseña las dos y **se
  queda la tuya** salvo que marques la de la foto; y lo que no salga en la foto no se toca ni se
  borra — fotografiar dos cajas no vacía el botiquín.
  La IA aquí solo **copia lo que pone**: no propone dosis, no corrige pautas y, si algo no se
  lee, lo deja en blanco en vez de inventarlo. Con las cajas basta; si fotografías una receta,
  la app te recuerda que ese papel lleva además tu nombre y tus datos.
- **Las conversaciones con Glyno se separan solas, por día.** Antes había un único hilo que
  además **se comía en silencio los mensajes viejos** (guardaba solo los 20 últimos). Ahora la
  pestaña de Glyno enseña la conversación de hoy y, arriba, un discreto «Conversaciones
  anteriores» donde están las de días pasados por fecha, con la primera pregunta de cada una para
  reconocerlas de un vistazo. Si cambias de tema el mismo día, «Empezar una conversación nueva»
  corta el hilo. Nada que nombrar ni que ordenar. Se guardan las de los últimos 30 días, y a
  Glyno solo le llega la conversación en curso: contesta más centrado y gasta menos cuota.
- **El contexto se apunta con el dato, no aparte.** Al registrar una glucemia, una tensión o una
  comida puedes marcar ahí mismo «Mal sueño», «Estrés», «Alcohol»… y queda pegado al número:
  el diario lee **«212 mg/dl · ayunas · Mal sueño»** y el CSV para el médico lleva su columna
  «contexto». Si el número **sale de tu rango**, Glyno lo pregunta sola —«¿Algo que lo
  explique?»—, que es justo el momento en que sabes la respuesta; si va bien, no molesta: queda
  como un «+ Añadir contexto» discreto.
  El botón «Contexto» del diario se queda para lo que no acompaña a ningún número (un olvido de
  medicación, una mala noche antes de medirte), y los patrones de Tendencias suman las dos
  formas: una etiqueta puesta en la glucemia de las 8:00 sigue explicando el resto del día, y
  ahora también se explica a sí misma.

### Corregido

- **Las claves nuevas de Google (`AQ.…`) no se aceptaban.** Google ha cambiado el formato: ya no
  todas empiezan por `AIza`. Glyno daba por hecho el formato viejo y rechazaba las nuevas sin
  probarlas siquiera. Ahora reconoce las dos formas, rescata cualquier otra que Google invente
  mañana (de todo lo pegado, la clave es lo más largo sin espacios) y **ningún mensaje vuelve a
  decir por dónde tiene que empezar una clave**.
- **Ya no se dice por dónde empieza una clave, en ningún sitio**: Google cambió el formato una
  vez y volverá a hacerlo.
- **Cuando Gemini está saturado, se dice tal cual.** Antes salía el error en crudo («the model is
  overloaded») o, peor, «no hay conexión a internet» cuando la conexión estaba perfecta. Ahora
  Glyno distingue tres cosas distintas: que la clave esté mal, que **no haya manera de saberlo**
  (Google saturado o sin contestar) y que de verdad no haya internet.
- **Y ya no se queda colgado**: si Google no contesta en 20 segundos, el asistente lo dice y te
  deja **probar otra vez** o **guardar la clave igualmente** — una clave buena no se tira porque
  Google esté ocupado. Si se guarda sin comprobar, la pantalla final lo dice claramente en vez de
  prometer que funciona.
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

- **Si un modelo está saturado o sin cupo, Glyno baja al siguiente.** El plan gratuito de Google
  se gasta **por modelo** (unas 20 peticiones al día cada uno), así que quedarse sin uno no es
  quedarse sin IA: ahora, cuando el modelo de siempre contesta «ocupado» o «sin cupo», Glyno
  pregunta a tu cuenta qué otros modelos tiene y va probando, del mejor al más humilde. Recuerda
  cuál contestó, así que la siguiente pregunta ya no empieza por el agotado. Si la clave está mal,
  no insiste: eso no cambia de un modelo a otro.
- El recuadro de la clave **ya no la comprobaba en cada tecla**: escribiéndola a mano se gastaban
  varias peticiones de las pocas que da el plan gratuito. Ahora se comprueba una sola vez, cuando
  terminas.

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
