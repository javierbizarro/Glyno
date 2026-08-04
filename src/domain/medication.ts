import type { Entry, Med } from './types'
import { daysAgo } from './time'

// UI/prompt copy for Med.weekday; index follows the JS getDay() convention
export const WEEKDAY_LABEL = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

/**
 * Weekly meds due today and not yet logged. Forgetting the weekly GLP-1 shot is a
 * real pain point; this only reminds and records — never advises on missed doses.
 */
export function dueWeeklyMeds(meds: Med[], entries: Entry[], now = Date.now()): Med[] {
  const weekday = new Date(now).getDay()
  const todayLogs = new Set(
    entries
      .filter(e => e.kind === 'med' && e.ts >= daysAgo(0, now) && e.label)
      .map(e => e.label!.trim().toLowerCase()),
  )
  return meds.filter(m => m.weekday === weekday && !todayLogs.has(m.name.trim().toLowerCase()))
}
