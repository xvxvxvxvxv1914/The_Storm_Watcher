import Foundation
import Capacitor
import ActivityKit
import OSLog

private let logger = Logger(subsystem: "com.stormwatcher.app", category: "LiveActivity")

// Bridges JS → ActivityKit so the web layer can drive the storm Live Activity.
// Phase A: app-driven (starts/updates while the app runs).
// Phase B: each activity is requested with an APNs push token, emitted to JS as
// the `liveActivityPushToken` event so the backend can keep the banner fresh
// after the app is closed. `liveActivityEnded` fires so JS can drop the token.
@objc(StormLiveActivityPlugin)
public class StormLiveActivityPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "StormLiveActivityPlugin"
    public let jsName = "StormLiveActivity"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "end", returnType: CAPPluginReturnPromise),
    ]

    // Phase A only updates while the app runs, so data can't refresh in the
    // background. Mark it stale after this long and iOS dims the banner instead
    // of showing hours-old Kp as if it were current.
    private static let staleAfter: TimeInterval = 45 * 60

    // Re-attach token/lifecycle observers to any activity carried over from a
    // previous launch, so its (possibly rotated) push token still reaches JS.
    override public func load() {
        guard #available(iOS 16.2, *) else { return }
        for activity in Activity<StormActivityAttributes>.activities {
            observePushToken(activity)
            observeLifecycle(activity)
        }
    }

    @objc func start(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else { call.resolve(["started": false, "reason": "unsupported"]); return }
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            call.resolve(["started": false, "reason": "disabled"]); return
        }
        let state = makeState(call)

        // If one is already live, just update it (avoids duplicate activities).
        if let existing = Activity<StormActivityAttributes>.activities.first {
            Task {
                await existing.update(ActivityContent(state: state, staleDate: Date().addingTimeInterval(Self.staleAfter)))
                call.resolve(["started": true])
            }
            return
        }

        let attributes = StormActivityAttributes(title: "Geomagnetic storm")
        let content = ActivityContent(state: state, staleDate: Date().addingTimeInterval(Self.staleAfter))

        do {
            let activity = try Activity.request(attributes: attributes, content: content, pushType: .token)
            observePushToken(activity)
            observeLifecycle(activity)
            call.resolve(["started": true, "push": true])
        } catch {
            // Fall back to a local (non-push) activity so Phase A still works even
            // if a push token can't be obtained (e.g. push provisioning issue).
            logger.error("Activity.request(pushType:) failed: \(error.localizedDescription)")
            do {
                let activity = try Activity.request(attributes: attributes, content: content)
                observeLifecycle(activity)
                call.resolve(["started": true, "push": false, "pushError": error.localizedDescription])
            } catch {
                logger.error("Activity.request fallback failed: \(error.localizedDescription)")
                call.reject("Failed to start activity: \(error.localizedDescription)")
            }
        }
    }

    // Stream the per-activity APNs push token to JS. The token can change over the
    // activity's life, so we forward every value the system gives us.
    @available(iOS 16.2, *)
    private func observePushToken(_ activity: Activity<StormActivityAttributes>) {
        Task {
            for await tokenData in activity.pushTokenUpdates {
                let token = tokenData.map { String(format: "%02x", $0) }.joined()
                logger.info("Live Activity push token: \(token, privacy: .private)")
                self.notifyListeners("liveActivityPushToken", data: ["token": token, "activityId": activity.id])
            }
        }
    }

    // Tell JS when an activity ends (user dismissed / system ended) so it can
    // delete the now-dead push token from the backend.
    @available(iOS 16.2, *)
    private func observeLifecycle(_ activity: Activity<StormActivityAttributes>) {
        Task {
            for await state in activity.activityStateUpdates {
                if state == .ended || state == .dismissed {
                    self.notifyListeners("liveActivityEnded", data: ["activityId": activity.id])
                    break
                }
            }
        }
    }

    @objc func update(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else { call.resolve(["updated": false]); return }
        let state = makeState(call)
        Task {
            let activities = Activity<StormActivityAttributes>.activities
            for activity in activities {
                await activity.update(ActivityContent(state: state, staleDate: Date().addingTimeInterval(Self.staleAfter)))
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
            updatedAt: Date().timeIntervalSince1970
        )
    }
}
