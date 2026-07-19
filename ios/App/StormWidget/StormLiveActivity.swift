import WidgetKit
import SwiftUI
import ActivityKit

// Storm severity → brand colour. G5/G2 use one-off shades between the main
// brand constants to keep the full gradient visually distinguishable.
@available(iOS 16.2, *)
private func gColor(_ g: Int) -> Color {
    switch g {
    case 5: return Color(hex: "#dc2626") // extreme — deeper than brandRed
    case 4: return .brandRed
    case 3: return .brandOrange
    case 2: return Color(hex: "#f59e0b") // moderate — between brandOrange and brandAmber
    case 1: return .brandAmber
    default: return .brandEmerald
    }
}

// Kp number colour — mirrors kpColor() in StormWidget.swift.
@available(iOS 16.2, *)
private func kpColor(_ kp: Double) -> Color {
    switch kp {
    case 7...: return .brandRed
    case 5...: return .brandOrange
    case 4...: return .brandAmber
    default:   return .brandEmerald
    }
}

@available(iOS 16.2, *)
private func gBadge(_ g: Int) -> String { g == 0 ? "ACTIVE" : "G\(g)" }

// Localized storm phrase — WL lives in StormWidget.swift (same target).
@available(iOS 16.2, *)
private func gName(_ g: Int) -> String { WL.stormSubtitle(g) }

// Reusable bits
@available(iOS 16.2, *)
private struct IconBadge: View {
    let g: Int
    var size: CGFloat = 46
    var body: some View {
        ZStack {
            Circle().fill(gColor(g).opacity(0.18))
            Circle().strokeBorder(gColor(g).opacity(0.5), lineWidth: 1.5)
            Image(systemName: "sparkles")
                .font(.system(size: size * 0.46, weight: .semibold))
                .foregroundColor(gColor(g))
        }
        .frame(width: size, height: size)
    }
}

@available(iOS 16.2, *)
private struct KpBadge: View {
    let kp: Double
    let g: Int
    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 6) {
            Text("Kp \(kp, specifier: "%.1f")")
                .font(.system(size: 26, weight: .heavy, design: .rounded))
                .foregroundColor(kpColor(kp))
            Text(gBadge(g))
                .font(.system(size: 11, weight: .bold, design: .rounded))
                .padding(.horizontal, 7).padding(.vertical, 2)
                .background(Capsule().fill(gColor(g)))
                .foregroundColor(.black)
        }
    }
}

@available(iOS 16.2, *)
private struct AuroraStat: View {
    let pct: Int
    let g: Int
    var body: some View {
        VStack(spacing: 1) {
            Text("\(pct)%")
                .font(.system(size: 22, weight: .bold, design: .rounded))
                .foregroundColor(gColor(g))
            Text("AURORA")
                .font(.system(size: 9, weight: .semibold, design: .rounded))
                .tracking(0.8)
                .foregroundColor(.white.opacity(0.5))
        }
    }
}

@available(iOS 16.2, *)
struct StormLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: StormActivityAttributes.self) { context in
            let g = context.state.gLevel
            HStack(spacing: 12) {
                IconBadge(g: g)
                VStack(alignment: .leading, spacing: 3) {
                    KpBadge(kp: context.state.kp, g: g)
                    Text(gName(g))
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(.white.opacity(0.6))
                }
                Spacer(minLength: 8)
                if let pct = context.state.auroraPct {
                    AuroraStat(pct: pct, g: g)
                }
            }
            .padding(.horizontal, 16).padding(.vertical, 14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                LinearGradient(
                    colors: [gColor(g).opacity(0.28), .clear],
                    startPoint: .leading, endPoint: .trailing
                )
            )
            .activityBackgroundTint(.brandNavy)
            .activitySystemActionForegroundColor(.white)
            // Tapping the lock-screen banner opens the alerts page (Dynamic Island
            // already had this; the lock-screen view was missing it).
            .widgetURL(URL(string: "stormwatcher://alerts"))
        } dynamicIsland: { context in
            let g = context.state.gLevel
            return DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    IconBadge(g: g, size: 38)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 2) {
                        Text(gBadge(g))
                            .font(.system(size: 13, weight: .bold, design: .rounded))
                            .foregroundColor(gColor(g))
                        if let pct = context.state.auroraPct {
                            Text("\(pct)% aurora")
                                .font(.system(size: 11)).foregroundColor(.white.opacity(0.6))
                        }
                    }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    HStack {
                        Text("Kp \(context.state.kp, specifier: "%.1f")")
                            .font(.system(size: 22, weight: .heavy, design: .rounded))
                            .foregroundColor(kpColor(context.state.kp))
                        Text(gName(g))
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.white.opacity(0.6))
                        Spacer()
                    }
                }
            } compactLeading: {
                Image(systemName: "sparkles").foregroundColor(gColor(g))
            } compactTrailing: {
                Text("\(context.state.kp, specifier: "%.1f")")
                    .font(.system(size: 14, weight: .bold, design: .rounded))
                    .foregroundColor(kpColor(context.state.kp))
            } minimal: {
                Image(systemName: "sparkles").foregroundColor(gColor(g))
            }
            .widgetURL(URL(string: "stormwatcher://alerts"))
        }
    }
}
