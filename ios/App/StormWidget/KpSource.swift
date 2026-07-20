import Foundation

/// Kp / solar-wind fetching shared by the app target (AppDelegate's widget
/// refresh) and the widget target (KpProvider's own timeline fetch).
///
/// Both paths MUST use this type. The widget reads the App Group cache when it
/// is fresh and falls back to fetching on its own when it is not, so if the two
/// paths used different endpoints the widget would show one number minutes
/// after the app was closed and a different one before that.
///
/// Mirrors the JS cascade in src/services/noaaApi.ts (getKpIndex): GFZ is
/// primary, NOAA is the fallback. GFZ publishes stable 3-hour bins; NOAA's
/// `estimated_kp` is a per-minute estimate that swings between bins, which is
/// why mixing the two produced visibly different values in app vs widget.
enum KpSource {
    /// -1 is the "no data" sentinel — Kp 0.0 is a legitimate ultra-quiet reading.
    static let noKp: Double = -1
    static let noWind: Int = -1

    private static let timeout: TimeInterval = 8

    private static var session: URLSession {
        let cfg = URLSessionConfiguration.ephemeral
        cfg.timeoutIntervalForRequest = timeout
        return URLSession(configuration: cfg)
    }

    // MARK: - Kp

    /// GFZ first, NOAA on any failure. Always calls back, with `noKp` if both fail.
    static func fetchKp(completion: @escaping (Double) -> Void) {
        fetchGfzKp { gfz in
            if gfz >= 0 { completion(gfz); return }
            fetchNoaaKp(completion: completion)
        }
    }

    private static func fetchGfzKp(completion: @escaping (Double) -> Void) {
        // 24h window is plenty to land on the latest closed 3-hour bin. (The JS
        // side asks for 7 days because it also draws the history chart.)
        let end = Date()
        let start = end.addingTimeInterval(-24 * 60 * 60)
        let fmt = ISO8601DateFormatter()
        fmt.timeZone = TimeZone(secondsFromGMT: 0)
        fmt.formatOptions = [.withInternetDateTime] // no fractional seconds — GFZ rejects them

        var comps = URLComponents(string: "https://kp.gfz.de/app/json/")!
        comps.queryItems = [
            URLQueryItem(name: "start", value: fmt.string(from: start)),
            URLQueryItem(name: "end", value: fmt.string(from: end)),
            URLQueryItem(name: "index", value: "Kp"),
        ]
        guard let url = comps.url else { completion(noKp); return }

        session.dataTask(with: url) { data, _, _ in
            guard let data,
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let values = json["Kp"] as? [Any] else { completion(noKp); return }
            // Trailing bins can be null for periods GFZ hasn't published yet.
            let latest = values.reversed().compactMap { $0 as? Double }.first
            completion(latest.map { $0 >= 0 ? $0 : noKp } ?? noKp)
        }.resume()
    }

    private static func fetchNoaaKp(completion: @escaping (Double) -> Void) {
        let url = URL(string: "https://services.swpc.noaa.gov/json/planetary_k_index_1m.json")!
        session.dataTask(with: url) { data, _, _ in
            guard let data,
                  let json = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]],
                  let last = json.last else { completion(noKp); return }
            if let v = last["estimated_kp"] as? Double, v >= 0 { completion(v) }
            else if let v = last["kp_index"] as? Double, v >= 0 { completion(v) }
            else { completion(noKp) }
        }.resume()
    }

    // MARK: - Solar wind

    /// Always calls back, with `noWind` on failure.
    static func fetchWind(completion: @escaping (Int) -> Void) {
        let url = URL(string: "https://services.swpc.noaa.gov/json/rtsw/rtsw_wind_1m.json")!
        session.dataTask(with: url) { data, _, _ in
            guard let data,
                  let json = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]]
            else { completion(noWind); return }
            let active = json.first(where: { ($0["active"] as? Bool) == true }) ?? json.first
            guard let speed = active?["proton_speed"] as? Double else { completion(noWind); return }
            completion(Int(speed))
        }.resume()
    }

    // MARK: - App Group cache keys

    /// Kp and wind carry independent timestamps so that one endpoint failing
    /// never invalidates the other's cached value.
    enum CacheKey {
        static let kp = "widget_kp"
        static let wind = "widget_wind"
        static let kpUpdated = "widget_updated"      // legacy name, kept for installed widgets
        static let windUpdated = "widget_wind_updated"
    }
}
