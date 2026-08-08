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
 * Android has no lock-screen widget families, so the six iOS sizes collapse to
 * three responsive layouts driven by the cell size the launcher gives us.
 */
class StormWidget : GlanceAppWidget() {

    override val sizeMode = SizeMode.Responsive(
        setOf(SIZE_SMALL, SIZE_MEDIUM, SIZE_LARGE)
    )

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        // Runs off the main thread; the launcher waits for the first composition.
        val reading = KpSource.load(context)
        provideContent { WidgetBody(reading) }
    }

    companion object {
        val SIZE_SMALL = DpSize(120.dp, 120.dp)
        val SIZE_MEDIUM = DpSize(250.dp, 120.dp)
        val SIZE_LARGE = DpSize(250.dp, 250.dp)
    }
}

// MARK: - Brand colours (same hexes as the iOS widget and the web design system)

private val BrandEmerald = Color(0xFF10B981) // aurora / quiet Kp
private val BrandAmber = Color(0xFFEAB308)   // unsettled Kp 4+
private val BrandOrange = Color(0xFFF97316)  // storm Kp 5+
private val BrandRed = Color(0xFFEF4444)     // severe storm Kp 7+
private val BrandNavy = Color(0xFF0A0E27)    // deep space background
private val Muted = Color(0xFFFFFFFF)

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

/** "G3 — Strong" for the large layout; the plain quiet label below G1. */
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

// MARK: - Layout

@Composable
private fun WidgetBody(reading: KpSource.Reading) {
    val context = LocalContext.current
    val size = LocalSize.current
    val kp = reading.kp.coerceAtLeast(0.0)
    val color = if (reading.isStale) Color(0xFF9CA3AF) else kpColor(kp)

    // Small opens the dashboard, the wider layouts open the forecast — same
    // split as the iOS widget's widgetURL.
    val deepLink = if (size.width < StormWidget.SIZE_MEDIUM.width) "stormwatcher://dashboard"
                   else "stormwatcher://forecast"
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
            size.height >= StormWidget.SIZE_LARGE.height -> LargeLayout(reading, kp, color)
            size.width >= StormWidget.SIZE_MEDIUM.width -> MediumLayout(reading, kp, color)
            else -> SmallLayout(reading, kp, color)
        }
    }
}

@Composable
private fun SmallLayout(reading: KpSource.Reading, kp: Double, color: Color) {
    val context = LocalContext.current
    Column(modifier = GlanceModifier.fillMaxSize().padding(12.dp)) {
        Header(color, label = "STORM WATCHER", fontSize = 8)
        Spacer(GlanceModifier.height(2.dp))
        Text(formatKp(kp), style = TextStyle(color = ColorProvider(color), fontSize = 34.sp, fontWeight = FontWeight.Bold))
        StormBadge(context, kp, color, reading.isStale)
        Spacer(GlanceModifier.defaultWeight())
        if (reading.forecast.isNotEmpty()) {
            ForecastBars(reading.forecast.take(4), barMaxHeight = 18)
        }
        Spacer(GlanceModifier.height(4.dp))
        FooterLine(reading, small = true)
    }
}

@Composable
private fun MediumLayout(reading: KpSource.Reading, kp: Double, color: Color) {
    val context = LocalContext.current
    Row(modifier = GlanceModifier.fillMaxSize().padding(14.dp)) {
        Column(modifier = GlanceModifier.defaultWeight()) {
            Header(color, label = context.getString(R.string.widget_kp_index), fontSize = 8)
            Spacer(GlanceModifier.height(2.dp))
            Text(formatKp(kp), style = TextStyle(color = ColorProvider(color), fontSize = 38.sp, fontWeight = FontWeight.Bold))
            StormBadge(context, kp, color, reading.isStale)
            Spacer(GlanceModifier.defaultWeight())
            FooterLine(reading, small = false)
        }
        Spacer(GlanceModifier.width(12.dp))
        Column(modifier = GlanceModifier.defaultWeight()) {
            SectionLabel(context.getString(R.string.widget_forecast_24h))
            Spacer(GlanceModifier.height(4.dp))
            if (reading.forecast.isEmpty()) {
                Text(
                    context.getString(R.string.widget_no_data),
                    style = TextStyle(color = ColorProvider(Muted.copy(alpha = 0.25f)), fontSize = 10.sp)
                )
            } else {
                ForecastBars(reading.forecast, barMaxHeight = 46)
            }
        }
    }
}

