import type { Profile } from './types'

export type Range = 'low' | 'in' | 'high'

export const rangeOf = (v: number, p: Profile): Range =>
  v < p.low ? 'low' : v > p.high ? 'high' : 'in'
