import UIKit
import Capacitor
import WidgetKit
import BackgroundTasks
import UserNotifications
import Sentry

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate {

    var window: UIWindow?
    private let appGroupID = "group.com.stormwatcher.app"
    private let bgTaskID = "com.stormwatcher.widget-refresh"
    private var widgetRefreshTimer: Timer?

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
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { _, _ in }
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
        var kp = -1.0
        var wind = -1

        group.enter()
        let kpUrl = URL(string: "https://services.swpc.noaa.gov/json/planetary_k_index_1m.json")!
        URLSession.shared.dataTask(with: kpUrl) { data, _, _ in
            defer { group.leave() }
            guard let data,
                  let json = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]],
                  let last = json.last else { return }
            if let v = last["estimated_kp"] as? Double, v > 0 { kp = v }
            else if let v = last["kp_index"] as? Double       { kp = v }
        }.resume()

        group.enter()
        let windUrl = URL(string: "https://services.swpc.noaa.gov/json/rtsw/rtsw_wind_1m.json")!
        URLSession.shared.dataTask(with: windUrl) { data, _, _ in
            defer { group.leave() }
            guard let data,
                  let json = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else { return }
            let active = json.first(where: { ($0["active"] as? Bool) == true }) ?? json.first
            if let speed = active?["proton_speed"] as? Double { wind = Int(speed) }
        }.resume()

        group.notify(queue: .main) { [weak self] in
            guard let self else { completion?(); return }
            if kp >= 0, wind >= 0,
               let defaults = UserDefaults(suiteName: self.appGroupID) {
                defaults.set(kp, forKey: "widget_kp")
                defaults.set(wind, forKey: "widget_wind")
                defaults.set(Date().timeIntervalSince1970, forKey: "widget_updated")
            }
            WidgetCenter.shared.reloadTimelines(ofKind: "StormWidget")
            completion?()
        }
    }
}
