package com.aiime.translate

import android.content.ClipboardManager
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.view.LayoutInflater
import android.view.View
import android.widget.LinearLayout
import android.widget.TextView

/**
 * 歌词式双行字幕条：复制外文 → 原文（灰）+ 中文（白）
 * 用于语燕 InputView 顶部或宿主 App。
 */
class LyricSubtitleBar(context: Context) : LinearLayout(context) {

    private val originalView: TextView
    private val translatedView: TextView
    private val fadeHandler = Handler(Looper.getMainLooper())
    private var fadeRunnable: Runnable? = null

    init {
        orientation = VERTICAL
        setBackgroundColor(0xFF1E1E20.toInt())
        setPadding(24, 16, 24, 16)
        visibility = GONE

        originalView = TextView(context).apply {
            setTextColor(0xFF8E8E93.toInt())
            textSize = 12f
            maxLines = 2
        }
        translatedView = TextView(context).apply {
            setTextColor(0xFFFFFFFF.toInt())
            textSize = 16f
            maxLines = 3
        }
        addView(originalView)
        addView(translatedView)
    }

    fun show(original: String, translated: String) {
        fadeRunnable?.let { fadeHandler.removeCallbacks(it) }
        originalView.text = original
        translatedView.text = translated
        visibility = VISIBLE
        alpha = 1f
        fadeRunnable = Runnable { animate().alpha(0.45f).setDuration(300).start() }
        fadeHandler.postDelayed(fadeRunnable!!, 8000)
    }

    fun hide() {
        fadeRunnable?.let { fadeHandler.removeCallbacks(it) }
        visibility = GONE
        alpha = 1f
    }
}

/** 剪贴板监听 → 更新歌词条（不自动插入输入框） */
class ClipboardLyricWatcher(
    private val context: Context,
    private val bar: LyricSubtitleBar,
) {
    private var lastSeen = ""
    private val mainHandler = Handler(Looper.getMainLooper())
    private val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager

    private val listener = ClipboardManager.OnPrimaryClipChangedListener {
        mainHandler.post { check() }
    }

    fun start() {
        check()
        clipboard.addPrimaryClipChangedListener(listener)
    }

    fun stop() {
        clipboard.removePrimaryClipChangedListener(listener)
    }

    fun check() {
        val text = clipboard.primaryClip?.getItemAt(0)?.coerceToText(context)?.toString()?.trim()
        if (text.isNullOrEmpty() || text == lastSeen) return
        lastSeen = text
        if (SmartTranslate.containsChinese(text)) {
            bar.hide()
            return
        }
        val r = SmartTranslate.translateIncoming(text)
        bar.show(r.original, r.translated)
    }

    /** 手动触发：译剪贴板并插入输入框 */
    fun translateAndInsert(commit: (String) -> Unit) {
        val text = clipboard.primaryClip?.getItemAt(0)?.coerceToText(context)?.toString()?.trim()
        if (text.isNullOrEmpty()) return
        lastSeen = text
        val r = SmartTranslate.translateIncoming(text)
        bar.show(r.original, r.translated)
        commit("${r.translated}\n（原文：$text）")
    }
}

/** 发送预览条文案 */
object SendPreviewFormatter {
    fun format(targetLang: String, chinese: String): Pair<String, String> {
        val r = SmartTranslate.translateOutgoing(chinese, targetLang)
        val langLabel = when (targetLang) {
            "ja" -> "日语"
            "ko" -> "韩语"
            else -> "英语"
        }
        return "将发送（$langLabel）：${r.translated}" to "（$chinese）"
    }
}
