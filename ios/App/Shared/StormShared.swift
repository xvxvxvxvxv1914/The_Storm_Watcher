import SwiftUI

// Shared by the StormWidget (iOS widget + Live Activity), StormWatcherWatch
// (watchOS app) and StormWatchComplications targets — one PBXFileReference,
// one PBXBuildFile per target, the same arrangement KpSource.swift uses.
//
// What belongs here is anything where two surfaces disagreeing would be a bug
// the user can see: the Kp colour bands, the G-scale thresholds and the
// localized strings. CLAUDE.md already records what happens when the Kp
// cascade is copied instead of shared — this file exists so the watch does not
// become a fifth copy of the band logic.
//
// What does NOT belong here: per-surface view models and layout. A watch
// complication and a 4x2 home-screen widget have nothing useful in common.

// MARK: - Brand colours (from icon.svg / web design system)

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

// MARK: - Shared cache

let appGroupID = "group.com.stormwatcher.app"

/// How long an App Group cache entry stays usable. BGAppRefresh fires at most
/// every 15 min, so a 5-minute window means "written by the foreground app".
let sharedDataMaxAge: TimeInterval = 300

/// WidgetKit kind for the watch-face complications. Named in two targets — the
/// watch app reloads it, the complication extension declares it — so a typo in
/// either would silently stop the face from ever updating.
let watchComplicationKind = "StormWatchComplication"

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

// MARK: - Kp bands
//
// These thresholds are the visible half of the Kp contract (the fetching half
// is KpSource.swift). They must match the app's KpGauge track and both
// widgets: green <4 calm, yellow 4-5 active, orange 5-7 storm, red 7-9 severe.

func kpColor(_ kp: Double) -> Color {
    switch kp {
    case 7...: return .brandRed
    case 5...: return .brandOrange
    case 4...: return .brandAmber
    default:   return .brandEmerald
    }
}

// Hard-stop colour bands matching the app's KpGauge track (0–9 axis).
let kpScaleGradient = Gradient(stops: [
    .init(color: .brandEmerald, location: 0),
    .init(color: .brandEmerald, location: 4.0 / 9.0),
    .init(color: .brandAmber,   location: 4.0 / 9.0),
    .init(color: .brandAmber,   location: 5.0 / 9.0),
    .init(color: .brandOrange,  location: 5.0 / 9.0),
    .init(color: .brandOrange,  location: 7.0 / 9.0),
    .init(color: .brandRed,     location: 7.0 / 9.0),
    .init(color: .brandRed,     location: 1),
])

/// NOAA G-scale label, or the localized "quiet" below G1.
func kpLevel(_ kp: Double) -> String {
    switch kp {
    case 9...: return "G5"
    case 8...: return "G4"
    case 7...: return "G3"
    case 6...: return "G2"
    case 5...: return "G1"
    default:   return WL.quiet
    }
}

/// The G number alone (0 when below storm level) — for callers that need to
/// index the storm phrase tables rather than display a label.
func kpStormNumber(_ kp: Double) -> Int {
    switch kp {
    case 9...: return 5
    case 8...: return 4
    case 7...: return 3
    case 6...: return 2
    case 5...: return 1
    default:   return 0
    }
}

// MARK: - Localization
//
// Display strings only. Every surface of this app ships the same 16 languages
// (see the locale files in src/locales and res/values*/strings.xml), and these
// are the Swift copy of that set.

