// Reading the JSON an AI sends back. A big model returns it clean; a small one — the kind
// that runs inside the phone — fences it in markdown, leaves a trailing comma or simply runs
// out of room mid-object. All of that is repairable, and repairing beats making the user
// ask again.

/** the answer was unreadable, as opposed to the network or the quota failing */
export class ReplyFormatError extends Error {
  constructor(message = 'No he podido leer la respuesta. Inténtalo otra vez.') {
    super(message)
    this.name = 'ReplyFormatError'
  }
}

interface Scan {
  text: string
  /** containers still open when the text ended: '{' and '[' in the order they opened */
  open: string[]
  inString: boolean
}

/** walks from the first `{`, respecting strings and escapes, so braces inside text do not cut it */
function scan(body: string, start: number): Scan {
  const open: string[] = []
  let inString = false
  let escaped = false
  for (let i = start; i < body.length; i++) {
    const c = body[i]
    if (inString) {
      if (escaped) escaped = false
      else if (c === '\\') escaped = true
      else if (c === '"') inString = false
      continue
    }
    if (c === '"') inString = true
    else if (c === '{' || c === '[') open.push(c)
    else if (c === '}' || c === ']') {
      open.pop()
      if (!open.length) return { text: body.slice(start, i + 1), open, inString: false }
    }
  }
  return { text: body.slice(start), open, inString }
}

function repair({ text, open, inString }: Scan): string {
  let out = inString ? `${text}"` : text
  // a cut can leave "advice": with nothing after it, or a comma hanging
  out = out.replace(/[\s,]+$/, '')
  out = out.replace(/,?\s*"[^"]*"\s*:\s*$/, '')
  out = out.replace(/[\s,]+$/, '')
  for (let i = open.length - 1; i >= 0; i--) out += open[i] === '{' ? '}' : ']'
  // trailing commas are invalid JSON and small models love them
  return out.replace(/,(\s*[}\]])/g, '$1')
}

/** the object inside whatever the model said, repaired if it came broken */
export function parseJsonReply<T>(raw: string): T {
  const body = raw.replace(/```[a-z]*/gi, '')
  const start = body.indexOf('{')
  if (start < 0) throw new ReplyFormatError()
  const found = scan(body, start)
  for (const attempt of [found.text, repair(found)]) {
    try {
      return JSON.parse(attempt) as T
    } catch {
      /* try the repaired one */
    }
  }
  throw new ReplyFormatError()
}
