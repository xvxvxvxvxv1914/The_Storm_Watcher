package com.stormwatcher.app.widget

import android.content.Context
import androidx.core.content.edit
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * Kp / solar-wind / forecast fetching for the home-screen widget.
 *
 * This is the Android counterpart of ios/App/StormWidget/KpSource.swift, and both
 * mirror the JS cascade in src/services/noaaApi.ts (getKpIndex): **GFZ primary,
 * NOAA fallback**. That is not a stylistic preference. GFZ publishes stable
 * 3-hour bins; NOAA's `estimated_kp` is a per-minute estimate that swings
 * between them (0.33 -> 0.67 -> 0.33 across consecutive minutes while GFZ held
 * 0.333). A surface that reads NOAA while the app reads GFZ shows a different
 * number for the same moment — which is exactly the bug the iOS widget had until
 * 2026-07-20. There are now three implementations of this cascade; change one
 * endpoint and you must change all three.
 *
 * Unlike iOS there is no App Group here and no JS -> widget channel: the widget
 * is the only writer of this cache. It exists so that several widget instances
 * updating together hit the network once, not once each.
 */
object KpSource {
    /** -1 is the "no data" sentinel — Kp 0.0 is a legitimate ultra-quiet reading. */
    const val NO_KP: Double = -1.0
    const val NO_WIND: Int = -1

    private const val TIMEOUT_MS = 8000

    private const val PREFS = "storm_widget"

    /**
     * Kp and wind carry independent timestamps so one endpoint failing never
     * invalidates the other's cached value. Names match the iOS App Group keys.
     */
    private const val KEY_KP = "widget_kp"
    private const val KEY_KP_UPDATED = "widget_updated"
    private const val KEY_WIND = "widget_wind"
    private const val KEY_WIND_UPDATED = "widget_wind_updated"

    private const val MAX_AGE_MS = 5 * 60 * 1000L

    data class ForecastPoint(val timeMillis: Long, val kp: Double)

    data class Reading(
        val kp: Double,
        val wind: Int,
        val forecast: List<ForecastPoint>,
    ) {
        /** Both live values missing — the widget renders its "no signal" state. */
        val isStale: Boolean get() = kp < 0 && wind < 0
    }

    /**
     * Serves Kp and wind from cache while each is fresh and fetches the rest.
     * The forecast is always fetched: it is not cached because it only changes
     * every 3 hours anyway and is cheap next to being wrong.
     */
    suspend fun load(context: Context): Reading = withContext(Dispatchers.IO) {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val now = System.currentTimeMillis()

        fun isFresh(key: String): Boolean {
            val updated = prefs.getLong(key, 0L)
            return updated > 0L && now - updated < MAX_AGE_MS
        }

        // A cached Kp of 0.0 is real data, not a missing key — freshness alone
        // decides whether the cache is usable, never the value.
        val kp = if (isFresh(KEY_KP_UPDATED)) {
            prefs.getFloat(KEY_KP, NO_KP.toFloat()).toDouble()
        } else {
            fetchKp().also {
                if (it >= 0) {
                    prefs.edit { putFloat(KEY_KP, it.toFloat()); putLong(KEY_KP_UPDATED, now) }
                }
            }
        }

        val wind = if (isFresh(KEY_WIND_UPDATED)) {
            prefs.getInt(KEY_WIND, NO_WIND)
        } else {
            fetchWind().also {
                if (it >= 0) {
                    prefs.edit { putInt(KEY_WIND, it); putLong(KEY_WIND_UPDATED, now) }
                }
            }
        }

        Reading(kp = kp, wind = wind, forecast = fetchForecast())
    }

    // MARK: - Kp

    /** GFZ first, NOAA on any failure. Returns [NO_KP] if both fail. */
    private fun fetchKp(): Double {
        val gfz = fetchGfzKp()
        return if (gfz >= 0) gfz else fetchNoaaKp()
    }

    private fun fetchGfzKp(): Double {
        // A 24h window always contains the latest closed 3-hour bin. (The JS side
        // asks for 7 days because it also draws the history chart.)
        val fmt = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC") // GFZ rejects fractional seconds
        }
        val end = Date()
        val start = Date(end.time - 24 * 60 * 60 * 1000L)
        val url = "https://kp.gfz.de/app/json/" +
            "?start=${URLEncoder.encode(fmt.format(start), "UTF-8")}" +
            "&end=${URLEncoder.encode(fmt.format(end), "UTF-8")}" +
            "&index=Kp"

