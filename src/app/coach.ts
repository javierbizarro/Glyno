import type { Entry, Profile } from '../domain/types'
import { computeStats } from '../domain/stats'
import { ai } from './container'
import { buildContext, chatPrompt, reviewPrompt } from './prompts'

export interface ChatMsg {
  role: 'me' | 'glyno'
  text: string
}

export async function generateReview(p: Profile, entries: Entry[], lastWeight?: Entry): Promise<string> {
  const ctx = buildContext(p, computeStats(entries, p), entries, lastWeight)
  return ai.complete(reviewPrompt(ctx, p.name))
}

export async function askCoach(
  p: Profile,
  entries: Entry[],
  history: ChatMsg[],
  lastWeight?: Entry,
): Promise<string> {
  const ctx = buildContext(p, computeStats(entries, p), entries, lastWeight)
  const lines = history
    .slice(-7)
    .map(m => `${m.role === 'me' ? p.name : 'Glyno'}: ${m.text}`)
    .join('\n')
  return ai.complete(chatPrompt(ctx, lines, p.name))
}
