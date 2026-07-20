import UIKit
import Capacitor
import WidgetKit
import BackgroundTasks
import UserNotifications
import ActivityKit
import Sentry

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate {

    var window: UIWindow?
    private let appGroupID = "group.com.stormwatcher.app"
    private let bgTaskID = "com.stormwatcher.widget-refresh"
    private var widgetRefreshTimer: Timer?
    private let launchDate = Date()

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        if let dsn = Bundle.main.infoDictionary?["SENTRY_DSN"] as? String, !dsn.isEmpty {
            SentrySDK.start { options in
                options.dsn = dsn
                options.tracesSampleRate = 0.1
                options.enableCrashHandler = true
                options.attachViewHierarchy = false
            }
        }
        BGTaskScheduler.shared.register(forTaskWithIdentifier: bgTaskID, using: nil) { [weak self] task in
            self?.handleWidgetRefresh(task as! BGAppRefreshTask)
        }
        // Notification permission is requested in context by the JS layer
        // (usePushNotifications, Pro users) — never unprompted at first launch.
        UNUserNotificationCenter.current().delegate = self
        // Establish the APNs connection at launch. This does NOT require
        // notification permission, but it IS required for Live Activity push
        // tokens (Activity.request(pushType: .token)) — without it ActivityKit
        // throws ActivityInput error 0. Safe to call alongside the Capacitor
        // push plugin (idempotent).
        application.registerForRemoteNotifications()
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        widgetRefreshTimer?.invalidate()
        widgetRefreshTimer = nil
        scheduleWidgetRefresh()
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        refreshWidgetData(completion: nil)
        widgetRefreshTimer?.invalidate()
        widgetRefreshTimer = Timer.scheduledTimer(withTimeInterval: 60, repeats: true) { [weak self] _ in
            self?.refreshWidgetData(completion: nil)
        }
        // (Swipe-back gesture is enabled once in ViewController.viewDidLoad.)
    }

    func applicationWillTerminate(_ application: UIApplication) {
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    // Home-screen quick action (long-press app icon) → reuse the existing
    // stormwatcher:// deep-link path. On a cold launch the JS bridge isn't
    // listening yet, so hold the dispatch until React has had time to boot.
    func application(_ application: UIApplication,
                     performActionFor shortcutItem: UIApplicationShortcutItem,
                     completionHandler: @escaping (Bool) -> Void) {
        let route = shortcutItem.type.components(separatedBy: ".").last ?? ""
        guard let url = URL(string: "stormwatcher://\(route)") else {
            completionHandler(false)
            return
        }
        let elapsed = Date().timeIntervalSince(launchDate)
        let delay = max(0, 3.0 - elapsed)
        DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
            _ = ApplicationDelegateProxy.shared.application(application, open: url, options: [:])
        }
        completionHandler(true)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

    // MARK: - Background refresh

    private func scheduleWidgetRefresh() {
        let request = BGAppRefreshTaskRequest(identifier: bgTaskID)
        // Ask iOS to run again in ~15 min; actual timing is up to the system
        request.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60)
        try? BGTaskScheduler.shared.submit(request)
    }

    private func handleWidgetRefresh(_ task: BGAppRefreshTask) {
        // Schedule the next refresh before doing any work
        scheduleWidgetRefresh()

        task.expirationHandler = {
            task.setTaskCompleted(success: false)
        }

        refreshWidgetData {
            task.setTaskCompleted(success: true)
        }
    }

    // MARK: - Data fetch + widget reload

    private func refreshWidgetData(completion: (() -> Void)?) {
        let group = DispatchGroup()
        var kp = KpSource.noKp
        var wind = KpSource.noWind

        group.enter()
        KpSource.fetchKp { kp = $0; group.leave() }

        group.enter()
        KpSource.fetchWind { wind = $0; group.leave() }

        group.notify(queue: .main) { [weak self] in
            guard let self else { completion?(); return }
            if let defaults = UserDefaults(suiteName: self.appGroupID) {
                let now = Date().timeIntervalSince1970
                // Written independently: a wind outage must not stop a perfectly
                // good Kp from reaching the widget (and vice versa). Each value
                // carries its own timestamp so the widget can age them apart.
                if kp >= 0 {
                    defaults.set(kp, forKey: KpSource.CacheKey.kp)
                    defaults.set(now, forKey: KpSource.CacheKey.kpUpdated)
                }
                if wind >= 0 {
                    defaults.set(wind, forKey: KpSource.CacheKey.wind)
                    defaults.set(now, forKey: KpSource.CacheKey.windUpdated)
                }
            }
            WidgetCenter.shared.reloadTimelines(ofKind: "StormWidget")
            completion?()
        }
    }

    // MARK: - UNUserNotificationCenterDelegate

    // Show the banner even when the app is in the foreground (Capacitor won't
    // automatically forward it to JS until the user interacts with it).
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .sound, .badge])
    }

    // Called when the user taps a notification (from background or killed state).
    // If the payload carries a `kp` value ≥ G1 threshold, immediately start (or
    // update) the storm Live Activity so the Dynamic Island is live before React
    // finishes initialising.
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                didReceive response: UNNotificationResponse,
                                withCompletionHandler completionHandler: @escaping () -> Void) {
        let info = response.notification.request.content.userInfo
        if let kp = info["kp"] as? Double {
            startLiveActivityNative(kp: kp)
        }
        completionHandler()
    }

    // MARK: - Native Live Activity bootstrap

    // Starts (or updates) the storm Live Activity directly from Swift, before
    // the JS/React layer is ready. Called from push-notification tap handling.
    // The JS hook (useStormLiveActivity) will take over once the web view loads.
    private func startLiveActivityNative(kp: Double) {
        guard kp >= 5.0 else { return }
        if #available(iOS 16.2, *) {
            guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }
            let state = StormActivityAttributes.ContentState(
                kp: kp,
                gLevel: kpToGLevel(kp),
                auroraPct: nil,
                updatedAt: Date().timeIntervalSince1970
            )
            let staleDate = Date().addingTimeInterval(45 * 60)
            if let existing = Activity<StormActivityAttributes>.activities.first {
                Task { await existing.update(ActivityContent(state: state, staleDate: staleDate)) }
                return
            }
            let attrs = StormActivityAttributes(title: "Geomagnetic storm")
            let content = ActivityContent(state: state, staleDate: staleDate)
            try? Activity.request(attributes: attrs, content: content, pushType: .token)
        }
    }

    private func kpToGLevel(_ kp: Double) -> Int {
        if kp >= 9 { return 5 }
        if kp >= 8 { return 4 }
        if kp >= 7 { return 3 }
        if kp >= 6 { return 2 }
        if kp >= 5 { return 1 }
        return 0
    }
}
