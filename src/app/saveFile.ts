// Handing a file to the user. On the web the browser downloads it; inside the app there is no
// downloads folder and WKWebView ignores `<a download>` and blob: URLs — the button did nothing —
// so the file is written to the app's cache and offered through the system share sheet
// ("Guardar en Archivos", Mail, AirDrop…).
import { platform, type Platform } from './platform'

export interface OutgoingFile {
  name: string
  text: string
  mime: string
}

export type SaveOutcome = 'downloaded' | 'shared' | 'failed'

export interface FileSinks {
  /** the app: writes the file and hands it to the system sheet */
  toShareSheet: (f: OutgoingFile) => Promise<void>
  /** the web: whatever the browser does with a download */
  toDownloads: (f: OutgoingFile) => void
}

/** pure choice of route, so the caller knows what to tell the user */
export async function saveThrough(where: Platform, f: OutgoingFile, sinks: FileSinks): Promise<SaveOutcome> {
  if (where === 'web') {
    try {
      sinks.toDownloads(f)
      return 'downloaded'
    } catch {
      return 'failed'
    }
  }
  try {
    await sinks.toShareSheet(f)
  } catch {
    // the file was written; a sheet that throws is almost always the user dismissing it
    return 'shared'
  }
  return 'shared'
}

function toDownloads(f: OutgoingFile): void {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([f.text], { type: f.mime }))
  a.download = f.name
  a.click()
  URL.revokeObjectURL(a.href)
}

// loaded on demand so the web bundle never carries the native plugins
async function toShareSheet(f: OutgoingFile): Promise<void> {
  const [{ Filesystem, Directory, Encoding }, { Share }] = await Promise.all([
    import('@capacitor/filesystem'),
    import('@capacitor/share'),
  ])
  const { uri } = await Filesystem.writeFile({
    path: f.name,
    data: f.text,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
  })
  await Share.share({ title: f.name, files: [uri] })
}

export const saveFile = (f: OutgoingFile): Promise<SaveOutcome> =>
  saveThrough(platform(), f, { toShareSheet, toDownloads })
