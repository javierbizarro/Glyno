import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Entry } from './types'
import {
  MEAL_MOMENT_LABEL,
  mealMoment,
  suggestMoment,
  usualDoses,
  usualExercises,
  usualMeals,
} from './meals'

// timestamps are built and read back in local time, so tests are TZ-independent
const at = (time: string, day = '2026-08-03') => new Date(`${day}T${time}:00`).getTime()

const meal = (time: string, label?: string, carbs?: number): Entry => ({
  ts: at(time),
  kind: 'meal',
  label,
  carbs,
})

const insulin = (time: string, value: number): Entry => ({ ts: at(time), kind: 'insulin', value })

const exercise = (value: number, label?: string): Entry => ({
  ts: at('18:00'),
  kind: 'exercise',
  value,
  label,
})

describe('mealMoment', () => {
  it('maps each slot start to its moment', () => {
    expect(mealMoment(at('05:00'))).toBe('breakfast')
    expect(mealMoment(at('11:00'))).toBe('between-meals')
    expect(mealMoment(at('13:00'))).toBe('lunch')
    expect(mealMoment(at('16:00'))).toBe('afternoon-snack')
    expect(mealMoment(at('20:00'))).toBe('dinner')
  })

  it('keeps the previous slot right up to each edge', () => {
    expect(mealMoment(at('04:59'))).toBe('between-meals')
    expect(mealMoment(at('10:59'))).toBe('breakfast')
    expect(mealMoment(at('12:59'))).toBe('between-meals')
    expect(mealMoment(at('15:59'))).toBe('lunch')
    expect(mealMoment(at('19:59'))).toBe('afternoon-snack')
    expect(mealMoment(at('22:59'))).toBe('dinner')
  })

  it('wraps the night (23h to 5h) into between-meals so late snacks are neither dinner nor breakfast', () => {
    expect(mealMoment(at('23:00'))).toBe('between-meals')
    expect(mealMoment(at('00:00'))).toBe('between-meals')
    expect(mealMoment(at('03:30'))).toBe('between-meals')
  })
})

describe('MEAL_MOMENT_LABEL', () => {
  it('has a Spanish label for every moment, ready for UI copy and prompts', () => {
    expect(MEAL_MOMENT_LABEL).toEqual({
      breakfast: 'el desayuno',
      'between-meals': 'un tentempié',
      lunch: 'la comida',
      'afternoon-snack': 'la merienda',
      dinner: 'la cena',
    })
  })
})

describe('usualMeals', () => {
  it('orders dishes by how often they were eaten', () => {
    const entries = [
      meal('13:30', 'Lentejas'),
      meal('13:30', 'Ensalada'),
      meal('13:30', 'Lentejas'),
      meal('13:30', 'Tortilla'),
      meal('13:30', 'Lentejas'),
      meal('13:30', 'Tortilla'),
    ]
    expect(usualMeals(entries).map(m => [m.label, m.times])).toEqual([
      ['Lentejas', 3],
      ['Tortilla', 2],
      ['Ensalada', 1],
    ])
  })

  it('groups labels case-insensitively and keeps the first spelling seen', () => {
    const entries = [
      meal('09:00', 'Tostada con aceite'),
      meal('09:00', '  TOSTADA CON ACEITE '),
      meal('09:00', 'tostada con aceite'),
    ]
    expect(usualMeals(entries)).toEqual([{ label: 'Tostada con aceite', times: 3, carbs: null }])
  })

  it('averages carbs over the entries that have them, rounded to a whole gram', () => {
    const entries = [meal('13:30', 'Paella', 40), meal('13:30', 'Paella', 51), meal('13:30', 'Paella')]
    expect(usualMeals(entries)).toEqual([{ label: 'Paella', times: 3, carbs: 46 }])
  })

  it('filters by meal moment when one is given', () => {
    const entries = [meal('08:00', 'Tostada'), meal('14:00', 'Lentejas'), meal('21:00', 'Sopa')]
    expect(usualMeals(entries, 'lunch')).toEqual([{ label: 'Lentejas', times: 1, carbs: null }])
    expect(usualMeals(entries, 'breakfast').map(m => m.label)).toEqual(['Tostada'])
  })

  it('ignores blank labels and non-meal entries, and caps the list at the limit', () => {
    const entries = [
      meal('14:00', '   '),
      meal('14:00', undefined),
      insulin('14:00', 6),
      meal('14:00', 'Arroz'),
      meal('14:00', 'Arroz'),
      meal('14:00', 'Pasta'),
      meal('14:00', 'Pisto'),
    ]
    expect(usualMeals(entries, undefined, 2).map(m => m.label)).toEqual(['Arroz', 'Pasta'])
  })
})

describe('usualDoses', () => {
  const entries = [
    insulin('13:30', 6),
    insulin('13:30', 6),
    insulin('13:30', 4),
    insulin('21:00', 10),
  ]

  it('returns the most repeated doses for the given moment first', () => {
    expect(usualDoses(entries, 'lunch')).toEqual([
      { value: 6, times: 2 },
      { value: 4, times: 1 },
    ])
  })

  it('falls back to every logged dose when the slot has none', () => {
    expect(usualDoses(entries, 'breakfast')).toEqual([
      { value: 6, times: 2 },
      { value: 4, times: 1 },
      { value: 10, times: 1 },
    ])
  })

  it('caps the list at the limit (3 by default)', () => {
    const many = [insulin('13:30', 2), insulin('13:30', 4), insulin('13:30', 6), insulin('13:30', 8)]
    expect(usualDoses(many)).toHaveLength(3)
    expect(usualDoses(many, undefined, 2)).toHaveLength(2)
  })
})

