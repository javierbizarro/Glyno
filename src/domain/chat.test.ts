import { describe, expect, it } from 'vitest'
import { addMessage, currentOf, loadChats, pruneChats, startNewChat, type Chat } from './chat'

const at = (iso: string) => new Date(iso).getTime()
const MON = at('2026-08-24T10:00:00')
const TUE = at('2026-08-25T09:00:00')

const me = (text: string) => ({ role: 'me' as const, text })
const glyno = (text: string) => ({ role: 'glyno' as const, text })
const chat = (startedAt: number, ...msgs: { role: 'me' | 'glyno'; text: string }[]): Chat => ({
  startedAt,
  msgs,
})

describe('addMessage', () => {
  it('starts the first conversation', () => {
    const out = addMessage([], me('hola'), MON)
    expect(out).toEqual([{ startedAt: MON, msgs: [me('hola')] }])
  })

  it('keeps writing in the conversation of the day', () => {
    const out = addMessage([chat(MON, me('hola'))], glyno('¿qué tal?'), MON + 3600e3)
    expect(out).toHaveLength(1)
    expect(out[0].msgs).toEqual([me('hola'), glyno('¿qué tal?')])
  })

  it('opens a new one when the day changes: nobody wants an endless thread', () => {
    const out = addMessage([chat(MON, me('hola'))], me('buenos días'), TUE)
    expect(out).toHaveLength(2)
    expect(out[1]).toEqual({ startedAt: TUE, msgs: [me('buenos días')] })
    expect(out[0].msgs).toEqual([me('hola')])
  })

  it('writes into an empty conversation that was opened on purpose', () => {
    const out = addMessage([chat(MON, me('hola')), chat(MON + 60e3)], me('otra cosa'), MON + 120e3)
    expect(out).toHaveLength(2)
    expect(out[1].msgs).toEqual([me('otra cosa')])
  })
})

describe('startNewChat', () => {
  it('opens an empty conversation to change the subject', () => {
    const out = startNewChat([chat(MON, me('hola'))], MON + 60e3)
    expect(out).toHaveLength(2)
    expect(out[1].msgs).toEqual([])
  })

  it('does nothing when the current one is still empty', () => {
    const chats = [chat(MON, me('hola')), chat(MON + 60e3)]
    expect(startNewChat(chats, MON + 120e3)).toEqual(chats)
  })

  it('does nothing when there is nothing yet', () => {
    expect(startNewChat([], MON)).toEqual([])
  })
})

describe('currentOf', () => {
  it('is the last conversation', () => {
    expect(currentOf([chat(MON, me('a')), chat(TUE, me('b'))])?.msgs).toEqual([me('b')])
  })

  it('is undefined with no conversations', () => {
    expect(currentOf([])).toBeUndefined()
  })
})

describe('pruneChats', () => {
  const old = at('2026-06-01T10:00:00')

  it('forgets conversations older than the window', () => {
    const out = pruneChats([chat(old, me('vieja')), chat(TUE, me('nueva'))], TUE)
    expect(out).toEqual([chat(TUE, me('nueva'))])
  })

  it('keeps the one in progress even if the clock says otherwise', () => {
    const out = pruneChats([chat(old, me('vieja'))], TUE)
    expect(out).toEqual([chat(old, me('vieja'))])
  })

  it('drops empty conversations except the current one', () => {
    const out = pruneChats([chat(MON), chat(MON, me('hola')), chat(TUE)], TUE)
    expect(out).toEqual([chat(MON, me('hola')), chat(TUE)])
  })

  it('caps how many are kept, forgetting the oldest', () => {
    // stored oldest first, the one in progress last
    const many = Array.from({ length: 40 }, (_, i) => chat(TUE - (39 - i) * 60e3, me(`n${i}`)))
    const out = pruneChats(many, TUE)
    expect(out).toHaveLength(30)
    expect(out[0]).toEqual(many[10])
    expect(out[29]).toEqual(many[39])
  })
})

describe('loadChats', () => {
  it('reads the new shape', () => {
    const stored = JSON.stringify([chat(MON, me('hola'))])
    expect(loadChats(stored, null, TUE)).toEqual([chat(MON, me('hola'))])
  })

  it('rescues the single thread of older versions instead of throwing it away', () => {
    const legacy = JSON.stringify([me('hola'), glyno('¿qué tal?')])
    const out = loadChats(null, legacy, TUE)
    expect(out).toHaveLength(1)
    expect(out[0].msgs).toEqual([me('hola'), glyno('¿qué tal?')])
    expect(out[0].startedAt).toBe(TUE)
  })

  it('ignores the old thread once the new one exists', () => {
    const stored = JSON.stringify([chat(TUE, me('nueva'))])
    const legacy = JSON.stringify([me('vieja')])
    expect(loadChats(stored, legacy, TUE)).toEqual([chat(TUE, me('nueva'))])
  })

  it('survives anything unreadable', () => {
    expect(loadChats('{roto', null, TUE)).toEqual([])
    expect(loadChats(null, 'tampoco', TUE)).toEqual([])
    expect(loadChats(null, null, TUE)).toEqual([])
    expect(loadChats(JSON.stringify({ no: 'es una lista' }), null, TUE)).toEqual([])
  })

  it('drops messages that are not messages', () => {
    const stored = JSON.stringify([{ startedAt: MON, msgs: [me('hola'), { role: 'otro' }, 'suelto'] }])
    expect(loadChats(stored, null, TUE)).toEqual([chat(MON, me('hola'))])
  })
})
