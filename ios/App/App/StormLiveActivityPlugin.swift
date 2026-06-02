import Foundation
import Capacitor
import ActivityKit
import OSLog

private let logger = Logger(subsystem: "com.stormwatcher.app", category: "LiveActivity")

// Bridges JS → ActivityKit so the web layer can drive the storm Live Activity.
// Phase A: app-driven (starts/updates while the app runs). Phase B would add
// APNs push tokens for background updates.
@objc(StormLiveActivityPlugin)
public class StormLiveActivityPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "StormLiveActivityPlugin"
    public let jsName = "StormLiveActivity"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "end", returnType: CAPPluginReturnPromise),
    ]

    @objc func start(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else { call.resolve(["started": false, "reason": "unsupported"]); return }
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            call.resolve(["started": false, "reason": "disabled"]); return
        }
        let state = makeState(call)

        // If one is already live, just update it (avoids duplicate activities).
        if let existing = Activity<StormActivityAttributes>.activities.first {
            Task {
                await existing.update(ActivityContent(state: state, staleDate: nil))
                call.resolve(["started": true])
            }
            return
        }

        do {
            _ = try Activity.request(
                attributes: StormActivityAttributes(title: "Geomagnetic storm"),
                content: ActivityContent(state: state, staleDate: nil)
            )
            call.resolve(["started": true])
        } catch {
            logger.error("Activity.request failed: \(error.localizedDescription)")
            call.reject("Failed to start activity: \(error.localizedDescription)")
        }
    }

    @objc func update(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else { call.resolve(["updated": false]); return }
        let state = makeState(call)
        Task {
            let activities = Activity<StormActivityAttributes>.activities
            for activity in activities {
                await activity.update(ActivityContent(state: state, staleDate: nil))
            }
            // Report whether anything was actually live so JS can restart if the
            // user dismissed it — otherwise the storm banner never comes back.
            call.resolve(["updated": !activities.isEmpty])
        }
    }

    @objc func end(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else { call.resolve(); return }
        Task {
            for activity in Activity<StormActivityAttributes>.activities {
                await activity.end(nil, dismissalPolicy: .immediate)
            }
            call.resolve()
        }
    }

    @available(iOS 16.2, *)
    private func makeState(_ call: CAPPluginCall) -> StormActivityAttributes.ContentState {
        StormActivityAttributes.ContentState(
            kp: call.getDouble("kp") ?? 0,
            gLevel: call.getInt("gLevel") ?? 0,
            auroraPct: call.getInt("auroraPct"),
            updatedAt: Date()
        )
    }
}
