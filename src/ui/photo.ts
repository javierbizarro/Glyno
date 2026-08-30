import type { AiImage } from '../ports/ai'

export type Photo = AiImage & { preview: string }

/** shrink the photo to ≤1024px: less quota spent, faster upload */
export async function shrink(file: File): Promise<Photo> {
  const url = URL.createObjectURL(file)
  const img = await new Promise<HTMLImageElement>((ok, ko) => {
    const i = new Image()
    i.onload = () => ok(i)
    i.onerror = ko
    i.src = url
  })
  const scale = Math.min(1, 1024 / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
  URL.revokeObjectURL(url)
  const dataUrl = canvas.toDataURL('image/jpeg', 0.82)
  return { mimeType: 'image/jpeg', base64: dataUrl.split(',')[1], preview: dataUrl }
}
