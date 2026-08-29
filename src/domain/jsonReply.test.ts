import { describe, expect, it } from 'vitest'
import { parseJsonReply, ReplyFormatError } from './jsonReply'

describe('parseJsonReply', () => {
  it('reads plain JSON', () => {
    expect(parseJsonReply('{"dish":"lentejas","carbs_g":45}')).toEqual({ dish: 'lentejas', carbs_g: 45 })
  })

  it('digs the object out of the prose around it', () => {
    expect(parseJsonReply('Aquí tienes: {"a":1} ¡espero que te sirva!')).toEqual({ a: 1 })
  })

  it('ignores markdown fences', () => {
    expect(parseJsonReply('```json\n{"a":1}\n```')).toEqual({ a: 1 })
  })

  it('is not fooled by braces inside strings', () => {
    expect(parseJsonReply('{"advice":"pon la llave } aquí","a":2}')).toEqual({
      advice: 'pon la llave } aquí',
      a: 2,
    })
  })

  it('keeps nested objects and arrays whole', () => {
    expect(parseJsonReply('{"a":{"b":[1,{"c":2}]}} y sobra texto')).toEqual({ a: { b: [1, { c: 2 }] } })
  })

  it('forgives the trailing comma that small models leave', () => {
    expect(parseJsonReply('{"a":1,}')).toEqual({ a: 1 })
    expect(parseJsonReply('{"a":[1,2,],}')).toEqual({ a: [1, 2] })
  })

  it('closes an answer cut off mid-object', () => {
    expect(parseJsonReply('{"dish":"lentejas","carbs_g":45')).toEqual({ dish: 'lentejas', carbs_g: 45 })
  })

  it('closes an answer cut off inside a string', () => {
    expect(parseJsonReply('{"dish":"lente')).toEqual({ dish: 'lente' })
  })

  it('drops a key left dangling by the cut', () => {
    expect(parseJsonReply('{"dish":"pollo","advice":')).toEqual({ dish: 'pollo' })
  })

  it('closes nested containers cut off deep', () => {
    expect(parseJsonReply('{"options":[{"dish":"tortilla","carbs_g":20},{"dish":"sopa"')).toEqual({
      options: [{ dish: 'tortilla', carbs_g: 20 }, { dish: 'sopa' }],
    })
  })

  it('complains, in Spanish, when there is nothing to read', () => {
    expect(() => parseJsonReply('no sé qué decirte')).toThrow(ReplyFormatError)
    expect(() => parseJsonReply('no sé qué decirte')).toThrow(/no he podido leer|inténtalo/i)
  })

  it('complains when what is there cannot be repaired', () => {
    expect(() => parseJsonReply('{"a": <<<¿¿??>>>}')).toThrow(ReplyFormatError)
  })
})