describe('usualExercises', () => {
  it('averages minutes and rounds to the nearest step of 5', () => {
    // avg of 30 and 44 is 37 -> 35; a lone 38 -> 40 (nearest, not floor)
    expect(usualExercises([exercise(30, 'Caminar'), exercise(44, 'Caminar')])).toEqual([
      { label: 'Caminar', times: 2, minutes: 35 },
    ])
    expect(usualExercises([exercise(38, 'Bici')])[0].minutes).toBe(40)
  })

  it('never goes below 5 minutes', () => {
    expect(usualExercises([exercise(2, 'Estiramientos')])[0].minutes).toBe(5)
  })

  it('labels unnamed activity as Ejercicio and groups case-insensitively', () => {
    expect(usualExercises([exercise(30), exercise(30, 'ejercicio')])).toEqual([
      { label: 'Ejercicio', times: 2, minutes: 30 },
    ])
  })

  it('orders by frequency and caps the list at the limit', () => {
    const entries = [
      exercise(30, 'Caminar'),
      exercise(30, 'Caminar'),
      exercise(30, 'Caminar'),
      exercise(20, 'Bici'),
      exercise(20, 'Bici'),
      exercise(45, 'Nadar'),
      exercise(60, 'Pesas'),
    ]
    expect(usualExercises(entries).map(x => x.label)).toEqual(['Caminar', 'Bici', 'Nadar'])
  })
})

describe('suggestMoment', () => {
  it('filters "today\'s meals" by the day of `now`, not by the real clock', () => {
    // the real clock runs on a different day than these fixtures: the breakfast
    // must still count as today's because it shares the day with `now`
    expect(suggestMoment([meal('07:30', 'Tostada')], at('08:00'))).toBe('después de desayunar')
  })

  it('suggests "antes de dormir" through the night, from 23h until 4:30', () => {
    expect(suggestMoment([], at('23:00'))).toBe('antes de dormir')
    expect(suggestMoment([], at('02:00'))).toBe('antes de dormir')
    expect(suggestMoment([], at('04:29'))).toBe('antes de dormir')
    expect(suggestMoment([], at('04:30'))).toBe('ayunas')
  })

  it('night wins even when dinner is already logged', () => {
    expect(suggestMoment([meal('21:30', 'Sopa')], at('23:05'))).toBe('antes de dormir')
  })

  it('morning is "ayunas" until a breakfast-slot meal is logged', () => {
    expect(suggestMoment([], at('08:00'))).toBe('ayunas')
    expect(suggestMoment([], at('10:59'))).toBe('ayunas')
    expect(suggestMoment([meal('07:30', 'Tostada')], at('08:00'))).toBe('después de desayunar')
  })

  it('between 11 and 13h suggests nothing unless breakfast was logged', () => {
    expect(suggestMoment([], at('12:00'))).toBe('')
    expect(suggestMoment([meal('09:00', 'Tostada')], at('12:00'))).toBe('después de desayunar')
  })

  it('a mid-morning snack does not count as breakfast', () => {
    expect(suggestMoment([meal('11:30', 'Fruta')], at('12:15'))).toBe('')
  })

  it('early afternoon is "antes de comer" until a lunch-slot meal is logged', () => {
    expect(suggestMoment([], at('14:00'))).toBe('antes de comer')
    expect(suggestMoment([meal('13:30', 'Lentejas')], at('14:30'))).toBe('después de comer')
  })

  it('meals outside the lunch slot never flip lunch to "después" (the reported bug)', () => {
    // breakfast and a noon snack logged, but no lunch: whoever measures before
    // meals must still get "antes de comer" pre-selected
    const entries = [meal('08:00', 'Tostada'), meal('12:30', 'Fruta')]
    expect(suggestMoment(entries, at('14:00'))).toBe('antes de comer')
  })

  it('from 15:30 to 19h assumes "después de comer" regardless of the diary', () => {
    expect(suggestMoment([], at('15:30'))).toBe('después de comer')
    expect(suggestMoment([], at('18:59'))).toBe('después de comer')
  })

  it('evening is "antes de cenar" until a dinner-slot meal is logged', () => {
    expect(suggestMoment([], at('19:00'))).toBe('antes de cenar')
    expect(suggestMoment([], at('21:29'))).toBe('antes de cenar')
    expect(suggestMoment([meal('20:15', 'Sopa')], at('21:00'))).toBe('después de cenar')
  })

  it('from 21:30 suggests "después de cenar" only if dinner was logged, else bedtime', () => {
    expect(suggestMoment([meal('20:30', 'Sopa')], at('22:00'))).toBe('después de cenar')
    expect(suggestMoment([], at('21:30'))).toBe('antes de dormir')
    expect(suggestMoment([], at('22:30'))).toBe('antes de dormir')
  })

  it("yesterday's dinner does not count as today's", () => {
    const yesterdayDinner: Entry = { ts: at('21:00', '2026-08-02'), kind: 'meal', label: 'Sopa' }
    expect(suggestMoment([yesterdayDinner], at('22:00'))).toBe('antes de dormir')
  })

  describe('default `now`', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-08-03T12:00:00'))
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it('defaults `now` to the current time', () => {
      // faked clock says 12:00 and no breakfast is logged
      expect(suggestMoment([])).toBe('')
    })
  })
})
