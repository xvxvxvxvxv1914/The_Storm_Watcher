import UIKit
import Capacitor

class ViewController: CAPBridgeViewController {

    // Kept deliberately: this VC is instantiated from Main.storyboard, and an
    // earlier attempt to drive it without an explicit coder init crashed on
    // launch. Don't remove without a device test.
    required init?(coder aDecoder: NSCoder) {
        super.init(coder: aDecoder)
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        // Enable iOS native swipe-back gesture — WKWebView disables it by default.
        // React Router handles the resulting popstate event correctly.
        webView?.allowsBackForwardNavigationGestures = true
        // Disable rubber-band overscroll: position:fixed elements (bottom tab
        // bar) drag along with the bounce and slide off-screen while pulling.
        // The app ships its own touch-based pull-to-refresh, so the native
        // bounce is unused.
        webView?.scrollView.bounces = false
    }

    // Called by Capacitor after the bridge is fully set up, before JS loads.
    // This is the correct place to register app-local plugins.
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(StormLiveActivityPlugin())
        bridge?.registerPluginInstance(AppReviewPlugin())
    }
}
