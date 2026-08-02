export interface Week {
  from: number
  to: number
}

/** semana de lunes a domingo; offset 0 = la actual, -1 = la anterior */
export function weekRange(offset: number): Week {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const mondayFirst = (start.getDay() + 6) % 7
  start.setDate(start.getDate() - mondayFirst + offset * 7)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  return { from: start.getTime(), to: end.getTime() }
}
