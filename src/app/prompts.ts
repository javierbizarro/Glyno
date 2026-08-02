import type { Entry, Profile } from '../domain/types'
import { treatmentSummary, TYPE_LABEL } from '../domain/types'
import type { Stats } from '../domain/stats'

export function buildContext(p: Profile, stats: Stats, entries: Entry[], lastWeight?: Entry): string {
  const age = p.birthYear ? new Date().getFullYear() - p.birthYear : null
  const imc =
    lastWeight?.value && p.heightCm ? (lastWeight.value / Math.pow(p.heightCm / 100, 2)).toFixed(1) : null

  const perfil = [
    TYPE_LABEL[p.type],
    p.measurement === 'sensor' ? 'sensor continuo' : 'glucómetro de dedo',
    `tratamiento: ${treatmentSummary(p)}`,
    p.hypertension ? 'hipertenso' : null,
    `rango objetivo ${p.low}–${p.high} mg/dl`,
    age ? `${age} años` : null,
    imc ? `IMC ${imc}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const botiquin = p.meds.length
    ? p.meds.map(m => `${m.name}${m.dose ? ` ${m.dose}` : ''}`).join('; ')
    : 'sin medicación registrada'

  const nums = [
    `${stats.n} mediciones`,
    stats.mean != null ? `media ${Math.round(stats.mean)}` : null,
    `${Math.round(stats.tir)}% en rango`,
    `${Math.round(stats.pctLow)}% bajas`,
    `${Math.round(stats.pctHigh)}% altas`,
    stats.fasting != null ? `ayunas media ${Math.round(stats.fasting)}` : null,
    stats.bpMean ? `tensión media ${Math.round(stats.bpMean.sys)}/${Math.round(stats.bpMean.dia)}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const patrones = [
    stats.exerciseDelta != null && stats.exerciseDays >= 2
      ? `- días con ejercicio: ${Math.round(stats.exerciseDelta)} mg/dl (${stats.exerciseDays} días)`
      : null,
    ...stats.tagEffects.slice(0, 4).map(t => `- tras "${t.label}": ${t.delta > 0 ? '+' : ''}${Math.round(t.delta)} mg/dl (${t.n} veces)`),
  ]
    .filter(Boolean)
    .join('\n')

  const hipos = entries.filter(e => e.kind === 'glucose' && e.value! < p.low).length

  return `Eres Glyno, copiloto de diabetes: cercano, llano, hablas de tú, español de España. REGLAS INQUEBRANTABLES: nunca sugieras dosis, cambios de medicación ni diagnósticos; si un patrón es asunto médico (hipoglucemias repetidas, ayunas altas persistentes), tu consejo es llevárselo al equipo sanitario con este resumen. No inventes causas que los datos no muestren.

PERFIL: ${perfil}
BOTIQUÍN (pauta fija): ${botiquin}
ÚLTIMOS 14 DÍAS: ${nums} · ${hipos} hipoglucemias
PATRONES CALCULADOS CON SUS DATOS (medias frente a su media general; interpreta SOLO estos):
${patrones || '- (aún no hay patrones con datos suficientes)'}`
}

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

export function mealPrompt(p: Profile, hasPhoto: boolean, desc: string): string {
  return `Eres el nutricionista de bolsillo de una persona con diabetes ${TYPE_LABEL[p.type]} (tratamiento: ${treatmentSummary(p)}). Analiza esta comida${hasPhoto ? ' de la foto' : ''}${desc ? ` (el usuario dice: "${desc}")` : ''}.

Devuelve SOLO un JSON válido, sin markdown, con esta forma exacta:
{"plato": "nombre corto del plato", "hidratos_g": número entero (estimación total de hidratos de carbono en gramos), "indice_glucemico": "bajo"|"medio"|"alto", "semaforo": "verde"|"ambar"|"rojo" (verde=amigable con su glucosa, ambar=con moderación, rojo=le va a dar un pico), "consejo": "1-2 frases prácticas y cercanas en español (orden de los alimentos, acompañamientos, ración) SIN hablar de medicación ni dosis", "mejor_evitar": ["0 a 3 elementos del plato que más le suben la glucosa"]}

Si la imagen no parece comida, devuelve {"plato": "no es comida", "hidratos_g": 0, "indice_glucemico": "bajo", "semaforo": "verde", "consejo": "No he reconocido comida ahí.", "mejor_evitar": []}`
}
