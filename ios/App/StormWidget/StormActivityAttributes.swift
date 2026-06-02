import Foundation
import ActivityKit

// Shared between the app target (starts/updates the activity) and the widget
// extension (renders it). In Xcode, add this file to BOTH targets' membership.
@available(iOS 16.2, *)
struct StormActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var kp: Double
        var gLevel: Int      // 0 = active/unsettled, 1–5 = G1–G5
        var auroraPct: Int?  // visibility at the user's saved location, if any
        var updatedAt: Double // Unix epoch seconds — a plain number so the APNs
                              // push content-state decodes without Date-strategy
                              // ambiguity (the UI doesn't render it).
    }

    var title: String
}
