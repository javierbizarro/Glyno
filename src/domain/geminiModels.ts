// Google's free tier counts requests per model, not per key: when one model runs out of
// daily quota (or is overloaded), another one may answer perfectly. This decides who to
// ask next, and in what order.

/** anything that cannot write us plain text, whatever its name says */
const NOT_TEXT = /image|audio|tts|live|embedding|vision/
const LITE = /lite/
const UNSTABLE = /preview|exp\b|experimental/

const version = (name: string): number => {
  const m = name.match(/\d+(?:\.\d+)?/)
  // an alias with no version ("gemini-flash-latest") tracks the newest one
  return m ? Number(m[0]) : Infinity
}

/**
 * The flash models worth trying, best first: the one we always start with, then the newest
 * stable ones, and only at the end the lite and preview variants — they answer, but they
 * write worse. Pro models are left out on purpose: their free allowance is tiny.
 */
export function orderModels(names: string[], primary: string): string[] {
  const seen = new Set<string>()
  const usable: string[] = []
  for (const raw of names) {
    const name = raw.replace(/^models\//, '')
    if (seen.has(name)) continue
    seen.add(name)
    if (!name.includes('flash') || NOT_TEXT.test(name)) continue
    usable.push(name)
  }
  const rank = (name: string): number[] => [
    name === primary ? 0 : 1,
    UNSTABLE.test(name) ? 1 : 0,
    LITE.test(name) ? 1 : 0,
    -version(name),
  ]
  return usable.sort((a, b) => {
    const [ra, rb] = [rank(a), rank(b)]
    for (let i = 0; i < ra.length; i++) if (ra[i] !== rb[i]) return ra[i] - rb[i]
    return a.localeCompare(b)
  })
}
