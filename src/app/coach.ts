import type { Entry, Profile } from '../domain/types'
import { computeStats } from '../domain/stats'
import { localReview } from '../domain/localReview'
import { resolveAiSource } from '../domain/aiKey'
import { ai, deviceAi } from './container'
import type { ChatMsg } from '../domain/chat'
import { buildContext, chatPrompt, reviewPrompt } from './prompts'

export type { ChatMsg } from '../domain/chat'

export interface Review {
  text: string
  /** who put it into words; the numbers and patterns are always ours */
  written: 'ai' | 'glyno'
  /** why the AI did not write it, when there was one and it failed */
  aiError?: string
}

/**
 * The review always happens. With an AI it writes better; without one — no key, no eligible
 * phone, no connection, quota spent — Glyno writes it herself from the same numbers. The
 * caller is told which, because passing off one for the other would be a lie.
 */
export async function generateReview(p: Profile, entries: Entry[], weights: Entry[] = []): Promise<Review> {
  const stats = computeStats(entries, p)
  const mine = (aiError?: string): Review => ({
    text: localReview(p.name, p, stats),
    written: 'glyno',
    ...(aiError ? { aiError } : {}),
  })

  if (resolveAiSource(p, deviceAi().text) === null) return mine()
  try {
    const ctx = buildContext(p, stats, entries, weights)
    return { text: await ai.complete(reviewPrompt(ctx, p.name)), written: 'ai' }
  } catch (e) {
    return mine(e instanceof Error ? e.message : String(e))
  }
}

export async function askCoach(
  p: Profile,
  entries: Entry[],
  history: ChatMsg[],
  weights: Entry[] = [],
): Promise<string> {
  const ctx = buildContext(p, computeStats(entries, p), entries, weights)
  const lines = history
    .slice(-7)
    .map(m => `${m.role === 'me' ? p.name : 'Glyno'}: ${m.text}`)
    .join('\n')
  return ai.complete(chatPrompt(ctx, lines, p.name))
}
