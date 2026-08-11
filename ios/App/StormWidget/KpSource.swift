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

    private static let timeout: TimeInterval = 20

    /// `let`, not a computed `var`. As a computed property this handed out a new
    /// URLSession per call and kept a reference to none of them; small responses
    /// beat the deallocation, the 2.6 MB solar-wind feed did not, and on the
    /// watch it failed every time while Kp succeeded. One retained session also
    /// means one connection pool instead of one per request.
    private static let session: URLSession = {
        let cfg = URLSessionConfiguration.ephemeral
        cfg.timeoutIntervalForRequest = timeout
        cfg.waitsForConnectivity = false
        return URLSession(configuration: cfg)
    }()

    // MARK: - Malformed upstream JSON

    /// NOAA's rtsw feeds emit bare `NaN` for dropped samples:
    ///
    ///     {"time_tag": "...", "active": true, "proton_speed": NaN, ...}
    ///
    /// RFC 8259 has no NaN, so this is not JSON, and `JSONSerialization` rejects
    /// the **entire document** — one bad sample among 3590 rows and the whole
    /// solar-wind reading disappears. Observed live on 2026-08-11: 8 occurrences
    /// in one payload, parse aborting at byte 2593196 of 2662008.
    ///
    /// Python accepts NaN by default, which is why inspecting the feed with a
    /// script suggests nothing is wrong. `JSON.parse` rejects it too, so the web
    /// app hits the same wall.
    ///
    /// Mapping it to `null` is the honest repair: null is what the feed already
    /// uses for "no sample", and every reader here treats it as missing.
    /// Matching only after `:` keeps a string that happens to contain NaN safe.
    static func repairingNaN(_ data: Data) -> Data {
        guard let text = String(data: data, encoding: .utf8), text.contains("NaN") || text.contains("Infinity") else {
            return data
        }
        var fixed = text
        for (bad, good) in [(": NaN", ": null"), (":NaN", ":null"),
                            (": -Infinity", ": null"), (":-Infinity", ":null"),
                            (": Infinity", ": null"), (":Infinity", ":null")] {
            fixed = fixed.replacingOccurrences(of: bad, with: good)
        }
        return Data(fixed.utf8)
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
                  let json = try? JSONSerialization.jsonObject(with: repairingNaN(data)) as? [[String: Any]],
                  let last = json.last else { completion(noKp); return }
            // `kp_index` first, matching the app (useKpLive.ts). `estimated_kp` is
            // NOAA's per-minute estimate and swings between the 3-hour bins
            // (0.33 → 0.67 → 0.33 while the bin holds 0.333) — reading it here
            // put a different number on the widget than on the screen next to it.
            if let v = last["kp_index"] as? Double, v >= 0 { completion(v) }
            else if let v = last["estimated_kp"] as? Double, v >= 0 { completion(v) }
            else { completion(noKp) }
        }.resume()
    }

    // MARK: - Solar wind

    /// Always calls back, with `noWind` on failure.
    static func fetchWind(completion: @escaping (Int) -> Void) {
        let url = URL(string: "https://services.swpc.noaa.gov/json/rtsw/rtsw_wind_1m.json")!
        session.dataTask(with: url) { data, _, _ in
            guard let data,
                  let json = try? JSONSerialization.jsonObject(with: repairingNaN(data)) as? [[String: Any]]
            else { completion(noWind); return }
            // Newest active sample *that carries a reading*. The feed is
            // newest-first, its trailing samples are often active:false (not yet
            // validated), and any sample can have no speed — null, or the NaN
            // repaired into one above. Stopping at the newest active row and
            // then finding it empty threw away 3589 perfectly good ones.
            func speed(_ row: [String: Any]) -> Double? {
                guard let v = row["proton_speed"] as? Double, v.isFinite, v > 0 else { return nil }
                return v
            }
            let newestActive = json.first { ($0["active"] as? Bool) == true && speed($0) != nil }
            guard let row = newestActive ?? json.first(where: { speed($0) != nil }),
                  let v = speed(row) else { completion(noWind); return }
            completion(Int(v))
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
