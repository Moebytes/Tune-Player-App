import Capacitor

class AudioBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(BackgroundAudioPlugin())
    }
}