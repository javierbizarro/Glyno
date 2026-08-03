# Colaborar en Glyno

Gracias por pasarte. Glyno lo usa gente que convive con la diabetes todos los días, así que
cualquier cosa que reduzca fricción o quite ruido vale oro. También valen los informes de fallo y los
«esto me resulta incómodo» sin solución propuesta.

## Antes de escribir código

Abre un **issue** contándolo. Para propuestas grandes, mejor hablarlo antes que llegar con un PR de
500 líneas que quizá no encaje. Si vives con diabetes, dilo: tu criterio pesa más que el mío en
cualquier decisión de producto.

## Poner en marcha el proyecto

Solo hace falta **Docker**:

```bash
git clone git@github.com:javierbizarro/Glyno.git
cd Glyno
make up
```

La app queda en http://localhost:5173. Otros comandos: `make prod`, `make reset`, `make logs`,
`make down`, `make help`.

Para trabajar con las funciones de IA necesitas tu propia clave gratuita de
[Google AI Studio](https://aistudio.google.com/apikey) y pegarla en Ajustes → Glyno IA. **Nunca
subas una clave al repositorio.**

Antes de abrir un PR:

```bash
docker compose exec web npx tsc --noEmit   # no type errors
make prod                                   # builds cleanly
```

## Convenciones

- **Interfaz en español de España**, con el tú y sin jerga médica innecesaria. Glyno es cercano, no
  paternalista, y nunca riñe al usuario.
- **Código en inglés, app en español**: identificadores, comentarios y mensajes de commit van en
  inglés; todo lo que ve el usuario (interfaz, prompts de IA, datos del diario) sigue en español.
- **Arquitectura hexagonal** (ver el README). La regla dura: `src/ui/` **nunca** importa de
  `src/adapters/`. La lógica pura va a `domain/`; si orquesta puertos, a `app/`.
- **Comentarios mínimos**: solo para explicar lo que el código no puede decir por sí mismo
  (invariantes, unidades, decisiones no obvias). Nada de comentarios que narran la línea siguiente ni
  referencias a tickets o fechas.
- **Sin dependencias nuevas** salvo que aporten mucho: la app debe seguir siendo ligera, offline y
  gratuita de operar. Nada de CDNs: todo se empaqueta.
- **Móvil primero**: comprueba tus cambios a 375 px de ancho antes de darlos por buenos.
- **Accesibilidad**: la información no puede depender solo del color (por eso los estados llevan
  siempre etiqueta de texto), y la paleta de estados está validada para daltonismo y contraste. Si
  tocas colores de datos, hay que revalidarla.

## Lo que no va a entrar

No es por gusto, es por seguridad de quien la usa:

- **Calculadoras de dosis, bolos o correcciones**, y cualquier cosa que sugiera cambiar la
  medicación. Eso convierte la app en producto sanitario (marcado CE en la UE) y puede hacer daño
  real. Glyno registra la medicación que tú decides ponerte; no la propone.
- **Predicción de hipoglucemias** sin sensor continuo ni validación clínica: un falso negativo es
  peligroso.
- **Enviar datos de salud a servidores propios o de terceros**, telemetría, analítica o cuentas de
  usuario. El modelo es «tus datos no salen de tu dispositivo» y no se negocia.
- **Rachas y gamificación con culpa**. En una enfermedad crónica de por vida, romper una racha
  produce vergüenza y hace que la gente deje de mirar sus datos.

## Ideas por las que empezar

- Escáner de código de barras con [Open Food Facts](https://world.openfoodfacts.org/data) para leer
  los hidratos exactos de la etiqueta.
- Lista de preguntas para llevar a la consulta, que salga al final del informe médico.
- Control de existencias y caducidades (insulina abierta, tiras, agujas, sensores).
- Traducciones de la interfaz.
- Recordatorio de la medicación semanal (los GLP-1 tipo Ozempic se ponen un día fijo y se olvida).

Hay más contexto y decisiones ya tomadas en `.claude/memoria.md` y en
`.claude/plan-datos-automaticos.md`.

## Condiciones de tu aportación

Glyno no es software libre: los derechos están reservados (ver [LICENSE](LICENSE)). Al enviar un pull
request aceptas que tu aportación se integre en el proyecto bajo esas mismas condiciones y que el
autor pueda distribuirla o relicenciarla en el futuro, manteniendo tu autoría en el historial de git.
Si eso no te encaja, abre un issue y lo comentamos antes de que escribas nada.
