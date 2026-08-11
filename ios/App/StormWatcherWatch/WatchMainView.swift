import SwiftUI

/// The whole watch app: one scrolling screen. A Kp reading is a single number
/// plus its severity, and that is what a watch is good at — the phone app keeps
/// the charts, the globe and the history.
struct WatchMainView: View {
    @Environment(WatchStore.self) private var store

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                if store.hasData {
                    kpBlock
                    stormBadge
                    windBlock
                    updatedLabel
                } else {
                    noSignal
                }
            }
            .padding(.horizontal, 4)
            .padding(.bottom, 8)
        }
        .containerBackground(Color.brandNavy.gradient, for: .navigation)
        .navigationTitle("Storm Watcher")
        .navigationBarTitleDisplayMode(.inline)
        .refreshable { await store.refresh() }
        .task { await store.refresh() }
    }

    // MARK: - Pieces

    private var kpBlock: some View {
        VStack(spacing: 0) {
            Text(WL.kpIndex)
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(.secondary)
            Text(store.kp >= 0 ? String(format: "%.1f", store.kp) : "--")
                .font(.system(size: 46, weight: .bold, design: .rounded))
                .foregroundStyle(kpColor(store.kp))
                .contentTransition(.numericText())
                .minimumScaleFactor(0.6)
                .lineLimit(1)
            kpTrack
        }
    }

    /// The same 0–9 axis and hard-stop bands as the gauge on the phone, so the
    /// two surfaces cannot disagree about what "orange" means.
    ///
    /// The gradient is laid out across the **full** track and then masked to the
    /// fill. Sizing the gradient to the fill instead squeezes all four bands
    /// into it, so a quiet Kp 1.7 painted itself green-amber-orange-red in the
    /// first 19% of the bar — every severity colour on screen during a calm hour.
    private var kpTrack: some View {
        GeometryReader { geo in
            let fraction = min(max(store.kp, 0) / 9.0, 1)
            ZStack(alignment: .leading) {
                Capsule().fill(.white.opacity(0.14))
                LinearGradient(gradient: kpScaleGradient, startPoint: .leading, endPoint: .trailing)
                    .frame(width: geo.size.width)
                    .mask(alignment: .leading) {
                        Capsule().frame(width: max(geo.size.width * fraction, 4))
                    }
            }
        }
        .frame(height: 5)
        .padding(.top, 4)
    }

    private var stormBadge: some View {
        let g = kpStormNumber(store.kp)
        return Text(g > 0 ? "\(kpLevel(store.kp)) · \(WL.stormAdjective(g))" : WL.quiet)
            .font(.system(size: 12, weight: .bold))
            .foregroundStyle(g > 0 ? .black : .white)
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(
                Capsule().fill(g > 0 ? kpColor(store.kp) : Color.white.opacity(0.12))
            )
    }

    private var windBlock: some View {
        HStack {
            Text(WL.solarWind)
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(.secondary)
            Spacer()
            Text(store.wind >= 0 ? "\(store.wind) km/s" : "--")
                .font(.system(size: 14, weight: .semibold, design: .rounded))
                .foregroundStyle(.white)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 7)
        .background(RoundedRectangle(cornerRadius: 10).fill(.white.opacity(0.08)))
    }

    @ViewBuilder
    private var updatedLabel: some View {
        if let updated = store.lastUpdated {
            Text(updated, style: .time)
                .font(.system(size: 10))
                .foregroundStyle(.tertiary)
        }
    }

    private var noSignal: some View {
        VStack(spacing: 8) {
            Image(systemName: "antenna.radiowaves.left.and.right.slash")
                .font(.system(size: 22))
                .foregroundStyle(.secondary)
            Text(WL.noSignal)
                .font(.system(size: 13, weight: .medium))
            Button(WL.refresh) { Task { await store.refresh() } }
                .font(.system(size: 12))
        }
        .padding(.top, 20)
    }
}
