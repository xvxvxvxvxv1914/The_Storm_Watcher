import WidgetKit
import SwiftUI
import ActivityKit

// Colors mirror the site's storm scale (aurora green → red).
@available(iOS 16.2, *)
private func gColor(_ g: Int) -> Color {
    switch g {
    case 5: return Color(red: 0.86, green: 0.15, blue: 0.15)
    case 4: return Color(red: 0.94, green: 0.27, blue: 0.27)
    case 3: return Color(red: 0.98, green: 0.45, blue: 0.09)
    case 2: return Color(red: 0.98, green: 0.57, blue: 0.10)
    case 1: return Color(red: 0.98, green: 0.67, blue: 0.12)
    default: return Color(red: 0.06, green: 0.72, blue: 0.51)
    }
}

@available(iOS 16.2, *)
private func gLabel(_ g: Int) -> String {
    g == 0 ? "Active" : "G\(g)"
}

@available(iOS 16.2, *)
struct StormLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: StormActivityAttributes.self) { context in
            // Lock screen / banner presentation
            HStack(spacing: 14) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Kp \(context.state.kp, specifier: "%.1f")")
                        .font(.system(size: 30, weight: .bold, design: .rounded))
                        .foregroundColor(.white)
                    Text("\(gLabel(context.state.gLevel)) · Geomagnetic storm")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.7))
                }
                Spacer()
                if let pct = context.state.auroraPct {
                    VStack(spacing: 2) {
                        Text("\(pct)%")
                            .font(.system(size: 20, weight: .bold, design: .rounded))
                            .foregroundColor(gColor(context.state.gLevel))
                        Text("aurora").font(.caption2).foregroundColor(.white.opacity(0.6))
                    }
                }
                Circle().fill(gColor(context.state.gLevel)).frame(width: 12, height: 12)
            }
            .padding()
            .activityBackgroundTint(Color.black.opacity(0.85))
            .activitySystemActionForegroundColor(.white)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Text("Kp \(context.state.kp, specifier: "%.1f")")
                        .font(.title3).bold().foregroundColor(.white)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(gLabel(context.state.gLevel))
                        .font(.title3).bold().foregroundColor(gColor(context.state.gLevel))
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text(context.state.auroraPct != nil
                         ? "Aurora \(context.state.auroraPct!)% at your location"
                         : "Geomagnetic storm in progress")
                        .font(.caption).foregroundColor(.white.opacity(0.7))
                }
            } compactLeading: {
                Text("Kp").font(.caption2).foregroundColor(gColor(context.state.gLevel))
            } compactTrailing: {
                Text("\(context.state.kp, specifier: "%.1f")")
                    .font(.caption).bold().foregroundColor(gColor(context.state.gLevel))
            } minimal: {
                Text("\(context.state.kp, specifier: "%.0f")")
                    .font(.caption2).bold().foregroundColor(gColor(context.state.gLevel))
            }
            .widgetURL(URL(string: "stormwatcher://alerts"))
        }
    }
}
