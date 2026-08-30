import type { Med } from '../domain/types'
import { normalizeFoundMeds } from '../domain/meds'
import type { AiImage } from '../ports/ai'
import { ai } from './container'
import { askJson } from './askJson'
import { medsPhotoPrompt } from './prompts'

/**
 * Reads the medication off a photo of the boxes or the prescription. It only returns what it
 * read: nothing is saved here, because a photo never gets to write in the med cabinet without
 * the user confirming it first.
 */
export async function readMedsPhoto(image: AiImage): Promise<Med[]> {
  return askJson(() => ai.completeWithImage(medsPhotoPrompt(), image), normalizeFoundMeds)
}
