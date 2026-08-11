import Foundation
import Observation
import WidgetKit

/// Data for the watch app and, through the App Group cache, for its complications.
///
/// **The watch fetches for itself.** It does *not* read the iPhone's App Group
/// container — App Groups are shared between an app and its extensions on one
/// device, and the Watch is a different device. (The earlier plan in CLAUDE.md
/// said otherwise; that design would show nothing until someone opened the
/// phone.) What keeps the two screens agreeing is that both go through
/// `KpSource`: GFZ primary, NOAA fallback, same field priority.
///
/// The App Group *is* used, but locally on the watch: the app writes what it
/// fetched and the complication extension reads it, so the two processes do not
/// each hit the network. If the entitlement is missing — the case on a free
/// Apple team, which cannot provision app groups for these bundle IDs —
/// `UserDefaults(suiteName:)` returns nil and both sides simply fetch.
/// Degraded, not broken.

// MARK: - Cache

/// Free functions rather than methods on the store: the background-refresh path
/// runs in a `@Sendable` closure and must not capture observable UI state.
enum WatchCache {
    private static var defaults: UserDefaults? { UserDefaults(suiteName: appGroupID) }

    static func isFresh(_ key: String) -> Bool {
        guard let updated = defaults?.double(forKey: key), updated > 0 else { return false }
        return Date().timeIntervalSince1970 - updated < sharedDataMaxAge
    }

    /// Freshness alone decides whether a value is usable — never the value
    /// itself. Kp 0.0 is a real ultra-quiet reading.
    static func cachedKp() -> Double? {
        guard isFresh(KpSource.CacheKey.kpUpdated), let d = defaults else { return nil }
        return d.double(forKey: KpSource.CacheKey.kp)
    }

    static func cachedWind() -> Int? {
        guard isFresh(KpSource.CacheKey.windUpdated), let d = defaults else { return nil }
        return d.integer(forKey: KpSource.CacheKey.wind)
    }

    static func cachedAt() -> Date? {
        guard isFresh(KpSource.CacheKey.kpUpdated), let d = defaults else { return nil }
        return Date(timeIntervalSince1970: d.double(forKey: KpSource.CacheKey.kpUpdated))
    }

    /// Kp and wind are stamped independently, so a solar-wind outage never
    /// discards a perfectly good Kp — the bug that split fixed on iOS.
    static func store(kp: Double?, wind: Int?) {
        guard let d = defaults else { return }
        let now = Date().timeIntervalSince1970
        if let kp, kp >= 0 {
            d.set(kp, forKey: KpSource.CacheKey.kp)
            d.set(now, forKey: KpSource.CacheKey.kpUpdated)
        }
        if let wind, wind >= 0 {
            d.set(wind, forKey: KpSource.CacheKey.wind)
            d.set(now, forKey: KpSource.CacheKey.windUpdated)
        }
    }
}

// MARK: - Fetching

enum WatchFetch {
    static func kp() async -> Double {
        await withCheckedContinuation { cont in
            KpSource.fetchKp { cont.resume(returning: $0) }
        }
    }

    static func wind() async -> Int {
        await withCheckedContinuation { cont in
            KpSource.fetchWind { cont.resume(returning: $0) }
        }
    }

    /// The background-refresh path: fetch, persist, redraw the face. Deliberately
    /// touches no view state — see the note on WatchCache.
    static func refreshInBackground() async {
        async let k = kp()
        async let w = wind()
        let (newKp, newWind) = await (k, w)
        WatchCache.store(kp: newKp, wind: newWind)
        WidgetCenter.shared.reloadTimelines(ofKind: watchComplicationKind)
    }
}

// MARK: - Store

@MainActor
@Observable
final class WatchStore {
    private(set) var kp: Double = KpSource.noKp
    private(set) var wind: Int = KpSource.noWind
    private(set) var lastUpdated: Date?
    private(set) var isLoading = false

    /// Kp 0.0 is real data, so the sentinel decides this, never the value.
    var hasData: Bool { kp >= 0 || wind >= 0 }

    /// Seed from the cache so the first frame is not empty.
    init() {
        if let k = WatchCache.cachedKp() { kp = k; lastUpdated = WatchCache.cachedAt() }
        if let w = WatchCache.cachedWind() { wind = w }
    }

    /// Keeps the previous reading for whichever endpoint fails, so one dead feed
    /// cannot blank a working number.
    func refresh() async {
        if isLoading { return }
        isLoading = true
        defer { isLoading = false }

        async let k = WatchFetch.kp()
        async let w = WatchFetch.wind()
        let (newKp, newWind) = await (k, w)

        if newKp >= 0 { kp = newKp }
        if newWind >= 0 { wind = newWind }
        if newKp >= 0 || newWind >= 0 { lastUpdated = Date() }

        WatchCache.store(kp: newKp, wind: newWind)
        WidgetCenter.shared.reloadTimelines(ofKind: watchComplicationKind)
    }
}
