import type { Entry, Med, Profile } from '../domain/types'
import { treatmentSummary, TYPE_FULL } from '../domain/types'
import { WEEKDAY_LABEL } from '../domain/medication'
import { thousands } from '../domain/number'
import { bmiOf, WEIGHT_FOCUS_BMI, weeklyWeights, weightTrendPerWeek } from '../domain/weight'
import type { Stats } from '../domain/stats'

// Prompt bodies are product copy: they stay in Spanish because Glyno speaks Spanish.
// JSON keys requested from the model are English — they are code, parsed by app/meals.ts.

export function buildContext(p: Profile, stats: Stats, entries: Entry[], weights: Entry[] = []): string {
  const age = p.birthYear ? new Date().getFullYear() - p.birthYear : null
  const lastWeight = weights.length ? weights[weights.length - 1] : undefined
  const bmiNum = bmiOf(lastWeight?.value, p.heightCm)
  const bmi = bmiNum?.toFixed(1) ?? null

  const general = p.type === 'none'

  const profileLine = [
    general ? 'sin diagnóstico de diabetes (usa la app para cuidarse)' : TYPE_FULL[p.type].toLowerCase(),
    p.measurement === 'none'
      ? 'no mide glucosa habitualmente'
      : p.measurement === 'sensor'
        ? 'sensor continuo'
        : 'glucómetro de dedo',
    `tratamiento: ${treatmentSummary(p)}`,
    p.hypertension ? 'hipertenso' : null,
    `rango objetivo ${p.low}–${p.high} mg/dl`,
    age ? `${age} años` : null,
    bmi ? `IMC ${bmi}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  // the model must know which drug is which: "Lantus 22 U" alone reads like a mystery
  const KIND_NOTE: Record<Med['kind'], string> = {
    pill: 'no insulínica',
    basal: 'insulina basal',
    bolus: 'insulina rápida',
  }
  const medCabinet = p.meds.length
    ? p.meds
        .map(m => {
          const weekly = m.weekday != null ? `, semanal: ${WEEKDAY_LABEL[m.weekday]}` : ''
          return `${m.name}${m.dose ? ` ${m.dose}` : ''} (${KIND_NOTE[m.kind]}${weekly})`
        })
        .join('; ')
    : 'sin medicación registrada'

  // without readings, percentages would be made-up precision ("0% en rango" reads as alarming)
  const numbers = [
    stats.n === 0 ? 'sin glucemias registradas' : `${stats.n} mediciones`,
    stats.mean != null ? `media ${Math.round(stats.mean)}` : null,
    stats.n > 0 ? `${Math.round(stats.tir)}% en rango` : null,
    stats.n > 0 ? `${Math.round(stats.pctLow)}% bajas` : null,
    stats.n > 0 ? `${Math.round(stats.pctHigh)}% altas` : null,
    stats.fasting != null ? `ayunas media ${Math.round(stats.fasting)}` : null,
    stats.bpMean ? `tensión media ${Math.round(stats.bpMean.sys)}/${Math.round(stats.bpMean.dia)}` : null,
    stats.sleepMean != null
      ? `sueño medio ${String(Math.round(stats.sleepMean / 6) / 10).replace('.', ',')} h`
      : null,
    stats.stepsMean != null ? `pasos medios ${thousands(stats.stepsMean)}/día` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const patterns = [
    stats.exerciseDelta != null && stats.exerciseDays >= 2
      ? `- días con ejercicio: ${Math.round(stats.exerciseDelta)} mg/dl (${stats.exerciseDays} días)`
      : null,
    stats.sleepDelta != null && stats.shortSleepDays >= 2
      ? `- tras dormir menos de 6 h: ${stats.sleepDelta > 0 ? '+' : ''}${Math.round(stats.sleepDelta)} mg/dl (${stats.shortSleepDays} noches)`
      : null,
    ...stats.tagEffects.slice(0, 4).map(t => `- tras "${t.label}": ${t.delta > 0 ? '+' : ''}${Math.round(t.delta)} mg/dl (${t.n} veces)`),
  ]
    .filter(Boolean)
    .join('\n')

  const hypoCount = entries.filter(e => e.kind === 'glucose' && e.value! < p.low).length

  // Spanish decimal comma: these numbers are prose for the model, not data
  const kg = (x: number) => String(round1(x)).replace('.', ',')
  const weekly = weeklyWeights(weights)
  const trend = weightTrendPerWeek(weekly)
  const weightLine = lastWeight?.value
    ? '\nPESO: ' +
      [
        `última pesada ${kg(lastWeight.value)} kg`,
        bmi ? `IMC ${bmi}` : null,
        trend != null
          ? `tendencia ${trend > 0 ? '+' : ''}${kg(trend)} kg/semana (media semanal de ${weekly.length} semanas)`
          : null,
        p.targetWeightKg ? `objetivo pactado con su equipo: ${kg(p.targetWeightKg)} kg` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : ''

  // weight mode: satiety and habits in glucose language; calorie counting and diet
  // plans are red lines (adherence, guilt loops, hypo risk under insulin)
  const weightMode =
    bmiNum != null && bmiNum >= WEIGHT_FOCUS_BMI
      ? `\nMODO PESO (IMC ≥ ${WEIGHT_FOCUS_BMI}, se activa solo): a esta persona le beneficia perder peso, y lo que le va bien a su glucosa casi siempre le va bien al peso — díselo en lenguaje de glucosa y hábitos: saciedad, raciones, orden de los alimentos, verdura y proteína primero. NUNCA cuentes ni menciones calorías, ni propongas dietas ni planes de adelgazamiento. Si viene al caso, recuérdale que perder un 5-10 % ya mejora mucho el control y que el plan concreto se pacta con su equipo sanitario. Lee la tendencia sin culpa: si baja, reconócelo; si no, ni una palabra de reproche.`
      : ''

  return `Eres Glyno, copiloto de diabetes: cercano, llano, hablas de tú, español de España. REGLAS INQUEBRANTABLES: nunca sugieras dosis, cambios de medicación ni diagnósticos; si un patrón es asunto médico (hipoglucemias repetidas, ayunas altas persistentes), tu consejo es llevárselo al equipo sanitario con este resumen. No inventes causas que los datos no muestren.${general ? ' OJO: esta persona no tiene diabetes diagnosticada, usa la app para cuidarse; no hables de «tu diabetes» ni des por hecho ningún diagnóstico.' : ''}

PERFIL: ${profileLine}
BOTIQUÍN (pauta fija): ${medCabinet}
ÚLTIMOS 14 DÍAS: ${numbers}${stats.n > 0 ? ` · ${hypoCount} hipoglucemias` : ''}${weightLine}${weightMode}
PATRONES CALCULADOS CON SUS DATOS (medias frente a su media general; interpreta SOLO estos):
${patterns || '- (aún no hay patrones con datos suficientes)'}`
}

const round1 = (x: number) => Math.round(x * 10) / 10

export function reviewPrompt(ctx: string, name: string): string {
  return `${ctx}

TAREA: escribe la valoración quincenal para ${name} con esta estructura exacta, en párrafos cortos sin títulos ni markdown:
1) Cómo va (2-3 frases con los números clave).
2) Qué patrones se ven, interpretando SOLO los listados.
3) "Puedes probar": 2 o 3 consejos accionables anclados a esos patrones (hábitos, horarios, medición — jamás medicación).
4) Una frase de cierre con ánimo.
Máximo 180 palabras.`
}

export function chatPrompt(ctx: string, history: string, name: string): string {
  return `${ctx}

