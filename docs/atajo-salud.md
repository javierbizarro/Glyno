# Atajo «Glyno Salud» — traer datos de Apple Salud a Glyno

Glyno no puede leer Apple Salud directamente (es una web app y esa API es solo para apps
nativas). El puente es un **atajo de iOS**: lee Salud con tu permiso y deja los datos
**copiados en el portapapeles**; en Glyno los pegas con un botón (Ajustes → Salud del iPhone).
Nada sale de tu iPhone.

## Instalarlo: un toque

En el iPhone, **Ajustes → Salud del iPhone → «⬇️ Añadir el atajo “Glyno Salud”»**: descarga el
fichero (firmado con la herramienta oficial de Apple, `shortcuts sign`) y, al tocar la
descarga en Safari, se abre la vista previa de Atajos → «Añadir atajo».

Si en vez de descargarse se abre la propia app, actualiza Glyno primero (Ajustes → «Buscar
actualización») o abre la URL en una **pestaña privada** de Safari:
<https://javierbizarro.github.io/Glyno/Glyno%20Salud.shortcut>. Otra vía rápida con un Mac a
mano: AirDrop del fichero `public/Glyno Salud.shortcut` — se abre directo en Atajos.

El nombre del fichero es el nombre con el que se importa, y debe quedarse **«Glyno Salud»**
tal cual: el botón «Traer datos de Salud» lo lanza por ese nombre exacto.

> Nota técnica: el esquema `shortcuts://import-shortcut?url=…` NO sirve aquí — solo acepta
> enlaces de iCloud (`icloud.com/shortcuts/…`). Cuando el atajo esté validado y compartido por
> iCloud, ese enlace será el botón definitivo (vista previa en un solo toque).

Tras añadirlo, ábrelo una vez en Atajos y **revisa las dos acciones de «Buscar muestras de
salud»** (el propio atajo lo recuerda en su primer paso): la primera debe ser *Pasos* de
*hoy*, la segunda *Sueño* desde *ayer*. La primera ejecución pedirá permiso de lectura de
Salud. Después ya es rutina: ejecutar → volver a Glyno → «Pegar datos de Salud».

## El formato es texto normal (nada de JSON)

Glyno entiende líneas de texto sencillas, una por dato. Esto es un pegado válido:

```
glyno salud
pasos 8734
sueño 6h35
peso 92,1
```

- La primera línea es siempre `glyno salud`.
- Sin fecha, se entiende **hoy** (el sueño, la noche que termina hoy). Con fecha, delante del
  valor: `pasos 2026-08-03 10234` — recomendable en la automatización nocturna, porque quizá
  lo pegues a la mañana siguiente.
- Sueño: `6h35`, `7h` o `395min`. Peso: con coma o punto.
- También hay glucosa y entrenamientos (ver «Más datos» abajo).
- Pruébalo sin atajo: escribe esas líneas en una nota, cópialas y pega en Glyno. Así de tonto.

Reimportar lo mismo no duplica nada, y los pasos de hoy se **actualizan** si vuelves a
importar con un número mayor. Las muestras imposibles (glucosa de 700…) se descartan.

## Montarlo a mano (solo si prefieres no instalar el fichero)

El atajo mínimo — sueño + pasos, 6 acciones, sin bucles. En la app **Atajos** → «+» → nuevo
atajo, llamado exactamente **«Glyno Salud»**:

1. **«Buscar muestras de salud»** → tipo *Pasos* · agrupar por *Día* · hoy.
   Te da el total de pasos del día en una variable.
2. **«Buscar muestras de salud»** → tipo *Sueño* · desde ayer.
3. **«Calcular estadísticas»** → *Suma* sobre el resultado del paso 2 (los tramos de sueño
   se suman; el resultado está en minutos).
4. **«Texto»** con este contenido, insertando las variables mágicas:
   ```
   glyno salud
   pasos [resultado del paso 1]
   sueño [resultado del paso 3]min
   ```
   (fíjate en el `min` pegado a la variable del sueño).
