import WidgetKit
import SwiftUI

private let appGroupID = "group.com.stormwatcher.app"
private let sharedDataMaxAge: TimeInterval = 90

// MARK: - Models

struct ForecastPoint {
    let date: Date
    let kp: Double
    var color: Color { kpColor(kp) }
    var hourLabel: String {
        let h = Calendar.current.component(.hour, from: date)
        return "\(h)"
    }
}

struct KpEntry: TimelineEntry {
    let date: Date
    let kp: Double
    let windSpeed: Int
    let stormLevel: String
    let stormColor: Color
    let lastUpdated: String
    let forecast: [ForecastPoint]
}

// MARK: - Helpers

private func kpColor(_ kp: Double) -> Color {
    switch kp {
    case 9...: return .purple
    case 8...: return Color(red: 0.8, green: 0, blue: 0.8)
    case 7...: return .red
    case 6...: return .orange
    case 5...: return Color(red: 1, green: 0.6, blue: 0)
    default:   return .green
    }
}

private func kpLevel(_ kp: Double) -> String {
    switch kp {
    case 9...: return "G5"
    case 8...: return "G4"
    case 7...: return "G3"
    case 6...: return "G2"
    case 5...: return "G1"
    default:   return "QUIET"
    }
}

// MARK: - Provider

struct KpProvider: TimelineProvider {
    func placeholder(in context: Context) -> KpEntry {
        KpEntry(date: Date(), kp: 2.3, windSpeed: 420,
                stormLevel: "QUIET", stormColor: .green,
                lastUpdated: "--:--", forecast: [])
    }

    func getSnapshot(in context: Context, completion: @escaping (KpEntry) -> Void) {
        fetchAll { completion($0) }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<KpEntry>) -> Void) {
        fetchAll { entry in
            // Single entry; ask WidgetKit to call getTimeline again in 15 min.
            // The app refreshes the App Group cache every 60s while active, so
            // reloadTimelines() from AppDelegate will deliver fresher data sooner.
            let nextRefresh = Date(timeIntervalSinceNow: 15 * 60)
            completion(Timeline(entries: [entry], policy: .after(nextRefresh)))
        }
    }

    private func fetchAll(completion: @escaping (KpEntry) -> Void) {
        let group = DispatchGroup()
        var kp = 0.0
        var wind = 0
        var forecastPoints: [ForecastPoint] = []

        // Use app-group cache for live Kp/wind if fresh
        var usedCache = false
        if let defaults = UserDefaults(suiteName: appGroupID) {
            let updated = defaults.double(forKey: "widget_updated")
            let ck = defaults.double(forKey: "widget_kp")
            let cw = defaults.integer(forKey: "widget_wind")
            if updated > 0,
               Date().timeIntervalSince1970 - updated < sharedDataMaxAge,
               ck > 0 {
                kp = ck
                wind = cw
                usedCache = true
            }
        }

        if !usedCache {
            group.enter()
            URLSession.shared.dataTask(
                with: URL(string: "https://services.swpc.noaa.gov/json/planetary_k_index_1m.json")!
            ) { data, _, _ in
                defer { group.leave() }
                guard let data,
                      let json = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]],
                      let last = json.last else { return }
                if let v = last["kp_index"] as? Double      { kp = v }
                else if let v = last["estimated_kp"] as? Double { kp = v }
            }.resume()

            group.enter()
            URLSession.shared.dataTask(
                with: URL(string: "https://services.swpc.noaa.gov/json/rtsw/rtsw_wind_1m.json")!
            ) { data, _, _ in
                defer { group.leave() }
                guard let data,
                      let json = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else { return }
                let active = json.first(where: { ($0["active"] as? Bool) == true }) ?? json.first
                if let s = active?["proton_speed"] as? Double { wind = Int(s) }
            }.resume()
        }

        // Always fetch forecast — changes every 3h regardless of cache
        group.enter()
        URLSession.shared.dataTask(
            with: URL(string: "https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json")!
        ) { data, _, _ in
            defer { group.leave() }
            // API returns [{time_tag, kp, observed, noaa_scale}, ...]
            guard let data,
                  let json = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else { return }

            let fmt = DateFormatter()
            fmt.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"
            fmt.timeZone = TimeZone(identifier: "UTC")
            let now = Date()

            forecastPoints = json.compactMap { row -> ForecastPoint? in
                guard let timeStr = row["time_tag"] as? String,
                      let date = fmt.date(from: timeStr),
                      date > now else { return nil }
                let kpVal: Double
                if let v = row["kp"] as? Double      { kpVal = v }
                else if let v = row["kp"] as? Int    { kpVal = Double(v) }
                else                                 { return nil }
                return ForecastPoint(date: date, kp: kpVal)
            }
            .prefix(8)
            .map { $0 }
        }.resume()

        group.notify(queue: .main) {
            let fmt = DateFormatter()
            fmt.timeStyle = .short
            completion(KpEntry(
                date: Date(), kp: kp, windSpeed: wind,
                stormLevel: kpLevel(kp), stormColor: kpColor(kp),
                lastUpdated: fmt.string(from: Date()),
                forecast: forecastPoints
            ))
        }
    }
}

// MARK: - Forecast bars

struct ForecastBarsView: View {
    let points: [ForecastPoint]
    let barHeight: CGFloat

