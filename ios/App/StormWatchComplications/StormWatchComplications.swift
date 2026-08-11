import WidgetKit
import SwiftUI

/// Watch-face complications. Four families, one number: the Kp index, coloured
/// by the same bands as the gauge in the app and both home-screen widgets
/// (`kpColor` in Shared/StormShared.swift).
///
/// Data comes from the watch's own App Group cache when the watch app has
/// filled it recently, and from `KpSource` otherwise — the same GFZ→NOAA
/// cascade the phone uses, so a glance at the wrist and a glance at the phone
/// cannot show two different numbers.

// MARK: - Entry

struct WatchKpEntry: TimelineEntry {
    let date: Date
    let kp: Double
    let wind: Int

    var hasData: Bool { kp >= 0 }
    /// Kp 0.0 is a real ultra-quiet reading, so the sentinel — never the value —
    /// decides whether we render a number or a dash.
    var kpText: String { kp >= 0 ? String(format: "%.1f", kp) : "--" }
    var color: Color { kp >= 0 ? kpColor(kp) : .gray }
}

// MARK: - Provider

struct WatchKpProvider: TimelineProvider {
    func placeholder(in context: Context) -> WatchKpEntry {
        WatchKpEntry(date: Date(), kp: 2.3, wind: 420)
    }

    func getSnapshot(in context: Context, completion: @escaping (WatchKpEntry) -> Void) {
        load { completion($0) }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<WatchKpEntry>) -> Void) {
        load { entry in
            // Kp is a 3-hour index; asking again in 20 minutes is frequent enough
            // to catch a new bin quickly without spending the watch's budget.
            let next = Date(timeIntervalSinceNow: 20 * 60)
            completion(Timeline(entries: [entry], policy: .after(next)))
        }
    }

    private func load(_ completion: @escaping (WatchKpEntry) -> Void) {
        let defaults = UserDefaults(suiteName: appGroupID)
        let now = Date().timeIntervalSince1970
        func isFresh(_ key: String) -> Bool {
            guard let updated = defaults?.double(forKey: key), updated > 0 else { return false }
            return now - updated < sharedDataMaxAge
        }

        let cachedKp = isFresh(KpSource.CacheKey.kpUpdated) ? defaults?.double(forKey: KpSource.CacheKey.kp) : nil
        let cachedWind = isFresh(KpSource.CacheKey.windUpdated) ? defaults?.integer(forKey: KpSource.CacheKey.wind) : nil

        if let cachedKp, let cachedWind {
            completion(WatchKpEntry(date: Date(), kp: cachedKp, wind: cachedWind))
            return
        }

        let group = DispatchGroup()
        var kp = cachedKp ?? KpSource.noKp
        var wind = cachedWind ?? KpSource.noWind

        if cachedKp == nil {
            group.enter()
            KpSource.fetchKp { kp = $0; group.leave() }
        }
        if cachedWind == nil {
            group.enter()
            KpSource.fetchWind { wind = $0; group.leave() }
        }
        group.notify(queue: .main) {
            completion(WatchKpEntry(date: Date(), kp: kp, wind: wind))
        }
    }
}

// MARK: - Views

struct WatchComplicationView: View {
    @Environment(\.widgetFamily) private var family
    let entry: WatchKpEntry

    var body: some View {
        switch family {
        case .accessoryCircular:   circular
        case .accessoryCorner:     corner
        case .accessoryRectangular: rectangular
        default:                   inline
        }
    }

    private var circular: some View {
        Gauge(value: min(max(entry.kp, 0), 9), in: 0...9) {
            Text("Kp")
        } currentValueLabel: {
            Text(entry.kpText).minimumScaleFactor(0.7)
        }
        .gaugeStyle(.accessoryCircular)
        .tint(Gauge0to9.tint)
    }

    private var corner: some View {
        Text(entry.kpText)
            .font(.system(size: 18, weight: .bold, design: .rounded))
            .foregroundStyle(entry.color)
            .widgetCurvesContent()
            .widgetLabel {
                Gauge(value: min(max(entry.kp, 0), 9), in: 0...9) { Text("Kp") }
                    .tint(Gauge0to9.tint)
            }
    }

    private var rectangular: some View {
        VStack(alignment: .leading, spacing: 1) {
            HStack(spacing: 4) {
                Text(WL.kpIndex)
                    .font(.system(size: 11, weight: .semibold))
                Text(entry.kpText)
                    .font(.system(size: 11, weight: .bold, design: .rounded))
                    .foregroundStyle(entry.color)
            }
            Text(entry.hasData ? kpLevel(entry.kp) : WL.noData)
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(entry.color)
            if entry.wind >= 0 {
                Text("\(entry.wind) km/s")
                    .font(.system(size: 11))
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var inline: some View {
        Text(entry.hasData ? "Kp \(entry.kpText) · \(kpLevel(entry.kp))" : "Kp --")
    }
}

/// The accessory gauge renders monochrome on most faces; the band gradient is
/// what still carries severity where colour survives.
private enum Gauge0to9 {
    static let tint = Gradient(colors: [.brandEmerald, .brandAmber, .brandOrange, .brandRed])
}

// MARK: - Widget

struct StormWatchComplication: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: watchComplicationKind, provider: WatchKpProvider()) { entry in
            WatchComplicationView(entry: entry)
                .containerBackground(.clear, for: .widget)
        }
        .configurationDisplayName("Storm Watcher")
        .description(WL.widgetDescription)
        .supportedFamilies([
            .accessoryCircular,
            .accessoryCorner,
            .accessoryRectangular,
            .accessoryInline,
        ])
    }
}

@main
struct StormWatchComplicationsBundle: WidgetBundle {
    var body: some Widget {
        StormWatchComplication()
    }
}