5. **«Copiar al portapapeles»** con ese texto.
6. Ejecuta el atajo una vez: iOS pedirá permiso de lectura de Salud — concédelo.

Y en Glyno: **Ajustes → Salud del iPhone → «Pegar datos de Salud»**. Hecho.

> Los nombres exactos de las acciones pueden variar un poco con la versión de iOS. Si algo no
> cuadra, pega en Glyno lo que el atajo haya copiado: el aviso de error te dirá si el problema
> es el formato, y comparar con el ejemplo de arriba suele destaparlo en segundos.

### Automatización diaria

Atajos → Automatización → «A las 22:30» → ejecutar «Glyno Salud» → «Ejecutar inmediatamente».
Cada noche deja los datos copiados; por la mañana, un toque en «Pegar datos de Salud».
Para ese caso conviene añadir la fecha en el paso 4 (variable «Fecha actual» con formato
`aaaa-MM-dd` delante de cada valor), y así da igual cuándo pegues.

### Lanzarlo desde Glyno

El botón **«Traer datos de Salud»** de Ajustes abre el atajo por su nombre. También funciona
con Siri («Oye Siri, Glyno Salud»), desde un icono en la pantalla de inicio o con el botón de
acción. Son tres gestos en total (lanzar → volver → pegar): iOS no deja leer el portapapeles
sin que tú lo pidas, y es deliberado.

## Más datos: glucosa, entrenamientos y peso

Cuando el atajo mínimo funcione, puedes añadir líneas (estas sí requieren un «Repetir con
cada» en Atajos para recorrer las muestras):

```
glucosa 08:10 118
glucosa 2026-08-03 22:15 141
ejercicio 18:30 Caminar 40min 3,2km
peso 92,1
```

- **Glucosa**: hora y valor. La que vuelca tu app del sensor en Salud (LibreLink y Dexcom lo
  hacen) — ojo, Salud va **por detrás del sensor**, con retraso variable; para el minuto a
  minuto, tu app del sensor.
- **Ejercicio**: hora, nombre, minutos (`40min`) y distancia opcional (`3,2km`). Las calorías
  quemadas no se importan a propósito: en Glyno el movimiento no compensa comida.

## Formato avanzado (JSON)

Para atajos elaborados o cualquier otra integración, Glyno acepta también JSON estricto:

```json
{"app":"glyno","type":"health","samples":[
  {"kind":"steps","date":"2026-08-04","value":9241},
  {"kind":"sleep","date":"2026-08-04","minutes":412},
  {"kind":"weight","date":"2026-08-04","value":92.4},
  {"kind":"glucose","ts":"2026-08-04T08:05:00","value":112},
  {"kind":"exercise","ts":"2026-08-04T18:30:00","minutes":42,"label":"Caminar","km":3.4}
]}
```

Existe además la entrega por URL: abrir `https://…/Glyno/#import=<datos codificados>`.
**Siempre en el fragmento (`#import=`), jamás como query (`?import=`)**: el fragmento no sale
del navegador; una query dejaría tus glucemias en los logs del servidor. En iOS la app
instalada y Safari tienen almacenes separados, así que esta ruta puede abrir «el Safari
equivocado» — la recomendada es el portapapeles.

## ¿Y en Android?

No hay equivalente preinstalado a Atajos. **Tasker** (~3,5 €) puede leer Health Connect y
producir este mismo texto, pero la vía buena en Android será la app nativa (gratuita de
distribuir) cuando llegue — ver `.claude/plan-datos-automaticos.md`.

---

**Para mantenedores**: el fichero instalable `public/Glyno Salud.shortcut` se genera firmando
la fuente [`docs/glyno-salud.shortcut.plist`](glyno-salud.shortcut.plist) en un Mac (el nombre
del fichero de salida ES el nombre del atajo al importarlo — no cambiarlo):

```
shortcuts sign --mode anyone --input docs/glyno-salud.shortcut.plist --output "public/Glyno Salud.shortcut"
```

Si se cambia la fuente (acciones, textos), hay que volver a firmar y probar la importación en
un iPhone real antes de publicar.
