import type { Stats } from './stats'
import type { Profile } from './types'

/**
 * The fortnightly review, written here instead of asked for.
 *
 * Everything with substance was already ours: `computeStats` is what finds that moving days
 * pull the mean down 13, that big dinners push it up 19. The AI was only ever the writer. So
 * this covers the 100 % of people the AI does not reach — no key, no account, no connection,
 * no eligible phone — and it buys three things the AI cannot give: it is testable, it is
 * instant, and it *cannot* cross a red line, because there is no sentence in here that says
 * a dose.
 *
 * What it does not do, and must not pretend to: the chat and reading a plate off a photo.
 * With a key, Gemini still writes this better. This is the floor, not the ceiling.
 */

/** below this many readings a percentage is theatre, not information */
const MIN_FOR_PERCENT = 8
/** ADA's threshold for time below range: past it, lows stop being an anecdote */
const LOW_ALERT_PCT = 4
/** the AI is held to 180 words; so is this */
const MAX_WORDS = 180
/**
 * Below this many mg/dl a difference is measurement noise, not a pattern. Announcing "los días
 * que te mueves tu media baja 1 mg/dl" makes Glyno look like she is counting sand — and worse,
 * it would hang advice off nothing.
 */
export const MIN_PATTERN_DELTA = 5

const worthTelling = (delta: number | null | undefined, days: number, min = 2) =>
  delta != null && Math.abs(delta) >= MIN_PATTERN_DELTA && days >= min

/** rotates the wording as the diary grows, so a fortnightly reader is not read the same line */
const pick = <T,>(options: T[], seed: number): T => options[Math.abs(seed) % options.length]

const round = (x: number) => Math.round(x)

export function localReview(name: string, p: Profile, s: Stats): string {
  const measures = p.measurement !== 'none'

  // nothing to stand on: say so in one breath rather than padding it into a review
  if (s.n === 0) {
    return measures
      ? `${name}, esta quincena no me has dejado glucemias que mirar, así que no te voy a inventar una valoración. Con dos o tres mediciones al día durante unos días ya tengo con qué contarte algo que valga.`
      : `${name}, todavía no tengo suficiente para contarte nada con fundamento. Sigue apuntando lo que vayas viendo y en cuanto haya unos días te digo qué asoma.`
  }

  const lows = s.pctLow >= LOW_ALERT_PCT
  // with a handful of readings the percentage is meaningless, so no verdict hangs off it:
  // "vas bien" on two measurements is flattery, and it contradicts the opening
  const band = s.n < MIN_FOR_PERCENT ? 'thin' : lows ? 'lows' : s.tir >= 70 ? 'good' : s.tir >= 50 ? 'mixed' : 'rough'

  const parts = [
    opening(name, p, s, band),
    patterns(s),
    advice(p, s, lows),
    closing(name, band, s.n),
  ]
  return trim(parts.join('\n\n'))
}

function opening(name: string, p: Profile, s: Stats, band: string): string {
  const mean = s.mean != null ? round(s.mean) : null
  const n = s.n
  const readings = n === 1 ? 'una medición' : `${n} mediciones`

  // with a handful of readings a percentage swings wildly: the mean is all that holds up
  if (n < MIN_FOR_PERCENT) {
    return `${name}, llevas ${readings} esta quincena: todavía son pocas para sacar porcentajes, pero la media va por ${mean}. Con unas cuantas más empiezo a ver de verdad por dónde vas.`
  }

  const tir = round(s.tir)
  const fasting = s.fasting != null ? ` En ayunas te has movido por ${round(s.fasting)}.` : ''

  if (band === 'lows') {
    return `${name}, lo primero: un ${round(s.pctLow)} % de tus ${readings} se fue por debajo de rango, y eso pesa más que cualquier otra cosa de esta quincena. La media quedó en ${mean} y el ${tir} % dentro de rango.${fasting}`
  }
  if (band === 'good') {
    return pick(
      [
        `Buena quincena, ${name}: de tus ${readings}, el ${tir} % cayó dentro de rango y la media se quedó en ${mean}.${fasting}`,
        `${name}, esta quincena te ha salido redonda: ${tir} % del tiempo en rango sobre ${readings}, con la media en ${mean}.${fasting}`,
      ],
      n,
    )
  }
  if (band === 'mixed') {
    return pick(
      [
        `${name}, quincena de claros y sombras: ${readings}, media ${mean} y un ${tir} % en rango.${fasting}`,
        `${name}, esta quincena se queda a medio camino: ${tir} % en rango de ${readings}, con la media en ${mean}.${fasting}`,
      ],
      n,
    )
  }
  return `${name}, ha sido una quincena cuesta arriba: ${readings} con la media en ${mean} y un ${tir} % en rango.${fasting} Lo importante es que lo has seguido apuntando, que es lo que permite verlo.`
}

/** the context tags whose effect is big enough to be worth a sentence */
const tags = (s: Stats) => s.tagEffects.filter(t => Math.abs(t.delta) >= MIN_PATTERN_DELTA).slice(0, 2)

