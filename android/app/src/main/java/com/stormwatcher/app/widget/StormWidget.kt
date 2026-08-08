package com.stormwatcher.app.widget

import android.content.Context
import android.content.Intent
import androidx.core.net.toUri
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.LocalContext
import androidx.glance.LocalSize
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.SizeMode
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.action.clickable
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxHeight
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.size
import androidx.glance.layout.width
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import com.stormwatcher.app.R
import android.text.format.DateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

/**
 * Home-screen widget: current Kp, storm level, solar wind and the next 24h of
 * forecast bars. The Android counterpart of the iOS StormWidget — same data
 * cascade (see [KpSource]), same colour bands, same deep links.
 *
 * **[SizeMode.Exact], not Responsive.** Responsive hands the composition the
 * *bucket* size, not the cell the launcher actually gave us, and every bucket
 * that does not match leaves dead space: One UI's 4x2 is 401x216dp, which no
 * bucket short of a 250x250 one covers, so the widget composed for 120dp of
 * height and sat in a 216dp frame with the bottom half empty. Exact reports the
 * real DpSize, so the layouts below can size type and bars from it. The cost is
 * one composition per launcher size instead of one per bucket — negligible here,
 * since [KpSource] caches and the widget updates twice an hour.
 *
 * Android has no lock-screen widget families, so the six iOS sizes collapse to
 * four responsive layouts driven by the measured cell.
 */
class StormWidget : GlanceAppWidget() {

    override val sizeMode = SizeMode.Exact

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        // Runs off the main thread; the launcher waits for the first composition.
        val reading = KpSource.load(context)
        provideContent { WidgetBody(reading) }
    }
}

// MARK: - Brand colours (same hexes as the iOS widget and the web design system)

private val BrandEmerald = Color(0xFF10B981) // aurora / quiet Kp
private val BrandAmber = Color(0xFFEAB308)   // unsettled Kp 4+
private val BrandOrange = Color(0xFFF97316)  // storm Kp 5+
private val BrandRed = Color(0xFFEF4444)     // severe storm Kp 7+
private val White = Color(0xFFFFFFFF)

/**
 * Widget text sits on a near-black card behind a wallpaper of unknown brightness,
 * so the dim end of the scale needs more alpha than it would in-app. These are
 * the floor: nothing readable goes below [Faint].
 */
private val Label = White.copy(alpha = 0.55f)
private val Faint = White.copy(alpha = 0.42f)

/** Hard-stop bands matching the app's KpGauge: green <4, yellow 4-5, orange 5-7, red 7-9. */
private fun kpColor(kp: Double): Color = when {
    kp >= 7 -> BrandRed
    kp >= 5 -> BrandOrange
    kp >= 4 -> BrandAmber
    else -> BrandEmerald
}

private fun gLevel(context: Context, kp: Double): String = when {
    kp >= 9 -> "G5"
    kp >= 8 -> "G4"
    kp >= 7 -> "G3"
    kp >= 6 -> "G2"
    kp >= 5 -> "G1"
    else -> context.getString(R.string.widget_quiet)
}

/** "G3 — Strong" where there is room for it; the plain quiet label below G1. */
private fun gLevelWithAdjective(context: Context, kp: Double): String {
    val adjective = when {
        kp >= 9 -> R.string.widget_storm_extreme
        kp >= 8 -> R.string.widget_storm_severe
        kp >= 7 -> R.string.widget_storm_strong
        kp >= 6 -> R.string.widget_storm_moderate
        kp >= 5 -> R.string.widget_storm_minor
        else -> return context.getString(R.string.widget_quiet)
    }
    return "${gLevel(context, kp)} — ${context.getString(adjective)}"
}

private fun formatKp(kp: Double): String = String.format(Locale.US, "%.1f", kp)

// MARK: - Layout selection

/**
 * Breakpoints are measured cell sizes, not bucket names. One UI at density 2.8
 * reports 4x2 as 401x216dp and 2x2 as roughly 168x216dp, so width alone
 * separates the narrow column from the wide layouts and height picks the rest.
 */
private const val NARROW_DP = 210f
private const val SHORT_DP = 130f
private const val TALL_DP = 290f

@Composable
private fun WidgetBody(reading: KpSource.Reading) {
    val context = LocalContext.current
    val size = LocalSize.current
    val kp = reading.kp.coerceAtLeast(0.0)
    val color = if (reading.isStale) Color(0xFF9CA3AF) else kpColor(kp)

    val w = size.width.value
    val h = size.height.value

    // Narrow shapes open the dashboard, the wide ones open the forecast — same
    // split as the iOS widget's widgetURL.
    val deepLink = if (w < NARROW_DP) "stormwatcher://dashboard" else "stormwatcher://forecast"
    val open = actionStartActivity(
        Intent(Intent.ACTION_VIEW, deepLink.toUri()).setPackage(context.packageName)
    )

    Box(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(ImageProvider(R.drawable.storm_widget_background))
            .clickable(open)
    ) {
        when {
            w < NARROW_DP -> SmallLayout(reading, kp, color, size)
            h < SHORT_DP -> CompactLayout(reading, kp, color)
            h < TALL_DP -> MediumLayout(reading, kp, color, size)
            else -> LargeLayout(reading, kp, color, size)
        }
    }
}

