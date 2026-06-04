import WidgetKit
import SwiftUI

// MARK: - Brand colours (from icon.svg / web design system)
// Internal (not private) so StormLiveActivity.swift in the same target can use them.
extension Color {
    init(hex: String) {
        let s = Scanner(string: hex.trimmingCharacters(in: CharacterSet(charactersIn: "#")))
        var int: UInt64 = 0
        s.scanHexInt64(&int)
        self.init(
            red:   Double((int >> 16) & 0xFF) / 255,
            green: Double((int >>  8) & 0xFF) / 255,
            blue:  Double( int        & 0xFF) / 255
        )
    }
    static let brandEmerald = Color(hex: "#10b981") // aurora / quiet Kp
    static let brandAmber   = Color(hex: "#eab308") // unsettled Kp 4+
    static let brandOrange  = Color(hex: "#f97316") // solar / storm Kp 5+
    static let brandRed     = Color(hex: "#ef4444") // severe storm Kp 7+
    static let brandNavy    = Color(hex: "#0a0e27") // deep space background
}

private let appGroupID = "group.com.stormwatcher.app"
private let sharedDataMaxAge: TimeInterval = 300 // 5 minutes — BGAppRefresh fires at most every 15 min

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
    let isStale: Bool
}

// MARK: - Localization

private struct WL {
    static var lang: String {
        let code = Locale.preferredLanguages.first.map { String($0.prefix(2)) } ?? "en"
        let supported = ["bg","da","de","es","fi","fr","is","ja","ko","no","pl","ru","sv","uk","zh"]
        return supported.contains(code) ? code : "en"
    }
    static var kpIndex: String {
        switch lang {
        case "bg": return "КP ИНДЕКС"
        case "da": return "KP-INDEKS"
        case "de": return "KP-INDEX"
        case "es": return "ÍNDICE KP"
        case "fi": return "KP-INDEKSI"
        case "fr": return "INDICE KP"
        case "is": return "KP-VÍSITALA"
        case "ja": return "KP 指数"
        case "ko": return "KP 지수"
        case "no": return "KP-INDEKS"
        case "pl": return "INDEKS KP"
        case "ru": return "КП ИНДЕКС"
        case "sv": return "KP-INDEX"
        case "uk": return "КП ІНДЕКС"
        case "zh": return "KP指数"
        default:   return "KP INDEX"
        }
    }
    static var forecast24h: String {
        switch lang {
        case "bg": return "ПРОГНОЗА 24Ч"
        case "da": return "PROGNOSE 24T"
        case "de": return "PROGNOSE 24H"
        case "es": return "PRONÓSTICO 24H"
        case "fi": return "ENNUSTE 24H"
        case "fr": return "PRÉVISION 24H"
        case "is": return "SPÁ 24H"
        case "ja": return "24時間予報"
        case "ko": return "24시간 예보"
        case "no": return "PROGNOSE 24T"
        case "pl": return "PROGNOZA 24H"
        case "ru": return "ПРОГНОЗ 24Ч"
        case "sv": return "PROGNOS 24H"
        case "uk": return "ПРОГНОЗ 24Г"
        case "zh": return "24小时预报"
        default:   return "FORECAST 24H"
        }
    }
    static var noData: String {
        switch lang {
        case "bg": return "Няма данни"
        case "da": return "Ingen data"
        case "de": return "Keine Daten"
        case "es": return "Sin datos"
        case "fi": return "Ei tietoja"
        case "fr": return "Pas de données"
        case "is": return "Engin gögn"
        case "ja": return "データなし"
        case "ko": return "데이터 없음"
        case "no": return "Ingen data"
        case "pl": return "Brak danych"
        case "ru": return "Нет данных"
        case "sv": return "Inga data"
        case "uk": return "Немає даних"
        case "zh": return "暂无数据"
        default:   return "No data"
        }
    }
    static var quiet: String {
        switch lang {
        case "bg": return "СПОКОЙНО"
        case "da": return "ROLIGT"
        case "de": return "RUHIG"
        case "es": return "TRANQUILO"
        case "fi": return "RAUHALLINEN"
        case "fr": return "CALME"
        case "is": return "RÓLEGT"
        case "ja": return "静穏"
        case "ko": return "조용함"
        case "no": return "ROLIG"
        case "pl": return "SPOKOJNY"
        case "ru": return "СПОКОЙНО"
        case "sv": return "LUGNT"
        case "uk": return "СПОКІЙНО"
        case "zh": return "平静"
        default:   return "QUIET"
        }
    }
    static var widgetDescription: String {
        switch lang {
        case "bg": return "Kp индекс, слънчев вятър и 24-часова прогноза в реално време."
        case "da": return "Live Kp-indeks, solvind og 24h prognose."
        case "de": return "Live Kp-Index, Sonnenwind und 24h-Prognose."
        case "es": return "Índice Kp en vivo, viento solar y pronóstico de 24 horas."
        case "fi": return "Live Kp-indeksi, aurinkotuuli ja 24h ennuste."
        case "fr": return "Indice Kp en direct, vent solaire et prévision 24h."
        case "is": return "Kp-vísitala í beinni, sólvindur og 24h spá."
        case "ja": return "ライブKp指数、太陽風、24時間予報。"
        case "ko": return "실시간 Kp 지수, 태양풍, 24시간 예보."
        case "no": return "Live Kp-indeks, solvind og 24t prognose."
        case "pl": return "Indeks Kp na żywo, wiatr słoneczny i prognoza 24h."
        case "ru": return "Kp-индекс, солнечный ветер и прогноз на 24 часа."
        case "sv": return "Live Kp-index, solvind och 24h prognos."
        case "uk": return "Kp-індекс, сонячний вітер і прогноз на 24 години."
        case "zh": return "实时Kp指数、太阳风和24小时预报。"
        default:   return "Live Kp index, solar wind and 24h forecast."
        }
    }
}

