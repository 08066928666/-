package com.aiime.translate

import android.content.Context

/** 智能翻译偏好（独立于语燕原有设置） */
object SmartTranslatePrefs {
    private const val PREFS = "ai_ime_smart_translate"

    fun isEnabled(context: Context): Boolean =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getBoolean("enabled", true)

    fun setEnabled(context: Context, enabled: Boolean) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit().putBoolean("enabled", enabled).apply()
    }

    fun targetLang(context: Context): String =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString("target_lang", "en") ?: "en"

    fun cycleTargetLang(context: Context): String {
        val next = when (targetLang(context)) {
            "en" -> "ja"
            "ja" -> "ko"
            else -> "en"
        }
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit().putString("target_lang", next).apply()
        return next
    }
}
