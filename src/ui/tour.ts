import type { Profile } from '../domain/types'

// localStorage key precedent: same pattern as glyno.chat / glyno.review in Coach
const KEY = 'glyno.tourSeen'

/** the tour auto-starts exactly once, right after onboarding; replay is manual from Settings */
export function shouldAutoStartTour(p: Profile | null): boolean {
  return !!p?.onboarded && localStorage.getItem(KEY) == null
}

export function markTourSeen(): void {
  localStorage.setItem(KEY, '1')
}
