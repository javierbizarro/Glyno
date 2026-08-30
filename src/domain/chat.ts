// Talking to Glyno is not one endless thread: conversations break by themselves when the day
// changes, and can be broken on purpose when the subject does. Nothing to name, nothing to
// manage — the list is just "hoy" and the days before.

export interface ChatMsg {
  role: 'me' | 'glyno'
  text: string
}

export interface Chat {
  startedAt: number
  msgs: ChatMsg[]
}

/** conversations older than this are forgotten, and never more than MAX_CHATS are kept */
const KEEP_DAYS = 30
const MAX_CHATS = 30

const sameDay = (a: number, b: number) => new Date(a).toDateString() === new Date(b).toDateString()

/** the one being written in: always the last */
export const currentOf = (chats: Chat[]): Chat | undefined => chats[chats.length - 1]

export function addMessage(chats: Chat[], msg: ChatMsg, now: number): Chat[] {
  const current = currentOf(chats)
  if (!current || (current.msgs.length > 0 && !sameDay(current.startedAt, now)))
    return [...chats, { startedAt: now, msgs: [msg] }]
  // an empty conversation takes the hour of its first message, whenever it was opened
  const startedAt = current.msgs.length ? current.startedAt : now
  return [...chats.slice(0, -1), { startedAt, msgs: [...current.msgs, msg] }]
}

/** "empezar de nuevo": changing subject without dragging the previous questions along */
export function startNewChat(chats: Chat[], now: number): Chat[] {
  const current = currentOf(chats)
  if (!current || !current.msgs.length) return chats
  return [...chats, { startedAt: now, msgs: [] }]
}

export function pruneChats(chats: Chat[], now: number): Chat[] {
  const cutoff = now - KEEP_DAYS * 864e5
  const kept = chats.filter(
    (c, i) => i === chats.length - 1 || (c.msgs.length > 0 && c.startedAt >= cutoff),
  )
  return kept.slice(-MAX_CHATS)
}

const isMsg = (x: unknown): x is ChatMsg =>
  !!x &&
  typeof x === 'object' &&
  typeof (x as ChatMsg).text === 'string' &&
  ((x as ChatMsg).role === 'me' || (x as ChatMsg).role === 'glyno')

const parse = (raw: string | null): unknown => {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/**
 * Reads what is stored, and rescues the single thread of earlier versions into today's
 * conversation: losing someone's chat on an update would be unforgivable for a diary app.
 */
export function loadChats(stored: string | null, legacy: string | null, now: number): Chat[] {
  const fresh = parse(stored)
  if (Array.isArray(fresh))
    return fresh
      .filter((c): c is Chat => !!c && typeof c === 'object' && typeof (c as Chat).startedAt === 'number')
      .map(c => ({ startedAt: c.startedAt, msgs: (Array.isArray(c.msgs) ? c.msgs : []).filter(isMsg) }))

  const old = parse(legacy)
  if (Array.isArray(old)) {
    const msgs = old.filter(isMsg)
    if (msgs.length) return [{ startedAt: now, msgs }]
  }
  return []
}
