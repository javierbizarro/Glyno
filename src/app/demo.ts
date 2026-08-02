import type { Entry, Profile } from '../domain/types'
import { entries } from './container'

const rnd = (a: number, b: number) => a + Math.random() * (b - a)
const r = (x: number) => Math.round(x)

// 14 días de datos plausibles con patrones que la IA pueda encontrar:
// mal sueño → mañanas altas · ejercicio → tardes más bajas · cena copiosa → noche alta
export async function seedDemo(p: Profile) {
  await entries.clear()
  const list: Entry[] = []
  const now = new Date()

  for (let d = 13; d >= 0; d--) {
    const day = new Date(now)
    day.setDate(now.getDate() - d)
    const at = (h: number, m = 0) => {
      const t = new Date(day)
      t.setHours(h, m, 0, 0)
      return t.getTime()
    }
    if (at(23, 30) < Date.now() - 15 * 24 * 3600e3) continue

    const badSleep = Math.random() < 0.28
    const exercise = Math.random() < 0.45
    const bigDinner = !exercise && Math.random() < 0.3

    if (badSleep) list.push({ ts: at(7, 45), kind: 'tag', label: 'Mal sueño' })

    list.push({ ts: at(8, 5), kind: 'glucose', value: r(rnd(90, 128) + (badSleep ? 42 : 0)), note: 'ayunas' })

    if (p.hypertension) list.push({ ts: at(8, 40), kind: 'bp', sys: r(rnd(124, 147)), dia: r(rnd(76, 92)) })

    list.push({ ts: at(9), kind: 'meal', label: 'Tostada con tomate y café', carbs: r(rnd(28, 40)) })
    if (p.bolus) list.push({ ts: at(9, 2), kind: 'insulin', value: r(rnd(3, 5)), label: 'bolo' })

    list.push({ ts: at(14), kind: 'meal', label: ['Lentejas con arroz', 'Pollo con ensalada', 'Pasta con verduras', 'Cocido'][d % 4], carbs: r(rnd(45, 75)) })
    if (p.bolus) list.push({ ts: at(14, 2), kind: 'insulin', value: r(rnd(5, 8)), label: 'bolo' })
    list.push({ ts: at(16), kind: 'glucose', value: r(rnd(122, 196)), note: 'después de comer' })

    if (exercise) {
      list.push({ ts: at(18, 30), kind: 'exercise', value: r(rnd(30, 50)), label: 'Caminar' })
      // alguna hipo post-ejercicio
      if (Math.random() < 0.35)
        list.push({ ts: at(19, 45), kind: 'glucose', value: r(rnd(58, 69)), note: 'antes de comer' })
    }

    if (bigDinner) list.push({ ts: at(21, 15), kind: 'tag', label: 'Cena copiosa' })
    list.push({ ts: at(21, 30), kind: 'meal', label: bigDinner ? 'Pizza y postre' : 'Tortilla y ensalada', carbs: r(bigDinner ? rnd(80, 110) : rnd(30, 50)) })
    if (p.bolus) list.push({ ts: at(21, 32), kind: 'insulin', value: r(rnd(4, 7)), label: 'bolo' })

    list.push({
      ts: at(23, 15),
      kind: 'glucose',
      value: r(rnd(105, 158) + (bigDinner ? 62 : 0) - (exercise ? 24 : 0)),
      note: 'antes de dormir',
    })
  }

  await entries.bulkAdd(list.filter(e => e.ts <= Date.now()))
}