struct WL {
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
        case "is": return "SPÁ 24K"
        case "ja": return "24時間予報"
        case "ko": return "24시간 예보"
        case "no": return "PROGNOSE 24T"
        case "pl": return "PROGNOZA 24H"
        case "ru": return "ПРОГНОЗ 24Ч"
        case "sv": return "PROGNOS 24H"
        case "uk": return "ПРОГНОЗ 24Г"
        case "zh": return "24小时预报"
        default:   return "24H FORECAST"
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
    static var noSignal: String {
        switch lang {
        case "bg": return "Няма сигнал"
        case "da": return "Intet signal"
        case "de": return "Kein Signal"
        case "es": return "Sin señal"
        case "fi": return "Ei signaalia"
        case "fr": return "Pas de signal"
        case "is": return "Ekkert samband"
        case "ja": return "信号なし"
        case "ko": return "신호 없음"
        case "no": return "Intet signal"
        case "pl": return "Brak sygnału"
        case "ru": return "Нет сигнала"
        case "sv": return "Ingen signal"
        case "uk": return "Немає сигналу"
        case "zh": return "无信号"
        default:   return "No signal"
        }
    }
    static var kpScale: String {
        switch lang {
        case "bg": return "KP СКАЛА"
        case "da": return "KP-SKALA"
        case "de": return "KP-SKALA"
        case "es": return "ESCALA KP"
        case "fi": return "KP-ASTEIKKO"
        case "fr": return "ÉCHELLE KP"
        case "is": return "KP-KVARÐI"
        case "ja": return "KPスケール"
        case "ko": return "KP 척도"
        case "no": return "KP-SKALA"
        case "pl": return "SKALA KP"
        case "ru": return "ШКАЛА KP"
        case "sv": return "KP-SKALA"
        case "uk": return "ШКАЛА KP"
        case "zh": return "KP等级"
        default:   return "Kp SCALE"
        }
    }
    /// Solar wind — watch main screen and rectangular complication.
    static var solarWind: String {
        switch lang {
        case "bg": return "СЛЪНЧЕВ ВЯТЪР"
        case "da": return "SOLVIND"
        case "de": return "SONNENWIND"
        case "es": return "VIENTO SOLAR"
        case "fi": return "AURINKOTUULI"
        case "fr": return "VENT SOLAIRE"
        case "is": return "SÓLVINDUR"
        case "ja": return "太陽風"
        case "ko": return "태양풍"
        case "no": return "SOLVIND"
        case "pl": return "WIATR SŁONECZNY"
        case "ru": return "СОЛНЕЧНЫЙ ВЕТЕР"
        case "sv": return "SOLVIND"
        case "uk": return "СОНЯЧНИЙ ВІТЕР"
        case "zh": return "太阳风"
        default:   return "SOLAR WIND"
        }
    }
    /// Pull-to-refresh / retry affordance on the watch.
    static var refresh: String {
        switch lang {
        case "bg": return "Опресни"
        case "da": return "Opdater"
        case "de": return "Aktualisieren"
        case "es": return "Actualizar"
        case "fi": return "Päivitä"
        case "fr": return "Actualiser"
        case "is": return "Endurnýja"
        case "ja": return "更新"
        case "ko": return "새로 고침"
        case "no": return "Oppdater"
        case "pl": return "Odśwież"
        case "ru": return "Обновить"
        case "sv": return "Uppdatera"
        case "uk": return "Оновити"
        case "zh": return "刷新"
        default:   return "Refresh"
        }
    }
    // Standalone G-storm adjectives, shown as "G3 — Strong" in the large widget.
    static func stormAdjective(_ g: Int) -> String {
        let idx = max(1, min(5, g)) - 1
        let table: [String: [String]] = [
            "bg": ["Слаба", "Умерена", "Силна", "Тежка", "Екстремна"],
            "da": ["Mindre", "Moderat", "Kraftig", "Alvorlig", "Ekstrem"],
            "de": ["Gering", "Mäßig", "Stark", "Schwer", "Extrem"],
            "es": ["Menor", "Moderada", "Fuerte", "Severa", "Extrema"],
            "fi": ["Vähäinen", "Kohtalainen", "Voimakas", "Vakava", "Äärimmäinen"],
            "fr": ["Mineure", "Modérée", "Forte", "Sévère", "Extrême"],
            "is": ["Minniháttar", "Miðlungs", "Sterkur", "Alvarlegur", "Öfgafullur"],
            "ja": ["小規模", "中規模", "強", "激しい", "極端"],
            "ko": ["약함", "보통", "강함", "심각", "극심"],
            "no": ["Mindre", "Moderat", "Sterk", "Alvorlig", "Ekstrem"],
            "pl": ["Słaba", "Umiarkowana", "Silna", "Poważna", "Ekstremalna"],
            "ru": ["Слабая", "Умеренная", "Сильная", "Суровая", "Экстремальная"],
            "sv": ["Mindre", "Måttlig", "Stark", "Allvarlig", "Extrem"],
            "uk": ["Слабка", "Помірна", "Сильна", "Сувора", "Екстремальна"],
            "zh": ["小型", "中等", "强烈", "严重", "极端"],
        ]
        let en = ["Minor", "Moderate", "Strong", "Severe", "Extreme"]
        return (table[lang] ?? en)[idx]
    }
    // Full storm phrases for the Live Activity subtitle — written out per
    // language because adjective/noun agreement varies (declensions).
    static func stormSubtitle(_ g: Int) -> String {
        guard (1...5).contains(g) else {
            switch lang {
            case "bg": return "Геомагнитна активност"
            case "da": return "Geomagnetisk aktivitet"
            case "de": return "Geomagnetische Aktivität"
            case "es": return "Actividad geomagnética"
            case "fi": return "Geomagneettinen aktiivisuus"
            case "fr": return "Activité géomagnétique"
            case "is": return "Jarðsegulvirkni"
            case "ja": return "地磁気活動"
            case "ko": return "지자기 활동"
            case "no": return "Geomagnetisk aktivitet"
            case "pl": return "Aktywność geomagnetyczna"
            case "ru": return "Геомагнитная активность"
            case "sv": return "Geomagnetisk aktivitet"
            case "uk": return "Геомагнітна активність"
            case "zh": return "地磁活动"
            default:   return "Geomagnetic activity"
            }
        }
        let idx = g - 1
        let table: [String: [String]] = [
            "bg": ["Слаба буря", "Умерена буря", "Силна буря", "Тежка буря", "Екстремна буря"],
            "da": ["Mindre storm", "Moderat storm", "Kraftig storm", "Alvorlig storm", "Ekstrem storm"],
            "de": ["Kleiner Sturm", "Mäßiger Sturm", "Starker Sturm", "Schwerer Sturm", "Extremer Sturm"],
            "es": ["Tormenta menor", "Tormenta moderada", "Tormenta fuerte", "Tormenta severa", "Tormenta extrema"],
            "fi": ["Vähäinen myrsky", "Kohtalainen myrsky", "Voimakas myrsky", "Vakava myrsky", "Äärimmäinen myrsky"],
            "fr": ["Tempête mineure", "Tempête modérée", "Tempête forte", "Tempête sévère", "Tempête extrême"],
            "is": ["Minniháttar stormur", "Miðlungs stormur", "Sterkur stormur", "Alvarlegur stormur", "Öfgafullur stormur"],
            "ja": ["小規模な磁気嵐", "中規模の磁気嵐", "強い磁気嵐", "激しい磁気嵐", "極端な磁気嵐"],
            "ko": ["약한 폭풍", "보통 폭풍", "강한 폭풍", "심각한 폭풍", "극심한 폭풍"],
            "no": ["Mindre storm", "Moderat storm", "Sterk storm", "Alvorlig storm", "Ekstrem storm"],
            "pl": ["Słaba burza", "Umiarkowana burza", "Silna burza", "Poważna burza", "Ekstremalna burza"],
            "ru": ["Слабая буря", "Умеренная буря", "Сильная буря", "Суровая буря", "Экстремальная буря"],
            "sv": ["Mindre storm", "Måttlig storm", "Stark storm", "Allvarlig storm", "Extrem storm"],
            "uk": ["Слабка буря", "Помірна буря", "Сильна буря", "Сувора буря", "Екстремальна буря"],
            "zh": ["小型磁暴", "中等磁暴", "强磁暴", "严重磁暴", "极端磁暴"],
        ]
        let en = ["Minor storm", "Moderate storm", "Strong storm", "Severe storm", "Extreme storm"]
        return (table[lang] ?? en)[idx]
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