function patterns(s: Stats): string {
  const found: string[] = []

  if (worthTelling(s.exerciseDelta, s.exerciseDays)) {
    const d = Math.abs(round(s.exerciseDelta!))
    found.push(
      s.exerciseDelta! < 0
        ? `los días que te mueves tu media baja ${d} mg/dl (fueron ${s.exerciseDays} días)`
        : `los días que te mueves tu media sube ${d} mg/dl (${s.exerciseDays} días), que es al revés de lo esperable`,
    )
  }
  if (worthTelling(s.sleepDelta, s.shortSleepDays)) {
    const d = round(s.sleepDelta!)
    found.push(
      `tras las noches de menos de seis horas vas ${d > 0 ? d + ' mg/dl por encima' : Math.abs(d) + ' mg/dl por debajo'} (${s.shortSleepDays} noches)`,
    )
  }
  for (const t of tags(s)) {
    const d = round(t.delta)
    found.push(
      `después de «${t.label}» vas ${Math.abs(d)} mg/dl ${d > 0 ? 'por encima' : 'por debajo'} (${t.n} veces)`,
    )
  }

  if (!found.length)
    return 'Todavía no hay ningún patrón que se sostenga con estos datos, así que no te voy a señalar ninguno. En cuanto haya más días con contexto apuntado, te los saco.'

  const head = found.length === 1 ? 'Una cosa asoma en tus datos:' : 'Esto es lo que asoma en tus datos:'
  return `${head} ${found.join('; ')}.`
}

function advice(p: Profile, s: Stats, lows: boolean): string {
  const tips: string[] = []

  // lows come first and go to the people who can act on them; never to us
  if (lows)
    tips.push('Llevarle a tu equipo médico las bajas de esta quincena, con estos números delante.')

  if (worthTelling(s.exerciseDelta, s.exerciseDays) && s.exerciseDelta! < 0)
    tips.push(
      `Repetir lo que ya te está funcionando: fueron ${s.exerciseDays} días de catorce, y con uno o dos más la media lo nota.`,
    )

  if (worthTelling(s.sleepDelta, s.shortSleepDays) && s.sleepDelta! > 0)
    tips.push('Proteger las noches cortas: acostarte veinte minutos antes los días que se pueda.')

  for (const t of tags(s)) {
    const tip = TAG_TIPS[t.label]
    if (tip && !tips.includes(tip)) tips.push(tip)
  }

  if (s.fasting != null && s.fasting > p.high)
    tips.push('Comentar en tu próxima consulta cómo amaneces, que es lo que más se te repite.')

  if (!tips.length) {
    tips.push(
      'Marcar el contexto (estrés, comida fuera, mala noche) cuando toque: es lo que convierte un número raro en una explicación.',
    )
    if (p.measurement !== 'none')
      tips.push('Un par de medidas en ayunas esta semana: son la mejor foto de cómo amaneces.')
  }

  return ['Puedes probar:', ...tips.slice(0, 3).map(t => `· ${t}`)].join('\n')
}

/** advice tied to each context tag, in habits and never in medication */
const TAG_TIPS: Record<string, string> = {
  'Cena copiosa': 'En las cenas grandes, empezar por la verdura y la proteína y dejar el hidrato para el final.',
  'Mal sueño': 'Proteger las noches cortas: acostarte veinte minutos antes los días que se pueda.',
  Estrés: 'Diez minutos de paseo los días cargados: es lo que más suaviza esos picos.',
  Alcohol: 'Si bebes, que sea acompañado de comida, y mira cómo vas antes de acostarte.',
  'Comida fuera': 'Fuera de casa, la verdura primero y el pan aparte, para verlo venir.',
  Enfermo: 'Los días de enfermedad, mirar más a menudo y avisar a tu equipo si la cosa no remonta.',
  Regla: 'Apuntar esos días sin falta: si el patrón se repite, es información buena para tu consulta.',
  'Olvido medicación': 'Dejar el botiquín a la vista, junto a algo que ya hagas siempre a la misma hora.',
}

function closing(name: string, band: string, seed: number): string {
  if (band === 'thin')
    return `Con unos días más de registro te cuento algo con fundamento, ${name}. Ahora mismo sería adivinar.`
  if (band === 'lows')
    return `El resto de la quincena está bien trabajado, ${name}. Resuelve lo de las bajas con quien te lleva y lo demás sigue su curso.`
  if (band === 'good')
    return pick(
      [`Vas bien, ${name}. Lo difícil de esto es la constancia, y esa ya la tienes.`, `Buen trabajo, ${name}. Seguimos por aquí.`],
      seed,
    )
  if (band === 'mixed')
    return `Nada de esto es una nota, ${name}: es información para la quincena que viene.`
  return `Una quincena regular no borra lo de antes, ${name}. Seguimos.`
}

/** the word budget is a promise about how long this takes to read: advice is cut, never the numbers */
function trim(text: string): string {
  const paragraphs = text.split('\n\n')
  while (paragraphs.join(' ').trim().split(/\s+/).length > MAX_WORDS) {
    const lines = paragraphs[2].split('\n')
    if (lines.length <= 2) break
    paragraphs[2] = lines.slice(0, -1).join('\n')
  }
  return paragraphs.join('\n\n')
}