// MARK: - Helpers

private func kpColor(_ kp: Double) -> Color {
    switch kp {
    case 7...: return .brandRed
    case 5...: return .brandOrange
    case 4...: return .brandAmber
    default:   return .brandEmerald
    }
}

private func kpLevel(_ kp: Double) -> String {
    switch kp {
    case 9...: return "G5"
    case 8...: return "G4"
    case 7...: return "G3"
    case 6...: return "G2"
    case 5...: return "G1"
    default:   return WL.quiet
    }
}

// MARK: - Provider

struct KpProvider: TimelineProvider {
    func placeholder(in context: Context) -> KpEntry {
        KpEntry(date: Date(), kp: 2.3, windSpeed: 420,
                stormLevel: WL.quiet, stormColor: .green,
                lastUpdated: "--:--", forecast: [], isStale: false)
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
                if let v = last["estimated_kp"] as? Double, v > 0 { kp = v }
                else if let v = last["kp_index"] as? Double     { kp = v }
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
            let isStale = kp <= 0 && wind <= 0
            completion(KpEntry(
                date: Date(), kp: max(kp, 0), windSpeed: max(wind, 0),
                stormLevel: isStale ? "---" : kpLevel(kp), stormColor: isStale ? .gray : kpColor(kp),
                lastUpdated: isStale ? "---" : fmt.string(from: Date()),
                forecast: forecastPoints, isStale: isStale
            ))
        }
    }
}

// MARK: - Forecast bars

