import Capacitor

/**
 The app's WebView host. It exists only to hand Capacitor the plugins that live in this
 project: plugins shipped as packages are discovered on their own, but a local one has to
 be registered here or the JavaScript side gets "not implemented on ios".
 */
class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(HealthPlugin())
        bridge?.registerPluginInstance(PrintPlugin())
        bridge?.registerPluginInstance(DeviceAiPlugin())
    }
}
