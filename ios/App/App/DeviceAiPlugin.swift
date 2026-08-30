import Capacitor
import Foundation
#if canImport(FoundationModels)
    import FoundationModels
#endif

/**
 Apple's on-device model: no key, no account, no connection, and the prompt never leaves the
 phone. It is the reason the native app exists — but it only runs where Apple Intelligence
 does (iPhone 15 Pro and later), so "unsupported" is a perfectly normal answer here and the
 Gemini key stays the way in for everyone else.

 Text only: this model does not look at photos, so reading a plate still needs the key.
 */
@objc(DeviceAiPlugin)
public class DeviceAiPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "DeviceAiPlugin"
    public let jsName = "DeviceAi"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "state", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "complete", returnType: CAPPluginReturnPromise),
    ]

    /// the states `ports/deviceAi.ts` already speaks, so the web contract needs no change
    private func availability() -> String {
        #if canImport(FoundationModels)
            guard #available(iOS 26.0, *) else { return "unsupported" }
            switch SystemLanguageModel.default.availability {
            case .available:
                return "available"
            case let .unavailable(reason):
                switch reason {
                // the model is still being fetched by the system; asking again later works
                case .modelNotReady: return "downloading"
                // the phone could, but the user has not turned Apple Intelligence on
                case .appleIntelligenceNotEnabled: return "unavailable"
                default: return "unsupported"
                }
            @unknown default:
                return "unsupported"
            }
        #else
            return "unsupported"
        #endif
    }

    @objc func state(_ call: CAPPluginCall) {
        call.resolve(["state": availability()])
    }

    @objc func complete(_ call: CAPPluginCall) {
        guard let prompt = call.getString("prompt"), !prompt.isEmpty else {
            call.reject("No hay nada que preguntar.")
            return
        }
        #if canImport(FoundationModels)
            guard #available(iOS 26.0, *), case .available = SystemLanguageModel.default.availability else {
                call.reject("Este iPhone no trae IA propia.")
                return
            }
            Task {
                do {
                    let session = LanguageModelSession()
                    let answer = try await session.respond(to: prompt)
                    let text = answer.content.trimmingCharacters(in: .whitespacesAndNewlines)
                    if text.isEmpty {
                        call.reject("La IA de tu iPhone se ha quedado en blanco. Inténtalo otra vez.")
                    } else {
                        call.resolve(["text": text])
                    }
                } catch {
                    call.reject(error.localizedDescription)
                }
            }
        #else
            call.reject("Este iPhone no trae IA propia.")
        #endif
    }
}
