import { describe, expect, it } from 'vitest'
import type { Entry, Med } from './types'
import { dueWeeklyMeds, WEEKDAY_LABEL } from './medication'

// timestamps built from local-time ISO strings, so tests are TZ-independent
const at = (iso: string) => new Date(iso).getTime()

// 2026-08-04 is a Tuesday (getDay() === 2)
const TUESDAY_NOON = at('2026-08-04T12:00:00')

const ozempic: Med = { name: 'Ozempic', dose: '0,5 mg', kind: 'pill', weekday: 2 }
const trulicity: Med = { name: 'Trulicity', kind: 'pill', weekday: 5 }
const metformin: Med = { name: 'Metformina', dose: '850 mg', kind: 'pill' }
const basal: Med = { name: 'Lantus', dose: '22 U', kind: 'basal' }

const logged = (name: string, iso: string): Entry => ({ ts: at(iso), kind: 'med', label: name })

describe('dueWeeklyMeds', () => {
  it('returns the weekly meds whose day is today', () => {
    expect(dueWeeklyMeds([ozempic, trulicity, metformin, basal], [], TUESDAY_NOON)).toEqual([ozempic])
  })

  it('ignores daily meds entirely: only meds with a weekday can be due', () => {
    expect(dueWeeklyMeds([metformin, basal], [], TUESDAY_NOON)).toEqual([])
  })

  it('drops a med once it is logged today', () => {
    const entries = [logged('Ozempic', '2026-08-04T09:00:00')]
    expect(dueWeeklyMeds([ozempic], entries, TUESDAY_NOON)).toEqual([])
  })

  it("a log from last week's dose does not silence today's reminder", () => {
    const entries = [logged('Ozempic', '2026-07-28T09:00:00')]
    expect(dueWeeklyMeds([ozempic], entries, TUESDAY_NOON)).toEqual([ozempic])
  })

  it('matches the logged name ignoring case and surrounding spaces', () => {
    const entries = [logged(' ozempic ', '2026-08-04T09:00:00')]
    expect(dueWeeklyMeds([ozempic], entries, TUESDAY_NOON)).toEqual([])
  })

  it('only med-kind entries silence the reminder', () => {
    const entries: Entry[] = [{ ts: at('2026-08-04T09:00:00'), kind: 'tag', label: 'Ozempic' }]
    expect(dueWeeklyMeds([ozempic], entries, TUESDAY_NOON)).toEqual([ozempic])
  })

  it('several weekly meds can be due the same day', () => {
    const friday = at('2026-08-07T12:00:00')
    const both: Med[] = [{ ...ozempic, weekday: 5 }, trulicity]
    expect(dueWeeklyMeds(both, [], friday)).toEqual(both)
  })
})

describe('WEEKDAY_LABEL', () => {
  it('follows the JS getDay() convention: index 0 is Sunday', () => {
    expect(WEEKDAY_LABEL[0]).toBe('domingo')
    expect(WEEKDAY_LABEL[2]).toBe('martes')
    expect(WEEKDAY_LABEL[6]).toBe('sábado')
    expect(WEEKDAY_LABEL).toHaveLength(7)
  })
})