@Composable
private fun LargeLayout(reading: KpSource.Reading, kp: Double, color: Color) {
    val context = LocalContext.current
    Column(modifier = GlanceModifier.fillMaxSize().padding(16.dp)) {
        Row(modifier = GlanceModifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Header(color, label = "STORM WATCHER", fontSize = 9)
            Spacer(GlanceModifier.defaultWeight())
            Text(
                lastUpdated(context, reading),
                style = TextStyle(color = ColorProvider(Muted.copy(alpha = 0.25f)), fontSize = 9.sp)
            )
        }
        Spacer(GlanceModifier.height(10.dp))

        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(formatKp(kp), style = TextStyle(color = ColorProvider(color), fontSize = 52.sp, fontWeight = FontWeight.Bold))
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
        Spacer(GlanceModifier.height(12.dp))

        SectionLabel(context.getString(R.string.widget_kp_scale))
        Spacer(GlanceModifier.height(4.dp))
        KpScaleBar(kp, color)
        Spacer(GlanceModifier.height(12.dp))

        SectionLabel(context.getString(R.string.widget_forecast_24h))
        Spacer(GlanceModifier.height(6.dp))
        if (reading.forecast.isEmpty()) {
            Text(
                context.getString(R.string.widget_no_data),
                style = TextStyle(color = ColorProvider(Muted.copy(alpha = 0.25f)), fontSize = 11.sp)
            )
        } else {
            ForecastBars(reading.forecast, barMaxHeight = 62)
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
                color = ColorProvider(Muted.copy(alpha = 0.4f)),
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
            color = ColorProvider(Muted.copy(alpha = 0.35f)),
            fontSize = 8.sp,
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
        Text(label, style = TextStyle(color = ColorProvider(color), fontSize = 10.sp, fontWeight = FontWeight.Bold))
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
    val color = if (reading.isStale) BrandOrange.copy(alpha = 0.7f) else BrandEmerald.copy(alpha = 0.75f)
    Text(text, style = TextStyle(color = ColorProvider(color), fontSize = fontSize.sp))
}

@Composable
private fun FooterLine(reading: KpSource.Reading, small: Boolean) {
    val context = LocalContext.current
    Row(modifier = GlanceModifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        WindLine(reading, fontSize = if (small) 9 else 10)
        Spacer(GlanceModifier.defaultWeight())
        Text(
            lastUpdated(context, reading),
            style = TextStyle(color = ColorProvider(Muted.copy(alpha = 0.25f)), fontSize = if (small) 9.sp else 10.sp)
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
private fun ForecastBars(points: List<KpSource.ForecastPoint>, barMaxHeight: Int) {
    val cal = Calendar.getInstance()
    Row(
        modifier = GlanceModifier.fillMaxWidth().height((barMaxHeight + 12).dp),
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
                        .width(6.dp)
                        .height(h.dp)
                        .background(ColorProvider(kpColor(point.kp).copy(alpha = 0.85f)))
                        .cornerRadius(2.dp)
                ) {}
                Spacer(GlanceModifier.height(2.dp))
                Text(
                    cal.get(Calendar.HOUR_OF_DAY).toString(),
                    style = TextStyle(color = ColorProvider(Muted.copy(alpha = 0.3f)), fontSize = 7.sp)
                )
            }
        }
    }
}

/** Static 0-9 track with the current value filled in, mirroring the iOS scale bar. */
@Composable
private fun KpScaleBar(kp: Double, color: Color) {
    val fraction = (kp / 9.0).coerceIn(0.0, 1.0)
    // Glance has no fractional widths, so the track is built from 18 half-point
    // segments and the first `filled` of them are painted.
    val segments = 18
    val filled = (fraction * segments).toInt()
    Row(modifier = GlanceModifier.fillMaxWidth().height(6.dp)) {
        repeat(segments) { i ->
            val segmentKp = (i + 0.5) * 9.0 / segments
            val segColor = if (i < filled) kpColor(segmentKp) else kpColor(segmentKp).copy(alpha = 0.18f)
            Box(
                modifier = GlanceModifier
                    .defaultWeight()
                    .height(6.dp)
                    .background(ColorProvider(segColor))
            ) {}
        }
    }
}
