import type { Entry, Profile } from '../domain/types'
import { computeStats } from '../domain/stats'
import { ai } from './container'
import type { ChatMsg } from '../domain/chat'
import { buildContext, chatPrompt, reviewPrompt } from './prompts'

export type { ChatMsg } from '../domain/chat'

export async function generateReview(p: Profile, entries: Entry[], weights: Entry[] = []): Promise<string> {
  const ctx = buildContext(p, computeStats(entries, p), entries, weights)
  return ai.complete(reviewPrompt(ctx, p.name))
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
