import Foundation
import Capacitor
import StoreKit

// Bridges JS → SKStoreReviewController so the web layer can ask for an App
// Store rating at a positive moment (e.g. right after the user logs an aurora
// sighting). iOS itself decides whether the dialog actually appears (max 3×
// per year), so calling it is safe — frequency capping also happens in JS.
@objc(AppReviewPlugin)
public class AppReviewPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppReviewPlugin"
    public let jsName = "AppReview"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestReview", returnType: CAPPluginReturnPromise),
    ]

    @objc func requestReview(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            if let scene = UIApplication.shared.connectedScenes
                .first(where: { $0.activationState == .foregroundActive }) as? UIWindowScene {
                SKStoreReviewController.requestReview(in: scene)
            }
            call.resolve()
        }
    }
}
