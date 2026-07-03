package com.aiime.keyboard

import android.content.Context

/** 合规相关偏好，默认保守。见 ai-ime-mobile/COMPLIANCE_合规与隐私.md */
object TranslatePrefs {
    private const val PREFS = "ai_ime_translate_prefs"

    fun privacyConsentAccepted(context: Context): Boolean =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getBoolean("privacy_consent", false)

    fun setPrivacyConsentAccepted(context: Context, v: Boolean) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit().putBoolean("privacy_consent", v).apply()
    }

    fun clipboardMonitoringEnabled(context: Context): Boolean =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getBoolean("clipboard_monitoring", false)

    fun setClipboardMonitoringEnabled(context: Context, v: Boolean) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit().putBoolean("clipboard_monitoring", v).apply()
    }

    fun cloudTranslationEnabled(context: Context): Boolean =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getBoolean("cloud_translation", false)

    fun setCloudTranslationEnabled(context: Context, v: Boolean) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit().putBoolean("cloud_translation", v).apply()
    }

    fun isSensitiveClipboard(text: String): Boolean {
        val t = text.trim()
        if (t.length in 4..8 && t.all { it.isDigit() }) return true
        if (t.contains("password", ignoreCase = true) || t.contains("密码")) return true
        return false
    }
}
