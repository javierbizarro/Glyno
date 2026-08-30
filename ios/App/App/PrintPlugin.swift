import Capacitor
import UIKit

/**
 Printing the medical report. `window.print()` exists in a browser but not in a WKWebView,
 where it fails silently — so the button went nowhere inside the app. This hands the rendered
 page to the system's print sheet, which is also where iOS offers "Guardar en Archivos" as PDF.
 */
@objc(PrintPlugin)
public class PrintPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PrintPlugin"
    public let jsName = "Printer"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "print", returnType: CAPPluginReturnPromise),
    ]

    @objc func print(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let webView = self.bridge?.webView else {
                call.reject("No hay nada que imprimir.")
                return
            }
            let info = UIPrintInfo(dictionary: nil)
            info.outputType = .general
            // the job name becomes the file name when the user saves it as a PDF
            info.jobName = call.getString("name") ?? "Glyno"

            let controller = UIPrintInteractionController.shared
            controller.printInfo = info
            // the web view's own formatter, so the report's @media print rules still apply
            controller.printFormatter = webView.viewPrintFormatter()
            controller.present(animated: true) { _, _, error in
                if let error { call.reject(error.localizedDescription) } else { call.resolve() }
            }
        }
    }
}
