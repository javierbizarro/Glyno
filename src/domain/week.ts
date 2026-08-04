export interface Week {
  from: number
  to: number
}

/** Monday-to-Sunday week; offset 0 = current week, -1 = previous */
export function weekRange(offset: number, from = Date.now()): Week {
  const start = new Date(from)
  start.setHours(0, 0, 0, 0)
  const mondayFirst = (start.getDay() + 6) % 7
  start.setDate(start.getDate() - mondayFirst + offset * 7)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  return { from: start.getTime(), to: end.getTime() }
}
