/**
 * Putting the medical report on paper (or in a PDF). The browser does it with window.print();
 * a WebView does not implement it at all — the button would simply do nothing — so inside the
 * app it takes the system's own print sheet, from which iOS also offers "save as PDF".
 */
export interface Printer {
  print(): Promise<void>
}
