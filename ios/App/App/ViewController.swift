import UIKit
import Capacitor

class ViewController: CAPBridgeViewController {

    // Required for storyboard instantiation — must forward to the designated initializer.
    required init?(coder aDecoder: NSCoder) {
        super.init(coder: aDecoder)
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        webView?.allowsBackForwardNavigationGestures = true
    }

    // Called by Capacitor after the bridge is fully set up, before JS loads.
    // This is the correct place to register app-local plugins.
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(StormLiveActivityPlugin())
    }
}
