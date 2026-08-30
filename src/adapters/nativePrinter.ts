import { registerPlugin } from '@capacitor/core'
import type { Printer } from '../ports/printer'

// iOS prints through UIPrintInteractionController, in the Swift plugin that lives in the
// iOS project. window.print() is not implemented in a WKWebView: it fails silently.

interface PrintBridge {
  print(options: { name: string }): Promise<void>
}

const bridge = registerPlugin<PrintBridge>('Printer')

export class NativePrinter implements Printer {
  async print(): Promise<void> {
    // the name becomes the PDF's filename in the system sheet
    await bridge.print({ name: document.title })
  }
}