CONVERSACIÓN RECIENTE:
${history}

TAREA: responde al último mensaje de ${name} como Glyno, en máximo 120 palabras. Si la pregunta pide consejo médico o de dosis, recuérdale con cariño que eso es de su equipo sanitario.`
}

export function suggestMealPrompt(
  ctx: string,
  info: { moment: string; time: string; lastReading: string; usual: string[]; others: string[] },
): string {
  return `${ctx}

MOMENTO: son las ${info.time}, toca ${info.moment}.
ÚLTIMA GLUCEMIA: ${info.lastReading}
PLATOS QUE SUELE TOMAR A ESTA HORA (salen de su propio diario, así que los tiene a mano y le gustan): ${info.usual.join(' · ') || '(todavía ninguno)'}
OTROS PLATOS DE SU DIARIO: ${info.others.join(' · ') || '(ninguno)'}

TAREA: propón 2 o 3 ideas para ${info.moment}. Devuelve SOLO JSON válido, sin markdown, con las claves EXACTAMENTE así (en inglés) y todos los textos en español:
{"options":[{"dish":"nombre corto","carbs_g":número entero,"why":"media frase con el motivo, ligada a su glucemia o a sus patrones"}],"avoid":["0 a 2 cosas que ahora mismo le conviene dejar para otro día"],"note":"una frase de cierre, cercana"}

REGLAS: prioriza platos de su diario o variaciones mínimas de ellos (ingredientes que ya tiene); si no hay historial suficiente, propón comida casera española sencilla. Ajusta la propuesta a su glucemia actual y a sus patrones. Nunca hables de medicación ni dosis.`
}

export function mealPrompt(
  p: Profile,
  hasPhoto: boolean,
  desc: string,
  info: { lastReading: string; hypo: boolean },
): string {
  const who =
    p.type === 'none'
      ? 'una persona sin diabetes que vigila su glucosa para cuidarse'
      : `una persona con ${TYPE_FULL[p.type].toLowerCase()} (tratamiento: ${treatmentSummary(p)})`
  // the med cabinet is left out on purpose: it adds nothing the treatment line doesn't
  // already say, and having drug names and doses in front of the model pulls it toward
  // the red line of dosing advice
  const context = [
    `rango objetivo ${p.low}–${p.high} mg/dl`,
    `última glucemia: ${info.lastReading}`,
    p.hypertension ? 'tiene además hipertensión' : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return `Eres el nutricionista de bolsillo de ${who}. Analiza esta comida${hasPhoto ? ' de la foto' : ''}${desc ? ` (el usuario dice: "${desc}")` : ''}.

