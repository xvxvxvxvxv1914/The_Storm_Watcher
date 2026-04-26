import WidgetKit
import SwiftUI

struct KpEntry: TimelineEntry {
    let date: Date
    let kp: Double
    let windSpeed: Int
    let stormLevel: String
    let stormColor: Color
    let lastUpdated: String
}

struct KpProvider: TimelineProvider {
    func placeholder(in context: Context) -> KpEntry {
        KpEntry(date: Date(), kp: 4.3, windSpeed: 420, stormLevel: "QUIET", stormColor: .green, lastUpdated: "--:--")
    }

    func getSnapshot(in context: Context, completion: @escaping (KpEntry) -> Void) {
        fetchAll { entry in completion(entry) }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<KpEntry>) -> Void) {
        fetchAll { entry in
            let next = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
            completion(Timeline(entries: [entry], policy: .after(next)))
        }
    }

    private func fetchAll(completion: @escaping (KpEntry) -> Void) {
        let group = DispatchGroup()
        var kp = 0.0
        var wind = 0

        group.enter()
        // planetary_k_index_1m.json is an array of objects sorted ascending —
        // newest sample is `.last`.
        let kpUrl = URL(string: "https://services.swpc.noaa.gov/json/planetary_k_index_1m.json")!
        URLSession.shared.dataTask(with: kpUrl) { data, _, _ in
            defer { group.leave() }
            guard let data = data,
                  let json = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]],
                  let last = json.last else { return }
            // Field can be reported as either kp_index or estimated_kp depending
            // on whether the sample is final or provisional.
            if let v = last["kp_index"] as? Double { kp = v }
            else if let v = last["estimated_kp"] as? Double { kp = v }
        }.resume()

        group.enter()
        // rtsw_wind_1m.json returns newest-first, so the latest sample is
        // `.first`, not `.last` — same gotcha as the web client.
        let windUrl = URL(string: "https://services.swpc.noaa.gov/json/rtsw/rtsw_wind_1m.json")!
        URLSession.shared.dataTask(with: windUrl) { data, _, _ in
            defer { group.leave() }
            guard let data = data,
                  let json = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else { return }
            // Prefer the newest active sample; fall back to the newest entry.
            let active = json.first(where: { ($0["active"] as? Bool) == true }) ?? json.first
            if let speed = active?["proton_speed"] as? Double {
                wind = Int(speed)
            }
        }.resume()

        group.notify(queue: .main) {
            completion(makeEntry(kp: kp, wind: wind))
        }
    }

    private func makeEntry(kp: Double, wind: Int) -> KpEntry {
        let fmt = DateFormatter()
        fmt.timeStyle = .short
        let time = fmt.string(from: Date())

        let (level, color): (String, Color) = {
            switch kp {
            case 9...: return ("G5", .purple)
            case 8...: return ("G4", Color(red: 0.8, green: 0, blue: 0.8))
            case 7...: return ("G3", .red)
            case 6...: return ("G2", .orange)
            case 5...: return ("G1", Color(red: 1, green: 0.6, blue: 0))
            default:   return ("QUIET", .green)
            }
        }()

        return KpEntry(date: Date(), kp: kp, windSpeed: wind, stormLevel: level, stormColor: color, lastUpdated: time)
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
                Image(systemName: "sun.max.fill")
                    .font(.system(size: 9, weight: .bold))
                    .foregroundColor(.orange)
                Text("STORM WATCHER")
                    .font(.system(size: 8, weight: .bold))
                    .foregroundColor(Color.white.opacity(0.4))
                    .tracking(0.5)
            }
            .padding(.bottom, 4)

            // Kp number
            Text(String(format: "%.1f", entry.kp))
                .font(.system(size: 48, weight: .heavy, design: .rounded))
                .foregroundColor(entry.stormColor)
                .lineLimit(1)
                .minimumScaleFactor(0.6)

            // Storm badge
            Text(entry.stormLevel)
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(entry.stormColor)
                .padding(.horizontal, 7)
                .padding(.vertical, 3)
                .background(entry.stormColor.opacity(0.2))
                .cornerRadius(5)

            Spacer()

            // Kp bar
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 2)
                        .fill(Color.white.opacity(0.1))
                        .frame(height: 4)
                    RoundedRectangle(cornerRadius: 2)
                        .fill(entry.stormColor)
                        .frame(width: geo.size.width * CGFloat(kpFraction), height: 4)
                }
            }
            .frame(height: 4)
            .padding(.bottom, 4)

            // Wind + time
            HStack {
                Label("\(entry.windSpeed) km/s", systemImage: "wind")
                    .font(.system(size: 9))
                    .foregroundColor(Color.white.opacity(0.45))
                Spacer()
                Text(entry.lastUpdated)
                    .font(.system(size: 9))
                    .foregroundColor(Color.white.opacity(0.3))
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
            // Left: Kp
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 4) {
                    Image(systemName: "sun.max.fill")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundColor(.orange)
                    Text("KP INDEX")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundColor(Color.white.opacity(0.4))
                        .tracking(1)
                }

                Text(String(format: "%.1f", entry.kp))
                    .font(.system(size: 52, weight: .heavy, design: .rounded))
                    .foregroundColor(entry.stormColor)

                Text(entry.stormLevel)
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(entry.stormColor)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(entry.stormColor.opacity(0.2))
                    .cornerRadius(5)

                Spacer()

                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 2)
                            .fill(Color.white.opacity(0.1))
                            .frame(height: 4)
                        RoundedRectangle(cornerRadius: 2)
                            .fill(entry.stormColor)
                            .frame(width: geo.size.width * CGFloat(kpFraction), height: 4)
                    }
                }
                .frame(height: 4)
            }
            .frame(maxHeight: .infinity)

            // Divider
            Rectangle()
                .fill(Color.white.opacity(0.08))
                .frame(width: 1)
                .padding(.vertical, 4)
                .padding(.horizontal, 14)

            // Right: stats
            VStack(alignment: .leading, spacing: 10) {
                StatRow(icon: "wind", label: "Solar Wind", value: "\(entry.windSpeed) km/s", color: .cyan)
                StatRow(icon: "waveform.path", label: "Activity", value: entry.stormLevel, color: entry.stormColor)
                StatRow(icon: "clock", label: "Updated", value: entry.lastUpdated, color: Color.white.opacity(0.4))
            }
            .frame(maxHeight: .infinity)
        }
        .padding(14)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct StatRow: View {
    let icon: String
    let label: String
    let value: String
    let color: Color

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: icon)
                .font(.system(size: 10))
                .foregroundColor(color)
                .frame(width: 14)
            VStack(alignment: .leading, spacing: 1) {
                Text(label.uppercased())
                    .font(.system(size: 7, weight: .semibold))
                    .foregroundColor(Color.white.opacity(0.35))
                    .tracking(0.5)
                Text(value)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.white)
            }
        }
    }
}

// MARK: - Entry View
struct StormWidgetEntryView: View {
    let entry: KpEntry
    @Environment(\.widgetFamily) var family

    var bgColor: Color { Color(red: 0.05, green: 0.05, blue: 0.12) }

    var body: some View {
        Group {
            if family == .systemSmall {
                StormWidgetSmallView(entry: entry)
            } else {
                StormWidgetMediumView(entry: entry)
            }
        }
        .widgetBackground(bgColor)
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
        .description("Live Kp index and solar wind.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

@main
struct StormWidgetBundle: WidgetBundle {
    var body: some Widget {
        StormWidget()
    }
}
