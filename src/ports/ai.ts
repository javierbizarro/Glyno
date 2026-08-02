export interface AiImage {
  mimeType: string
  base64: string
}

export interface AiAssistant {
  complete(prompt: string): Promise<string>
  completeWithImage(prompt: string, image: AiImage): Promise<string>
}
