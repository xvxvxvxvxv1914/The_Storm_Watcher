package com.stormwatcher.app.widget

import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver

/**
 * Broadcast entry point for [StormWidget]. Everything it does — including the
 * network fetch — happens inside `provideGlance`, which Glance runs in a
 * coroutine off the main thread.
 */
class StormWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = StormWidget()
}