// MARK: - Layouts

/** 2x2 and taller narrow cells: one column, everything stacked. */
@Composable
private fun SmallLayout(reading: KpSource.Reading, kp: Double, color: Color, size: DpSize) {
    val context = LocalContext.current
    val inner = size.height.value - 24f
    val kpFont = (inner * 0.22f).toInt().coerceIn(28, 46)
    val barMax = (inner * 0.20f).toInt().coerceIn(14, 40)

    // Six children, not eleven: gaps are padding on the element that follows and
    // the forecast is one nested Column. See [KpScaleBar] for why ten is the wall.
    Column(modifier = GlanceModifier.fillMaxSize().padding(12.dp)) {
        Header(color, label = context.getString(R.string.widget_kp_index), fontSize = 8)
        Row(
            modifier = GlanceModifier.padding(top = 2.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                formatKp(kp),
                style = TextStyle(color = ColorProvider(color), fontSize = kpFont.sp, fontWeight = FontWeight.Bold)
            )
            Spacer(GlanceModifier.width(6.dp))
            StormBadge(context, kp, color, reading.isStale)
        }
        Box(modifier = GlanceModifier.padding(top = 4.dp)) { KpScaleBar(kp) }
        Spacer(GlanceModifier.defaultWeight())
        if (reading.forecast.isNotEmpty()) {
            Column {
                SectionLabel(context.getString(R.string.widget_forecast_24h))
                Box(modifier = GlanceModifier.padding(top = 3.dp)) {
                    ForecastBars(reading.forecast.take(5), barMaxHeight = barMax, barWidth = 6)
                }
            }
        }
        Box(modifier = GlanceModifier.padding(top = 4.dp)) { FooterLine(reading, fontSize = 9) }
    }
}

/** 4x1 strips: a single line, no forecast — there is only room for the reading. */
@Composable
private fun CompactLayout(reading: KpSource.Reading, kp: Double, color: Color) {
    val context = LocalContext.current
    Row(
        modifier = GlanceModifier.fillMaxSize().padding(horizontal = 14.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            formatKp(kp),
            style = TextStyle(color = ColorProvider(color), fontSize = 34.sp, fontWeight = FontWeight.Bold)
        )
        Spacer(GlanceModifier.width(10.dp))
        Column(modifier = GlanceModifier.defaultWeight()) {
            Text(
                gLevelWithAdjective(context, kp),
                style = TextStyle(color = ColorProvider(color), fontSize = 12.sp, fontWeight = FontWeight.Bold)
            )
            Spacer(GlanceModifier.height(3.dp))
            KpScaleBar(kp)
        }
        Spacer(GlanceModifier.width(10.dp))
        Column(horizontalAlignment = Alignment.End) {
            WindLine(reading, fontSize = 11)
            Spacer(GlanceModifier.height(2.dp))
            Text(
                lastUpdated(context, reading),
                style = TextStyle(color = ColorProvider(Faint), fontSize = 9.sp)
            )
        }
    }
}

/**
 * 4x2 (401x216dp on One UI). Two columns over a full-width scale bar; the
 * forecast column takes whatever height the reading column does not, so the
 * bars grow with the cell instead of leaving the bottom empty.
 */
