# Atajo «Glyno Salud» — traer datos de Apple Salud a Glyno

Glyno no puede leer Apple Salud directamente (es una web app y esa API es solo para apps
nativas). El puente es un **atajo de iOS**: lee Salud con tu permiso, formatea los datos y los
deja **copiados en el portapapeles**; en Glyno los pegas con un botón. Nada sale de tu iPhone.

Trae: **sueño**, **pasos**, **entrenamientos** (con distancia) y la **glucosa** que tu app de
sensor vuelque en Salud (FreeStyle LibreLink y Dexcom lo hacen).

## El formato que Glyno entiende

El atajo debe dejar copiado un JSON exactamente con esta forma (claves en inglés):

```json
{"app":"glyno","type":"health","samples":[
  {"kind":"steps","date":"2026-08-04","value":9241},
  {"kind":"sleep","date":"2026-08-04","minutes":412},
  {"kind":"weight","date":"2026-08-04","value":92.4},
  {"kind":"glucose","ts":"2026-08-04T08:05:00","value":112},
  {"kind":"exercise","ts":"2026-08-04T18:30:00","minutes":42,"label":"Caminar","km":3.4}
]}
```

- `date` (AAAA-MM-DD) para los datos **diarios**: pasos del día, sueño de la noche que termina
  esa mañana, peso. `ts` (fecha y hora local ISO) para los datos **puntuales**: cada glucemia y
  cada entrenamiento.
- Reimportar lo mismo no duplica nada (Glyno de-duplica por muestra), y los pasos de hoy se
  **actualizan** si vuelves a importar con un número mayor.
- Muestras fuera de rango plausible se descartan (p. ej. glucosa fuera de 20–600).

## Montar el atajo (app Atajos, ~10 min)

> Receta orientativa — los nombres exactos de las acciones pueden variar con la versión de iOS.
> La primera vez que se ejecute, iOS pedirá permiso para leer cada tipo de dato de Salud.

1. **Pasos de hoy**: acción «Buscar muestras de salud» → tipo *Pasos*, agrupado por *Día*,
   fecha de inicio *hoy* → te da el total del día.
2. **Sueño**: «Buscar muestras de salud» → tipo *Sueño* (estado *Dormido*), última noche,
   y suma los minutos de los tramos («Calcular estadísticas» → *Suma*).
3. **Glucosa**: «Buscar muestras de salud» → tipo *Glucosa en sangre*, fecha de inicio
   *últimas 24 horas* (la automatización diaria cubre el resto). Con un «Repetir con cada»
   construye una línea `{"kind":"glucose","ts":"<Fecha del ejemplo en formato ISO 8601>","value":<Valor>}`
   por muestra y acumúlalas en una variable con «Añadir a variable».
4. **Entrenamientos**: acción «Buscar entrenamientos» → *hoy* → por cada uno, línea
   `{"kind":"exercise","ts":"<inicio ISO>","minutes":<duración en minutos>,"label":"<tipo>","km":<distancia>}`.
5. **Montar el JSON**: acción «Texto» con la envoltura
   `{"app":"glyno","type":"health","samples":[` + las líneas separadas por comas + `]}`.
6. **Copiar al portapapeles**: acción «Copiar al portapapeles» con ese texto.
7. Nómbralo **«Glyno Salud»** (el botón de Glyno lo lanza por ese nombre exacto).

### Automatización diaria

En Atajos → Automatización → «A las 22:30» → ejecutar «Glyno Salud», con «Ejecutar
inmediatamente» activado (sin pedir confirmación). Cada noche te deja los datos del día
copiados; a la mañana siguiente, un toque en «Pegar datos de Salud» y listo.

## Usarlo desde Glyno

En **Ajustes → Salud del iPhone**:

- **«Traer datos de Salud»** lanza el atajo (se abre la app Atajos un instante). Al volver a
  Glyno, toca **«Pegar datos de Salud»**. Son tres gestos: iOS no permite leer el portapapeles
  sin que tú lo pidas, y es deliberado — nadie puede leerte el portapapeles sin que lo sepas.
- El mismo atajo funciona con **Siri** («Oye Siri, Glyno Salud»), desde un icono en la pantalla
  de inicio o con el botón de acción del iPhone.

### Alternativa por URL (para atajos avanzados)

El atajo puede abrir directamente `https://…/Glyno/#import=<JSON codificado como URL>`.
**Siempre en el fragmento (`#import=`), jamás como query (`?import=`)**: el fragmento no sale
del navegador; una query dejaría tus glucemias en los logs del servidor. Ojo: en iOS la app
instalada y Safari tienen almacenes separados — esta ruta puede abrir «el Safari equivocado»,
por eso la ruta recomendada es el portapapeles.

## Expectativas honestas

- La glucosa en Salud va **por detrás del sensor** (LibreLink vuelca con retraso variable).
  Glyno trae lo más fresco que Salud tenga; para ver la glucemia al minuto, tu app del sensor.
- Pasos, sueño y entrenamientos van al día.
- Las calorías quemadas **no se importan** a propósito: en Glyno el movimiento no compensa
  comida.

## ¿Y en Android?

No hay equivalente preinstalado a Atajos. **Tasker** (~3,5 €) puede leer Health Connect y
alimentar este mismo formato, pero la vía buena en Android será la app nativa (gratuita de
distribuir) cuando llegue — ver `.claude/plan-datos-automaticos.md`.
