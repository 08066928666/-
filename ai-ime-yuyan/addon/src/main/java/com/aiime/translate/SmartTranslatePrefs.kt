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

    /** 用户已同意隐私说明 */
    fun privacyConsentAccepted(context: Context): Boolean =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getBoolean("privacy_consent", false)

    fun setPrivacyConsentAccepted(context: Context, accepted: Boolean) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit().putBoolean("privacy_consent", accepted).apply()
    }

    /** 复制即译：默认关，见 COMPLIANCE_合规与隐私.md */
    fun clipboardMonitoringEnabled(context: Context): Boolean =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getBoolean("clipboard_monitoring", false)

    fun setClipboardMonitoringEnabled(context: Context, enabled: Boolean) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit().putBoolean("clipboard_monitoring", enabled).apply()
    }

    fun cloudTranslationEnabled(context: Context): Boolean =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getBoolean("cloud_translation", false)

    fun setCloudTranslationEnabled(context: Context, enabled: Boolean) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit().putBoolean("cloud_translation", enabled).apply()
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

    fun isSensitiveClipboard(text: String): Boolean {
        val t = text.trim()
        if (t.length in 4..8 && t.all { it.isDigit() }) return true
        if (t.contains("password", ignoreCase = true) || t.contains("密码")) return true
        return false
    }
}
