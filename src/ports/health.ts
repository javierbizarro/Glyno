/**
 * The device's own health store (Apple Salud, and one day Health Connect). Reading is all we
 * ever do: Glyno writes nothing back, and nothing read here leaves the phone.
 */

/**
 * One reading as the bridge hands it over. Point samples carry `ts` (local ISO, no zone) and
 * the source's own `id`; daily aggregates carry `date` (YYYY-MM-DD) and are keyed on the day.
 */
export interface HealthSample {
  kind?: string
  ts?: string
  date?: string
  value?: number
  minutes?: number
  label?: string
  km?: number
  sys?: number
  dia?: number
  /** the sample's own id in the source (HealthKit UUID): the dedupe key for point samples */
  id?: string
}

export interface HealthSource {
  /** whether this device has a health store at all */
  available(): Promise<boolean>
  /**
   * Asks the user for read access. iOS deliberately never reveals whether reading was
   * granted — a refusal is indistinguishable from having no data — so this resolves either
   * way and the answer is however many samples come back.
   */
  request(): Promise<void>
  /** everything in the window, in local time */
  read(fromMs: number, toMs: number): Promise<HealthSample[]>
}