@Composable
private fun MediumLayout(reading: KpSource.Reading, kp: Double, color: Color, size: DpSize) {
    val context = LocalContext.current
    val inner = size.height.value - 28f
    val kpFont = (inner * 0.26f).toInt().coerceIn(34, 60)
    val barMax = (inner * 0.44f).toInt().coerceIn(26, 96)

    Column(modifier = GlanceModifier.fillMaxSize().padding(14.dp)) {
        Row(modifier = GlanceModifier.fillMaxWidth().defaultWeight()) {
            Column(modifier = GlanceModifier.defaultWeight().fillMaxHeight()) {
                Header(color, label = context.getString(R.string.widget_kp_index), fontSize = 9)
                Spacer(GlanceModifier.height(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        formatKp(kp),
                        style = TextStyle(color = ColorProvider(color), fontSize = kpFont.sp, fontWeight = FontWeight.Bold)
                    )
                    Spacer(GlanceModifier.width(8.dp))
                    StormBadge(context, kp, color, reading.isStale)
                }
                Spacer(GlanceModifier.height(5.dp))
                WindLine(reading, fontSize = 12)
                Spacer(GlanceModifier.defaultWeight())
            }
            Spacer(GlanceModifier.width(14.dp))
            Column(modifier = GlanceModifier.defaultWeight().fillMaxHeight()) {
                SectionLabel(context.getString(R.string.widget_forecast_24h))
                Spacer(GlanceModifier.height(5.dp))
                if (reading.forecast.isEmpty()) {
                    Text(
                        context.getString(R.string.widget_no_data),
                        style = TextStyle(color = ColorProvider(Faint), fontSize = 11.sp)
                    )
                } else {
                    ForecastBars(reading.forecast, barMaxHeight = barMax, barWidth = 8)
                }
                Spacer(GlanceModifier.defaultWeight())
            }
        }
        KpScaleBar(kp)
        Spacer(GlanceModifier.height(6.dp))
        Row(modifier = GlanceModifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text(
                gLevelWithAdjective(context, kp),
                style = TextStyle(color = ColorProvider(color), fontSize = 11.sp, fontWeight = FontWeight.Bold)
            )
            Spacer(GlanceModifier.defaultWeight())
            Text(
                lastUpdated(context, reading),
                style = TextStyle(color = ColorProvider(Faint), fontSize = 10.sp)
            )
        }
    }
}

/** 4x4 and taller: the medium layout plus room for a bigger number and bars. */
@Composable
private fun LargeLayout(reading: KpSource.Reading, kp: Double, color: Color, size: DpSize) {
    val context = LocalContext.current
    val inner = size.height.value - 32f
    val kpFont = (inner * 0.16f).toInt().coerceIn(46, 76)
    val barMax = (inner * 0.30f).toInt().coerceIn(46, 130)

    Column(modifier = GlanceModifier.fillMaxSize().padding(16.dp)) {
        Row(modifier = GlanceModifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Header(color, label = "STORM WATCHER", fontSize = 9)
            Spacer(GlanceModifier.defaultWeight())
            Text(
                lastUpdated(context, reading),
                style = TextStyle(color = ColorProvider(Faint), fontSize = 9.sp)
            )
        }
        Spacer(GlanceModifier.defaultWeight())

        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                formatKp(kp),
                style = TextStyle(color = ColorProvider(color), fontSize = kpFont.sp, fontWeight = FontWeight.Bold)
            )
            Spacer(GlanceModifier.width(14.dp))
            Column {
                Text(
                    gLevelWithAdjective(context, kp),
                    style = TextStyle(color = ColorProvider(color), fontSize = 14.sp, fontWeight = FontWeight.Bold)
                )
                Spacer(GlanceModifier.height(4.dp))
                WindLine(reading, fontSize = 12)
            }
        }
        Spacer(GlanceModifier.defaultWeight())

        // Each labelled block is one nested Column, keeping this Column at seven
        // children. Flat, it was eleven — past the limit in [KpScaleBar], which
        // would have dropped the forecast on 4x4 as silently as the scale bar lost
        // its segments.
        Column {
            SectionLabel(context.getString(R.string.widget_kp_scale))
            Box(modifier = GlanceModifier.padding(top = 5.dp)) { KpScaleBar(kp) }
        }
        Spacer(GlanceModifier.defaultWeight())

        Column {
            SectionLabel(context.getString(R.string.widget_forecast_24h))
            Box(modifier = GlanceModifier.padding(top = 6.dp)) {
                if (reading.forecast.isEmpty()) {
                    Text(
                        context.getString(R.string.widget_no_data),
                        style = TextStyle(color = ColorProvider(Faint), fontSize = 11.sp)
                    )
                } else {
                    ForecastBars(reading.forecast, barMaxHeight = barMax, barWidth = 10)
                }
            }
        }
    }
}

// MARK: - Pieces

@Composable
private fun Header(color: Color, label: String, fontSize: Int) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Image(
            provider = ImageProvider(R.drawable.ic_widget_bolt),
            contentDescription = null,
            modifier = GlanceModifier.size((fontSize + 2).dp),
            colorFilter = androidx.glance.ColorFilter.tint(ColorProvider(color))
        )
        Spacer(GlanceModifier.width(4.dp))
        Text(
            label,
            style = TextStyle(
                color = ColorProvider(Label),
                fontSize = fontSize.sp,
                fontWeight = FontWeight.Bold
            )
        )
    }
}

@Composable
private fun SectionLabel(text: String) {
    Text(
        text,
        style = TextStyle(
            color = ColorProvider(Label),
            fontSize = 9.sp,
            fontWeight = FontWeight.Bold
        )
    )
}

