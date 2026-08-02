import type { Entry, Profile } from './types'
import { daysAgo } from './time'

export interface Gap {
  text: string
}

// máx. 2 avisos, cada uno explica qué gana el usuario — nunca regañar
export function findGaps(p: Profile, entries: Entry[], lastWeight?: Entry): Gap[] {
  const gaps: Gap[] = []
  const gl = entries.filter(e => e.kind === 'glucose')
  const week = daysAgo(6)

  if ((p.basal || p.bolus || p.pills) && p.meds.length === 0)
    gaps.push({ text: 'Si apuntas tu medicación en el botiquín (Ajustes), podré tener en cuenta tu pauta al valorar tus días.' })
  if (p.measurement !== 'none' && !gl.some(e => e.note === 'ayunas' && e.ts >= week))
    gaps.push({ text: 'Esta semana no tengo glucemias en ayunas — son la mejor foto de cómo amaneces. Con 2 o 3 ya puedo compararte las mañanas.' })
  if (!entries.some(e => e.kind === 'tag'))
    gaps.push({ text: 'Si marcas contexto (mal sueño, estrés, comida fuera…), puedo explicarte los días raros en vez de solo señalarlos.' })
  if (!p.birthYear || !p.heightCm)
    gaps.push({ text: 'Con tu año de nacimiento y altura (Ajustes → Sobre ti) afino el contexto y calculo tu IMC.' })
  if (!lastWeight || lastWeight.ts < daysAgo(30))
    gaps.push({ text: 'Una pesada al mes me basta para vigilar la tendencia del peso, que mueve mucho la glucosa.' })
  if (p.measurement !== 'none' && gl.length > 0 && gl.length < 14)
    gaps.push({ text: 'Con un par de mediciones al día los patrones salen mucho más nítidos.' })

  return gaps.slice(0, 2)
}
