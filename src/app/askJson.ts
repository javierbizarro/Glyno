import { parseJsonReply, ReplyFormatError } from '../domain/jsonReply'

/**
 * Asks and reads the answer. A garbled answer earns one second attempt — small models fail at
 * the format, not at the task — but a network or quota error does not: it would only burn
 * another call and make the user wait twice.
 */
export async function askJson<T>(ask: () => Promise<string>, shape: (raw: unknown) => T): Promise<T> {
  try {
    return shape(parseJsonReply(await ask()))
  } catch (e) {
    if (!(e instanceof ReplyFormatError)) throw e
    return shape(parseJsonReply(await ask()))
  }
}
