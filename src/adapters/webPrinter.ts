import type { Printer } from '../ports/printer'

/** the browser's own print dialog, which is also how a PDF is saved from the web */
export class WebPrinter implements Printer {
  async print(): Promise<void> {
    window.print()
  }
}