    var body: some View {
        HStack(alignment: .bottom, spacing: 4) {
            ForEach(Array(points.enumerated()), id: \.offset) { _, point in
                VStack(spacing: 2) {
                    Spacer(minLength: 0)
                    RoundedRectangle(cornerRadius: 2)
                        .fill(point.color.opacity(0.85))
                        .frame(height: max(CGFloat(point.kp / 9.0) * barHeight, 3))
                    Text(point.hourLabel)
                        .font(.system(size: 7, weight: .medium, design: .rounded))
                        .foregroundColor(Color.white.opacity(0.3))
                }
                .frame(maxWidth: .infinity)
            }
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Small Widget

struct StormWidgetSmallView: View {
    let entry: KpEntry

    var kpFraction: Double { min(entry.kp / 9.0, 1.0) }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header
            HStack(spacing: 4) {
                Image(systemName: "bolt.fill")
                    .font(.system(size: 8, weight: .bold))
                    .foregroundColor(entry.stormColor)
                Text("STORM WATCHER")
                    .font(.system(size: 7.5, weight: .bold, design: .rounded))
                    .foregroundColor(Color.white.opacity(0.35))
                    .tracking(0.8)
            }
            .padding(.bottom, 2)

            // Kp number
            Text(String(format: "%.1f", entry.kp))
                .font(.system(size: 44, weight: .heavy, design: .rounded))
                .foregroundColor(entry.stormColor)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
                .padding(.bottom, 2)

            // Storm badge
            Text(entry.stormLevel)
                .font(.system(size: 10, weight: .bold, design: .rounded))
                .foregroundColor(entry.stormColor)
                .padding(.horizontal, 7)
                .padding(.vertical, 2)
                .background(entry.stormColor.opacity(0.18))
                .clipShape(Capsule())

            Spacer()

            // Mini forecast bars (4 bars = 12h)
            if !entry.forecast.isEmpty {
                let mini = Array(entry.forecast.prefix(4))
                ForecastBarsView(points: mini, barHeight: 18)
                    .padding(.bottom, 3)
            } else {
                // Fallback: Kp progress bar
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 2)
                            .fill(Color.white.opacity(0.1))
                            .frame(height: 3)
                        RoundedRectangle(cornerRadius: 2)
                            .fill(entry.stormColor)
                            .frame(width: geo.size.width * CGFloat(kpFraction), height: 3)
                    }
                }
                .frame(height: 3)
                .padding(.bottom, 3)
            }

            // Wind + time
            HStack {
                Label("\(entry.windSpeed) km/s", systemImage: "wind")
                    .font(.system(size: 8.5))
                    .foregroundColor(Color.white.opacity(0.4))
                Spacer()
                Text(entry.lastUpdated)
                    .font(.system(size: 8.5))
                    .foregroundColor(Color.white.opacity(0.25))
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Medium Widget

struct StormWidgetMediumView: View {
    let entry: KpEntry

    var kpFraction: Double { min(entry.kp / 9.0, 1.0) }

    var body: some View {
        HStack(spacing: 0) {

            // Left: current Kp
            VStack(alignment: .leading, spacing: 0) {
                HStack(spacing: 4) {
                    Image(systemName: "bolt.fill")
                        .font(.system(size: 8, weight: .bold))
                        .foregroundColor(entry.stormColor)
                    Text("KP INDEX")
                        .font(.system(size: 8, weight: .bold, design: .rounded))
                        .foregroundColor(Color.white.opacity(0.35))
                        .tracking(1)
                }
                .padding(.bottom, 2)

                Text(String(format: "%.1f", entry.kp))
                    .font(.system(size: 48, weight: .heavy, design: .rounded))
                    .foregroundColor(entry.stormColor)

                Text(entry.stormLevel)
                    .font(.system(size: 11, weight: .bold, design: .rounded))
                    .foregroundColor(entry.stormColor)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(entry.stormColor.opacity(0.18))
                    .clipShape(Capsule())

                Spacer()

                VStack(alignment: .leading, spacing: 5) {
                    Label("\(entry.windSpeed) km/s", systemImage: "wind")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundColor(.cyan.opacity(0.8))
                    Label(entry.lastUpdated, systemImage: "clock")
                        .font(.system(size: 10))
                        .foregroundColor(Color.white.opacity(0.3))
                }
            }
            .frame(maxHeight: .infinity)

            // Divider
            Rectangle()
                .fill(Color.white.opacity(0.07))
                .frame(width: 1)
                .padding(.vertical, 2)
                .padding(.horizontal, 12)

            // Right: 24h forecast
            VStack(alignment: .leading, spacing: 4) {
                Text("FORECAST 24H")
                    .font(.system(size: 7.5, weight: .bold, design: .rounded))
                    .foregroundColor(Color.white.opacity(0.35))
                    .tracking(0.8)

                if entry.forecast.isEmpty {
                    Spacer()
                    Text("No data")
                        .font(.system(size: 10))
                        .foregroundColor(Color.white.opacity(0.2))
                    Spacer()
                } else {
                    Spacer(minLength: 0)
                    ForecastBarsView(points: entry.forecast, barHeight: 52)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .padding(14)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Entry View

struct StormWidgetEntryView: View {
    let entry: KpEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        Group {
            if family == .systemSmall {
                StormWidgetSmallView(entry: entry)
            } else {
                StormWidgetMediumView(entry: entry)
            }
        }
        .widgetBackground(Color(red: 0.05, green: 0.05, blue: 0.12))
    }
}

extension View {
    @ViewBuilder
    func widgetBackground(_ color: Color) -> some View {
        if #available(iOS 17.0, *) {
            self.containerBackground(color, for: .widget)
        } else {
            self.background(color)
        }
    }
}

// MARK: - Widget

struct StormWidget: Widget {
    let kind = "StormWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: KpProvider()) { entry in
            StormWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Storm Watcher")
        .description("Live Kp index, solar wind and 24h forecast.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

@main
struct StormWidgetBundle: WidgetBundle {
    var body: some Widget {
        StormWidget()
    }
}