struct ForecastBarsView: View {
    let points: [ForecastPoint]
    let barHeight: CGFloat

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .bottomLeading) {
                // Bars
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
                // G1 storm threshold line at Kp = 5
                let labelHeight: CGFloat = 11
                let thresholdY = geo.size.height - labelHeight - CGFloat(5.0 / 9.0) * barHeight
                Path { p in
                    p.move(to: CGPoint(x: 0, y: thresholdY))
                    p.addLine(to: CGPoint(x: geo.size.width, y: thresholdY))
                }
                .stroke(style: StrokeStyle(lineWidth: 1, dash: [3, 3]))
                .foregroundColor(Color.brandOrange.opacity(0.5))

                Text("G1")
                    .font(.system(size: 6, weight: .bold))
                    .foregroundColor(.brandOrange.opacity(0.7))
                    .position(x: 9, y: thresholdY - 5)
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
                if entry.isStale {
                    Label("No signal", systemImage: "wifi.slash")
                        .font(.system(size: 8.5))
                        .foregroundColor(.orange.opacity(0.7))
                } else {
                    Label("\(entry.windSpeed) km/s", systemImage: "wind")
                        .font(.system(size: 8.5))
                        .foregroundColor(Color.white.opacity(0.4))
                }
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
                    Text(WL.kpIndex)
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
                        .foregroundColor(.brandEmerald.opacity(0.75))
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
                Text(WL.forecast24h)
                    .font(.system(size: 7.5, weight: .bold, design: .rounded))
                    .foregroundColor(Color.white.opacity(0.35))
                    .tracking(0.8)

                if entry.forecast.isEmpty {
                    Spacer()
                    Text(WL.noData)
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

// MARK: - Large Widget

struct StormWidgetLargeView: View {
    let entry: KpEntry

    var kpFraction: Double { min(entry.kp / 9.0, 1.0) }

    private var gScale: String {
        switch entry.kp {
        case 9...: return "G5 — Extreme"
        case 8...: return "G4 — Severe"
        case 7...: return "G3 — Strong"
        case 6...: return "G2 — Moderate"
        case 5...: return "G1 — Minor"
        default:   return WL.quiet
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {

            // Header
            HStack {
                HStack(spacing: 5) {
                    Image(systemName: "bolt.fill")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(entry.stormColor)
                    Text("STORM WATCHER")
                        .font(.system(size: 9, weight: .bold, design: .rounded))
                        .foregroundColor(Color.white.opacity(0.35))
                        .tracking(1)
                }
                Spacer()
                Label(entry.lastUpdated, systemImage: "clock")
                    .font(.system(size: 9))
                    .foregroundColor(Color.white.opacity(0.25))
            }
            .padding(.bottom, 10)

            // Current Kp + ring
            HStack(alignment: .center, spacing: 16) {
                ZStack {
                    Circle()
                        .stroke(entry.stormColor.opacity(0.15), lineWidth: 8)
                    Circle()
                        .trim(from: 0, to: CGFloat(kpFraction))
                        .stroke(entry.stormColor, style: StrokeStyle(lineWidth: 8, lineCap: .round))
                        .rotationEffect(.degrees(-90))
                    VStack(spacing: 0) {
                        Text(String(format: "%.1f", entry.kp))
                            .font(.system(size: 36, weight: .heavy, design: .rounded))
                            .foregroundColor(entry.stormColor)
                        Text("Kp")
                            .font(.system(size: 11, weight: .semibold, design: .rounded))
                            .foregroundColor(Color.white.opacity(0.4))
                    }
                }
                .frame(width: 90, height: 90)

                VStack(alignment: .leading, spacing: 6) {
                    Text(gScale)
                        .font(.system(size: 14, weight: .bold, design: .rounded))
                        .foregroundColor(entry.stormColor)
                    VStack(alignment: .leading, spacing: 4) {
                        Label("\(entry.windSpeed) km/s", systemImage: "wind")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.brandEmerald.opacity(0.75))
                        Label(WL.kpIndex, systemImage: "waveform.path.ecg")
                            .font(.system(size: 11))
                            .foregroundColor(Color.white.opacity(0.35))
                    }
                }
                Spacer()
            }
            .padding(.bottom, 14)

            // Kp scale bar
            VStack(alignment: .leading, spacing: 4) {
                Text("Kp SCALE")
                    .font(.system(size: 7.5, weight: .bold, design: .rounded))
                    .foregroundColor(Color.white.opacity(0.3))
                    .tracking(0.8)
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        LinearGradient(
                            colors: [.brandEmerald, .brandAmber, .brandOrange, .brandRed, Color(hex: "#7c3aed")],
                            startPoint: .leading, endPoint: .trailing
                        )
                        .frame(height: 6)
                        .clipShape(Capsule())
                        .opacity(0.4)
                        LinearGradient(
                            colors: [.brandEmerald, .brandAmber, .brandOrange, .brandRed, Color(hex: "#7c3aed")],
                            startPoint: .leading, endPoint: .trailing
                        )
                        .frame(width: geo.size.width * CGFloat(kpFraction), height: 6)
                        .clipShape(Capsule())
                        Circle()
                            .fill(entry.stormColor)
                            .frame(width: 10, height: 10)
                            .offset(x: geo.size.width * CGFloat(kpFraction) - 5)
                    }
                }
                .frame(height: 10)
                HStack {
                    Text("0").font(.system(size: 8)).foregroundColor(Color.white.opacity(0.2))
                    Spacer()
                    Text("G1").font(.system(size: 8)).foregroundColor(.brandOrange.opacity(0.7))
                    Spacer()
                    Text("G3").font(.system(size: 8)).foregroundColor(.brandRed.opacity(0.7))
                    Spacer()
                    Text("9").font(.system(size: 8)).foregroundColor(Color.white.opacity(0.2))
                }
            }
            .padding(.bottom, 14)

            // 24h forecast bars
            VStack(alignment: .leading, spacing: 6) {
                Text(WL.forecast24h)
                    .font(.system(size: 7.5, weight: .bold, design: .rounded))
                    .foregroundColor(Color.white.opacity(0.3))
                    .tracking(0.8)
                if entry.forecast.isEmpty {
                    Text(WL.noData)
                        .font(.system(size: 11))
                        .foregroundColor(Color.white.opacity(0.2))
                        .frame(maxWidth: .infinity)
                } else {
                    ForecastBarsView(points: entry.forecast, barHeight: 70)
                }
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Lock Screen: Circular

@available(iOS 16.0, *)
struct StormWidgetCircularView: View {
    let entry: KpEntry

    var body: some View {
        ZStack {
            Circle()
                .stroke(entry.stormColor.opacity(0.25), lineWidth: 3)
            VStack(spacing: 0) {
                Image(systemName: "bolt.fill")
                    .font(.system(size: 8, weight: .bold))
                    .foregroundColor(entry.stormColor)
                Text(String(format: "%.1f", entry.kp))
                    .font(.system(size: 22, weight: .heavy, design: .rounded))
                    .foregroundColor(entry.stormColor)
                    .minimumScaleFactor(0.6)
                Text("Kp")
                    .font(.system(size: 8, weight: .semibold, design: .rounded))
                    .foregroundColor(.secondary)
            }
        }
    }
}

// MARK: - Lock Screen: Rectangular

@available(iOS 16.0, *)
struct StormWidgetRectangularView: View {
    let entry: KpEntry

    var body: some View {
        HStack(spacing: 8) {
            VStack(alignment: .leading, spacing: 1) {
                HStack(spacing: 3) {
                    Image(systemName: "bolt.fill")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundColor(entry.stormColor)
                    Text("KP INDEX")
                        .font(.system(size: 8, weight: .bold, design: .rounded))
                        .foregroundColor(.secondary)
                        .tracking(0.5)
                }
                Text(String(format: "%.1f", entry.kp))
                    .font(.system(size: 28, weight: .heavy, design: .rounded))
                    .foregroundColor(entry.stormColor)
                    .minimumScaleFactor(0.6)
                Text(entry.stormLevel)
                    .font(.system(size: 9, weight: .bold, design: .rounded))
                    .foregroundColor(entry.stormColor)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 3) {
                Label("\(entry.windSpeed)", systemImage: "wind")
                    .font(.system(size: 9, weight: .medium))
                    .foregroundColor(.secondary)
                Text("km/s")
                    .font(.system(size: 8))
                    .foregroundColor(.secondary)
                Spacer()
                Text(entry.lastUpdated)
                    .font(.system(size: 8))
                    .foregroundColor(.secondary)
            }
        }
    }
}

// MARK: - Lock Screen: Inline

@available(iOS 16.0, *)
struct StormWidgetInlineView: View {
    let entry: KpEntry

    var body: some View {
        Label(
            "Kp \(String(format: "%.1f", entry.kp))  \(entry.stormLevel)  \(entry.windSpeed) km/s",
            systemImage: "bolt.fill"
        )
    }
}

// MARK: - Entry View

struct StormWidgetEntryView: View {
    let entry: KpEntry
    @Environment(\.widgetFamily) var family

    private var deepLink: URL? {
        switch family {
        case .systemSmall: return URL(string: "stormwatcher://dashboard")
        default:           return URL(string: "stormwatcher://forecast")
        }
    }

    var body: some View {
        Group {
            if #available(iOS 16.0, *) {
                switch family {
                case .accessoryCircular:
                    StormWidgetCircularView(entry: entry)
                case .accessoryRectangular:
                    StormWidgetRectangularView(entry: entry)
                case .accessoryInline:
                    StormWidgetInlineView(entry: entry)
                case .systemLarge:
                    StormWidgetLargeView(entry: entry)
                case .systemSmall:
                    StormWidgetSmallView(entry: entry)
                default:
                    StormWidgetMediumView(entry: entry)
                }
            } else {
                if family == .systemSmall {
                    StormWidgetSmallView(entry: entry)
                } else if family == .systemLarge {
                    StormWidgetLargeView(entry: entry)
                } else {
                    StormWidgetMediumView(entry: entry)
                }
            }
        }
        .widgetBackground(.brandNavy)
        .widgetURL(deepLink)
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
        .description(WL.widgetDescription)
        .supportedFamilies(StormWidget.supportedFamilies)
    }

    private static var supportedFamilies: [WidgetFamily] {
        if #available(iOS 16.0, *) {
            return [.systemSmall, .systemMedium, .systemLarge, .accessoryCircular, .accessoryRectangular, .accessoryInline]
        }
        return [.systemSmall, .systemMedium, .systemLarge]
    }
}

@main
struct StormWidgetBundle: WidgetBundle {
    var body: some Widget {
        StormWidget()
        if #available(iOS 16.2, *) {
            StormLiveActivity()
        }
    }
}
