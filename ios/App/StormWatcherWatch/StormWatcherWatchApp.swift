import SwiftUI
import WatchKit

/// ~15 min is what the plan asked for and roughly what watchOS will honour for
/// a foreground-launched app; the system throttles it further on its own terms,
/// which is exactly why the complication also fetches when it must.
func scheduleWatchRefresh() {
    WKApplication.shared().scheduleBackgroundRefresh(
        withPreferredDate: Date(timeIntervalSinceNow: 15 * 60),
        userInfo: nil,
        scheduledCompletion: { _ in }
    )
}

/// Background refresh goes through the delegate rather than SwiftUI's
/// `.backgroundTask(.appRefresh)`: that modifier makes the Swift 5.10 compiler
/// in Xcode 26 fail with "failed to produce diagnostic for expression" on the
/// whole `body` — a compiler bug, not a usage error, and one that gives no
/// indication of where it is. The delegate path is the older, boring one and it
/// compiles.
final class WatchAppDelegate: NSObject, WKApplicationDelegate {
    func applicationDidFinishLaunching() {
        scheduleWatchRefresh()
    }

    func handle(_ backgroundTasks: Set<WKRefreshBackgroundTask>) {
        for task in backgroundTasks {
            guard let refresh = task as? WKApplicationRefreshBackgroundTask else {
                task.setTaskCompletedWithSnapshot(false)
                continue
            }
            // Refresh once, queue the next slot, hand the task back. watchOS
            // drops apps that linger here, so there is no retry loop.
            Task {
                await WatchFetch.refreshInBackground()
                scheduleWatchRefresh()
                refresh.setTaskCompletedWithSnapshot(false)
            }
        }
    }
}

@main
struct StormWatcherWatchApp: App {
    @WKApplicationDelegateAdaptor(WatchAppDelegate.self) private var delegate
    @State private var store = WatchStore()

    var body: some Scene {
        WindowGroup {
            NavigationStack {
                WatchMainView()
            }
            .environment(store)
        }
    }
}