@Composable
private fun StormBadge(context: Context, kp: Double, color: Color, isStale: Boolean) {
    val label = if (isStale) "---" else gLevel(context, kp)
    Box(
        modifier = GlanceModifier
            .background(ColorProvider(color.copy(alpha = 0.18f)))
            .cornerRadius(8.dp)
            .padding(horizontal = 7.dp, vertical = 2.dp)
    ) {
        Text(label, style = TextStyle(color = ColorProvider(color), fontSize = 11.sp, fontWeight = FontWeight.Bold))
    }
}

@Composable
private fun WindLine(reading: KpSource.Reading, fontSize: Int) {
    val context = LocalContext.current
    val text = if (reading.isStale || reading.wind < 0) {
        context.getString(R.string.widget_no_signal)
    } else {
        "${reading.wind} km/s"
    }
    val color = if (reading.isStale) BrandOrange.copy(alpha = 0.7f) else BrandEmerald
    Text(text, style = TextStyle(color = ColorProvider(color), fontSize = fontSize.sp))
}

@Composable
private fun FooterLine(reading: KpSource.Reading, fontSize: Int) {
    val context = LocalContext.current
    Row(modifier = GlanceModifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        WindLine(reading, fontSize = fontSize)
        Spacer(GlanceModifier.defaultWeight())
        Text(
            lastUpdated(context, reading),
            style = TextStyle(color = ColorProvider(Faint), fontSize = fontSize.sp)
        )
    }
}

private fun lastUpdated(context: Context, reading: KpSource.Reading): String =
    if (reading.isStale) "---" else DateFormat.getTimeFormat(context).format(Date())

/**
 * Forecast bars, one per 3-hour bin, height proportional to Kp on the same 0-9
 * axis the gauge uses. Glance has no canvas, so a bar is a coloured [Box] whose
 * height is computed here.
 */
@Composable
private fun ForecastBars(
    points: List<KpSource.ForecastPoint>,
    barMaxHeight: Int,
    barWidth: Int,
) {
    val cal = Calendar.getInstance()
    Row(
        modifier = GlanceModifier.fillMaxWidth().height((barMaxHeight + 14).dp),
        verticalAlignment = Alignment.Bottom
    ) {
        points.forEach { point ->
            val h = ((point.kp / 9.0) * barMaxHeight).toInt().coerceAtLeast(3)
            cal.timeInMillis = point.timeMillis
            Column(
                modifier = GlanceModifier.defaultWeight(),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Box(
                    modifier = GlanceModifier
                        .width(barWidth.dp)
                        .height(h.dp)
                        .background(ColorProvider(kpColor(point.kp)))
                        .cornerRadius(3.dp)
                ) {}
                Spacer(GlanceModifier.height(3.dp))
                Text(
                    cal.get(Calendar.HOUR_OF_DAY).toString(),
                    style = TextStyle(color = ColorProvider(Faint), fontSize = 8.sp)
                )
            }
        }
    }
}

/**
 * Static 0-9 track with the current value filled in, the Glance equivalent of the
 * iOS scale bar (dim full-width gradient, bright fill, marker dot).
 *
 * **Exactly [SEGMENTS] bars, and that ceiling is not cosmetic.** A Glance
 * container maps onto one of a fixed set of generated RemoteViews layouts, and
 * those top out at ten children; hand it more and the extras are dropped without
 * an exception or a log line. An earlier 18-segment version rendered as five
 * bars stretched across the full width — at Kp 5.7 it read "mostly green", the
 * opposite of a G1 storm. One segment per Kp point keeps this under the limit
 * and makes each bar mean something. Glance has no fractional widths, so a
 * segment is the smallest step available; count, not width, carries the value.
 */
private const val SEGMENTS = 9

@Composable
private fun KpScaleBar(kp: Double) {
    // Nearest segment: at 9 steps, floor would show Kp 5.7 as a flat 5.
    val filled = Math.round(kp.coerceIn(0.0, 9.0)).toInt()
    // No cornerRadius on this Row. Glance applies it via
    // setViewOutlinePreferredRadius, which wants a background to clip against, and
    // this Row has none. It was removed while chasing a blank widget after a
    // reinstall; that did *not* turn out to be the cause (the instance stayed bound
    // and Glance kept pushing RemoteViews without an exception), so the disappearance
    // is still unexplained and most likely launcher state after a provider change.
    // The radius is left off because it was doing nothing here either way.
    Row(modifier = GlanceModifier.fillMaxWidth().height(6.dp)) {
        repeat(SEGMENTS) { i ->
            val segmentKp = i + 0.5
            val segColor = if (i < filled) kpColor(segmentKp) else kpColor(segmentKp).copy(alpha = 0.22f)
            Box(
                modifier = GlanceModifier
                    .defaultWeight()
                    .height(6.dp)
                    .background(ColorProvider(segColor))
            ) {}
        }
    }
}
