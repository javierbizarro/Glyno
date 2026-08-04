<p align="center">
  <img src="public/icon.svg" width="96" alt="Glyno">
</p>

<h1 align="center">Glyno</h1>

<p align="center">
  Un copiloto para el día a día con diabetes.<br>
  Sin coste, sin servidores propios y con tus datos de salud en tu propio móvil.
</p>

<p align="center">
  <a href="https://javierbizarro.github.io/Glyno/"><b>Probar la app</b></a> ·
  <a href="CHANGELOG.md">Historial de mejoras</a> ·
  <a href="CONTRIBUTING.md">Cómo colaborar</a> ·
  <a href="LICENSE">Condiciones de uso</a>
</p>

<p align="center">
  <sub>El personaje de Glyno lo dibujó una niña de 8 años. 💛</sub>
</p>

---

## ⚠️ Lo primero

Glyno **no es un producto sanitario** y **no da consejo médico**. No calcula dosis de insulina, no
ajusta pautas y no diagnostica: eso es competencia exclusiva de tu equipo sanitario. Lo que hace es
ayudarte a registrar tus datos, entenderlos y llevarlos a la consulta.

## Qué hace

- **Diario en dos toques.** Glucemias (con el momento del día ya premarcado), tensión, comidas,
  insulina rápida, ejercicio, peso y etiquetas de contexto (mal sueño, estrés, alcohol, enfermedad…).
  Los platos y las dosis que repites aparecen como atajos: un toque y queda apuntado.
- **Tendencias y patrones.** Curva de 14 días con tu rango objetivo, tiempo en rango, medias y
  correlaciones calculadas en tu dispositivo: *«los días que haces ejercicio bajas 13 mg/dl»*,
  *«tras una cena copiosa subes 19»*.
- **Glyno, el copiloto.** Una valoración quincenal en lenguaje llano con consejos concretos anclados
  a tus propios datos, y un chat para preguntarle dudas. Nunca habla de dosis: si el patrón es
  asunto médico, te dice que lo lleves a tu endocrino.
- **Foto del plato.** Estimación de hidratos de carbono, semáforo y qué conviene evitar.
- **«¿Qué como ahora?»** Ideas para la comida siguiente según la hora, tu última glucemia y **los
  platos que ya sueles cocinar** (que son los que tienes en casa).
- **Informe para el endocrino.** Vista imprimible con el perfil glucémico de siete puntos, HbA1c
  estimada, tiempo en rango, tensión, peso y patrones. Se guarda como PDF desde el móvil.
- **Historial semanal** navegable, exportación a CSV y copia de seguridad restaurable.
- **Se instala y funciona sin conexión** (salvo lo que necesita la IA).

## Privacidad

No hay servidor ni cuentas. Tus datos de salud viven en el almacenamiento de tu navegador
(IndexedDB) y no salen de ahí. Dos excepciones, las dos transparentes:

- **La IA, si tú la activas**: el texto de tus datos recientes y las fotos que hagas viajan a la
  API de Google Gemini usando **tu propia clave gratuita**, que se guarda solo en tu dispositivo.
  Sin clave, la app funciona igual sin las funciones de IA.
- **Un contador anónimo de aperturas** ([GoatCounter](https://www.goatcounter.com)): al abrir la
  app se envía un único «alguien ha abierto Glyno». La petición no lleva ningún dato tuyo — ni
  cookies ni identificadores — y no se ejecuta ningún script de terceros: es una línea que puedes
  auditar en `src/app/analytics.ts`. Como en cualquier petición web, GoatCounter ve tu IP al
  recibirla; la usa solo para agrupar las visitas del día y no la guarda. Si tu navegador envía
  «Do Not Track» o Global Privacy Control, no se envía nada.

Como todo es local, conviene usar la **copia de seguridad** (Ajustes → *Crear copia de seguridad*)
para no perder el diario si cambias de móvil o borras los datos del navegador.

## Cómo usarla

1. Abre **https://javierbizarro.github.io/Glyno/** (o escanea `glyno-qr.png`).
2. Instálala para tenerla como una app: en **iPhone** con Safari → Compartir → *Añadir a pantalla de
   inicio*; en **Android** aparece un botón *Instalar*; en escritorio, el icono de la barra de
   direcciones.
3. Opcional: crea tu clave gratuita en [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
   y pégala en **Ajustes → Glyno IA** para activar las funciones de IA.

Sin datos propios todavía, en *Tendencias* puedes cargar 14 días de ejemplo para ver cómo funciona.

## Por dentro

PWA en **React + TypeScript + Vite**, datos en **IndexedDB** (Dexie), mascota **procedural con
three.js** y **Gemini** para la parte de IA. Sin backend.

La arquitectura es hexagonal pragmática, para que el día que haya app nativa (leer el sensor y el
sueño desde Apple Salud / Health Connect) solo haya que escribir adaptadores:

| Carpeta | Qué contiene |
|---|---|
| `src/domain/` | Lógica pura: rangos, estadísticas, patrones, momentos del día. Sin dependencias. |
| `src/ports/` | Interfaces: repositorios, asistente de IA, fuente reactiva. |
| `src/adapters/` | Implementaciones concretas: Dexie, localStorage, Gemini. |
| `src/app/` | Casos de uso y `container.ts`, donde se eligen los adaptadores. |
| `src/ui/` | Componentes React. Nunca importan de `adapters/`. |

Decisiones que quizá te sorprendan y tienen su motivo: la paleta de estados está **validada
computacionalmente** para daltonismo y contraste; los titulares usan Lora y los numerales Fraunces;
y la mascota se genera por código para que funcione offline sin descargar modelos.

## Desarrollo local

Solo necesitas **Docker**. No se instala nada en tu máquina.

```bash
make up      # levanta la app en http://localhost:5173
make prod    # compila y sirve la versión de producción en :4173
make reset   # borra perfil y diario del navegador
make logs    # sigue los logs
make down    # apaga
make help    # lista todo
```

## Cómo colaborar

Se agradecen ideas, informes de fallo y código — sobre todo si vives con diabetes y algo aquí te
resulta incómodo o inútil. Empieza por [CONTRIBUTING.md](CONTRIBUTING.md), que explica el entorno,
las convenciones y qué tipo de propuestas **no** van a entrar (calculadoras de dosis, enviar datos de
salud a servidores).

## Condiciones

Código a la vista y colaboración bienvenida, pero **no es software libre**: los derechos están
reservados. Los detalles, en [LICENSE](LICENSE).