        val body = get(url) ?: return NO_KP
        return try {
            val values = JSONObject(body).getJSONArray("Kp")
            // Trailing bins can be null for periods GFZ has not published yet.
            for (i in values.length() - 1 downTo 0) {
                if (values.isNull(i)) continue
                val v = values.getDouble(i)
                if (v >= 0) return v
            }
            NO_KP
        } catch (_: Exception) {
            NO_KP
        }
    }

    private fun fetchNoaaKp(): Double {
        val body = get("https://services.swpc.noaa.gov/json/planetary_k_index_1m.json") ?: return NO_KP
        return try {
            val arr = JSONArray(body)
            if (arr.length() == 0) return NO_KP
            val last = arr.getJSONObject(arr.length() - 1)
            // `kp_index` first, matching the app (useKpLive.ts). `estimated_kp` is
            // NOAA's per-minute estimate and swings between the 3-hour bins
            // (0.33 → 0.67 → 0.33 while the bin holds 0.333) — reading it here
            // put a different number on the widget than on the screen next to it.
            val index = last.optDouble("kp_index", NO_KP)
            if (index >= 0) return index
            val estimated = last.optDouble("estimated_kp", NO_KP)
            if (estimated >= 0) estimated else NO_KP
        } catch (_: Exception) {
            NO_KP
        }
    }

    // MARK: - Solar wind

    private fun fetchWind(): Int {
        val body = get("https://services.swpc.noaa.gov/json/rtsw/rtsw_wind_1m.json") ?: return NO_WIND
        return try {
            val arr = JSONArray(body)
            if (arr.length() == 0) return NO_WIND
            // Newest active sample *that carries a reading*. The feed is
            // newest-first, its trailing samples are often active:false (not yet
            // validated), and any sample can be missing a speed — null, or the
            // bare `NaN` NOAA emits for dropped samples, which org.json hands
            // back as the string "NaN" and optDouble turns into Double.NaN.
            // Stopping at the newest active row and then finding it empty threw
            // away every good sample behind it.
            fun speedAt(o: JSONObject): Double? =
                o.optDouble("proton_speed", Double.NaN)
                    .takeIf { !it.isNaN() && !it.isInfinite() && it > 0 }

            var fallback: Double? = null
            for (i in 0 until arr.length()) {
                val o = arr.optJSONObject(i) ?: continue
                val s = speedAt(o) ?: continue
                if (o.optBoolean("active", false)) return s.toInt()
                if (fallback == null) fallback = s
            }
            fallback?.toInt() ?: NO_WIND
        } catch (_: Exception) {
            NO_WIND
        }
    }

    // MARK: - Forecast

    /** Next 8 three-hour bins (24h). Past rows in the feed are dropped. */
    private fun fetchForecast(): List<ForecastPoint> {
        val body = get("https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json")
            ?: return emptyList()
        return try {
            // [{time_tag: "2026-07-29T00:00:00", kp: 2.00, observed, noaa_scale}, ...]
            val fmt = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US).apply {
                timeZone = TimeZone.getTimeZone("UTC")
            }
            val arr = JSONArray(body)
            val now = System.currentTimeMillis()
            val out = ArrayList<ForecastPoint>(8)
            for (i in 0 until arr.length()) {
                if (out.size == 8) break
                val row = arr.optJSONObject(i) ?: continue
                val timeTag = row.optString("time_tag", "")
                val at = try { fmt.parse(timeTag)?.time } catch (_: Exception) { null } ?: continue
                if (at <= now) continue
                val kp = row.optDouble("kp", Double.NaN)
                if (kp.isNaN()) continue
                out.add(ForecastPoint(timeMillis = at, kp = kp))
            }
            out
        } catch (_: Exception) {
            emptyList()
        }
    }

    // MARK: - HTTP

    /** Returns the body, or null on any transport/HTTP failure. */
    private fun get(url: String): String? {
        var conn: HttpURLConnection? = null
        return try {
            conn = (URL(url).openConnection() as HttpURLConnection).apply {
                connectTimeout = TIMEOUT_MS
                readTimeout = TIMEOUT_MS
                requestMethod = "GET"
                setRequestProperty("Accept", "application/json")
            }
            if (conn.responseCode !in 200..299) return null
            conn.inputStream.bufferedReader().use { it.readText() }.ifBlank { null }
        } catch (_: Exception) {
            null
        } finally {
            conn?.disconnect()
        }
    }
}
