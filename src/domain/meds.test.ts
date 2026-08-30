import { describe, expect, it } from 'vitest'
import type { Med } from './types'
import { mergeMeds, normalizeFoundMeds, sameMedName } from './meds'

const pill = (name: string, dose?: string, weekday?: number): Med => ({ name, dose, kind: 'pill', weekday })

describe('sameMedName', () => {
  it('ignores case, accents and spare spaces', () => {
    expect(sameMedName('Metformina', ' metformina ')).toBe(true)
    expect(sameMedName('Insulina Glargina', 'insulina  glargina')).toBe(true)
    expect(sameMedName('Ozempic®', 'ozempic')).toBe(true)
  })

  it('does not confuse two different drugs', () => {
    expect(sameMedName('Metformina', 'Metamizol')).toBe(false)
    expect(sameMedName('Lantus', '')).toBe(false)
  })
})

describe('normalizeFoundMeds', () => {
  const found = {
    meds: [
      { name: 'Metformina', dose: '850 mg', kind: 'pill', weekday: null },
      { name: 'Lantus', dose: '22 U', kind: 'basal', weekday: null },
      { name: 'Ozempic', dose: '0,5 mg', kind: 'pill', weekday: 2 },
    ],
  }

  it('reads a well formed answer', () => {
    expect(normalizeFoundMeds(found)).toEqual([
      { name: 'Metformina', dose: '850 mg', kind: 'pill' },
      { name: 'Lantus', dose: '22 U', kind: 'basal' },
      { name: 'Ozempic', dose: '0,5 mg', kind: 'pill', weekday: 2 },
    ])
  })

  it('accepts the Spanish words a model may answer with', () => {
    const out = normalizeFoundMeds({
      meds: [
        { name: 'Humalog', kind: 'insulina rápida' },
        { name: 'Toujeo', kind: 'Insulina Basal' },
        { name: 'Jardiance', kind: 'pastilla' },
      ],
    })
    expect(out.map(m => m.kind)).toEqual(['bolus', 'basal', 'pill'])
  })

  it('falls back to "otra medicación" when the type is unreadable: it is the harmless one', () => {
    expect(normalizeFoundMeds({ meds: [{ name: 'Algo', kind: 'ni idea' }] })[0].kind).toBe('pill')
  })

  it('drops what has no name: a dose with nothing to belong to is useless', () => {
    expect(normalizeFoundMeds({ meds: [{ dose: '850 mg' }, { name: '   ' }] })).toEqual([])
  })

  it('keeps the dose exactly as it was printed, without doing arithmetic on it', () => {
    const out = normalizeFoundMeds({ meds: [{ name: 'Metformina', dose: '  1000 mg / 12 h  ' }] })
    expect(out[0].dose).toBe('1000 mg / 12 h')
  })

  it('only accepts a weekday it can trust', () => {
    expect(normalizeFoundMeds({ meds: [{ name: 'A', weekday: 3 }] })[0].weekday).toBe(3)
    expect(normalizeFoundMeds({ meds: [{ name: 'A', weekday: 9 }] })[0].weekday).toBeUndefined()
    expect(normalizeFoundMeds({ meds: [{ name: 'A', weekday: 'martes' }] })[0].weekday).toBeUndefined()
  })

  it('survives an answer with no medication at all', () => {
    expect(normalizeFoundMeds({ meds: [] })).toEqual([])
    expect(normalizeFoundMeds({})).toEqual([])
    expect(normalizeFoundMeds('nada')).toEqual([])
  })
})

describe('mergeMeds', () => {
  it('marks as new what is not in the cabinet', () => {
    expect(mergeMeds([], [pill('Metformina', '850 mg')])).toEqual([
      { med: pill('Metformina', '850 mg'), status: 'new' },
    ])
  })

  it('marks as already there what matches, dose included', () => {
    const out = mergeMeds([pill('Metformina', '850 mg')], [pill('metformina', '850 mg')])
    expect(out[0].status).toBe('same')
    expect(out[0].at).toBe(0)
  })

  it('flags a different dose and hands over the one already saved, so the user decides', () => {
    const out = mergeMeds([pill('Metformina', '850 mg')], [pill('Metformina', '1000 mg')])
    expect(out[0].status).toBe('changed')
    expect(out[0].at).toBe(0)
    expect(out[0].mine?.dose).toBe('850 mg')
    expect(out[0].med.dose).toBe('1000 mg')
  })

  it('a photo that adds a dose where there was none is also a change', () => {
    const out = mergeMeds([pill('Metformina')], [pill('Metformina', '850 mg')])
    expect(out[0].status).toBe('changed')
  })

  it('never proposes removing what the photo did not see', () => {
    // one box photographed out of two: the other one must stay untouched
    const out = mergeMeds([pill('Metformina', '850 mg'), pill('Jardiance', '10 mg')], [pill('Metformina', '850 mg')])
    expect(out).toHaveLength(1)
    expect(out[0].med.name).toBe('Metformina')
  })

  it('does not pair the same saved med twice: two boxes of the same drug are one line', () => {
    const out = mergeMeds([pill('Metformina', '850 mg')], [pill('Metformina', '850 mg'), pill('Metformina', '1000 mg')])
    expect(out.map(m => m.status)).toEqual(['same', 'new'])
  })
})
