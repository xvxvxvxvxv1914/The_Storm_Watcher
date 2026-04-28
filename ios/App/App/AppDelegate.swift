import UIKit
import Capacitor
import WidgetKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?
    private let appGroupID = "group.com.stormwatcher.app"

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        refreshWidgetData()
    }

    func applicationWillTerminate(_ application: UIApplication) {
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

    // Fetch fresh Kp + wind from NOAA, write to App Group UserDefaults, then
    // reload the widget timeline so it shows updated data without waiting for
    // its own background refresh budget.
    private func refreshWidgetData() {
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
            if let v = last["kp_index"] as? Double { kp = v }
            else if let v = last["estimated_kp"] as? Double { kp = v }
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
            guard let self else { return }
            if kp >= 0, wind >= 0,
               let defaults = UserDefaults(suiteName: self.appGroupID) {
                defaults.set(kp, forKey: "widget_kp")
                defaults.set(wind, forKey: "widget_wind")
                defaults.set(Date().timeIntervalSince1970, forKey: "widget_updated")
            }
            WidgetCenter.shared.reloadTimelines(ofKind: "StormWidget")
        }
    }
}
