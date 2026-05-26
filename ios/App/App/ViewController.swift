import UIKit
import Capacitor

class ViewController: CAPBridgeViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        // Enable iOS native swipe-back gesture — WKWebView disables it by default.
        // React Router handles the resulting popstate event correctly.
        webView?.allowsBackForwardNavigationGestures = true
    }
}