CONTEXTO: ${context}

Devuelve SOLO un JSON válido, sin markdown, con las claves EXACTAMENTE así (en inglés) y todos los textos en español:
{"dish": "nombre corto del plato", "carbs_g": número entero (estimación total de hidratos de carbono en gramos), "fiber_g": número entero (fibra estimada), "calories_kcal": número entero (estimación orientativa), "processing": "homemade"|"processed"|"ultraprocessed", "glycemic_index": "low"|"medium"|"high", "traffic_light": "green"|"amber"|"red" (green=amigable con su glucosa, amber=con moderación, red=le va a dar un pico), "advice": "1-2 frases prácticas y cercanas en español (orden de los alimentos, acompañamientos, ración) SIN hablar de medicación ni dosis", "better_avoid": ["0 a 3 elementos del plato que más le suben la glucosa"]}

IMPORTANTE: el semáforo (traffic_light) valora el impacto en su glucosa y la calidad del alimento, NUNCA las calorías. El aceite de oliva, los frutos secos, el aguacate o el pescado azul son calóricos y saludables; el pan blanco o un zumo tienen menos calorías y son peores para su glucemia.

AJUSTA A SU MOMENTO: si viene de una glucemia alta, sé más exigente con el semáforo y con el consejo; si viene en rango, no alarmes. Si la última medición es de hace horas, no la trates como si fuera de ahora.${p.hypertension ? ' Tiene hipertensión: si el plato lleva bastante sal (embutido, conservas, salsas, queso curado, precocinados, encurtidos), dilo en el consejo aunque su glucemia vaya bien.' : ''} Nunca hables de medicación ni dosis, tampoco si su glucemia está fuera de rango.
${info.hypo ? '\nATENCIÓN — su última glucemia está POR DEBAJO de su rango y es reciente: lo primero es resolver la hipoglucemia. No le digas que evite hidratos, no pongas traffic_light en red por los azúcares y deja "better_avoid" vacío; si el plato le sirve para remontar, dilo con claridad en el consejo.\n' : ''}
Si la imagen no parece comida, devuelve {"dish": "no es comida", "carbs_g": 0, "fiber_g": 0, "calories_kcal": 0, "processing": "homemade", "glycemic_index": "low", "traffic_light": "green", "advice": "No he reconocido comida ahí.", "better_avoid": []}`
}

/**
 * Reading the med cabinet off a photo. The model TRANSCRIBES and nothing else: the red line
 * («nunca dosis ni cambios de medicación») is not softened by the fact that the doctor already
 * wrote the dose — copying it is fine, judging or completing it is not.
 */
export function medsPhotoPrompt(): string {
  return `Eres un lector de etiquetas. En la foto hay cajas de medicación o una receta médica. Tu ÚNICA tarea es COPIAR lo que ponga, como un escáner.

REGLAS INQUEBRANTABLES: no propongas ni corrijas dosis, no digas si la pauta es adecuada, no añadas medicación que no aparezca en la imagen y no completes lo que no se lea. Si algo está borroso o cortado, déjalo vacío: es mucho mejor un hueco que un dato inventado, porque esto acaba en el historial de una persona con diabetes.

Devuelve SOLO JSON válido, sin markdown, con las claves EXACTAMENTE así (en inglés) y los textos en español tal como estén impresos:
{"meds":[{"name":"nombre del medicamento","dose":"la dosis y la pauta TAL CUAL estén escritas, o vacío si no se lee","kind":"pill"|"basal"|"bolus","weekday":número 0-6 o null}]}

- "kind": "basal" si es una insulina lenta o basal (Lantus, Toujeo, Abasaglar, Tresiba…), "bolus" si es una insulina rápida de las comidas (Humalog, NovoRapid, Fiasp, Apidra…), y "pill" para todo lo demás (pastillas como la metformina e inyectables no insulínicos como Ozempic o Trulicity).
- "weekday" SOLO si en la imagen se lee el día concreto de una pauta semanal (0 domingo … 6 sábado). Si no lo pone, null. No lo deduzcas.
- Un medicamento por caja o por línea de la receta. Si la misma caja aparece dos veces, ponla una sola vez.
- Si en la imagen no hay medicación reconocible, devuelve {"meds":[]}.`
}
