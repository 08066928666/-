package com.aiime.translate

import android.view.inputmethod.EditorInfo
import com.yuyan.imemodule.service.ImeService

/**
 * AI 翻译输入法 — 智能翻译层
 * 叠加在语燕输入法（YuyanIme / Rime）之上：日常输入走 Rime，发送时翻译。
 */
object SmartTranslate {

    data class Result(
        val original: String,
        val translated: String,
        val sourceLang: String,
        val targetLang: String,
        val engine: String = "demo",
    )

    private val demoToZh = mapOf(
        "hey! are you free to chat later?" to "嘿！你待会有空聊会儿吗？",
        "thanks for your help yesterday!" to "谢谢你昨天的帮助！",
        "hello!" to "你好！",
        "where are you from?" to "你是哪里人？",
        "こんにちは！" to "你好！",
        "お元気ですか？" to "你好吗？",
    )

    private val demoFromZh = mapOf(
        "你好！很高兴认识你。" to mapOf("en" to "Hi! Nice to meet you.", "ja" to "こんにちは！はじめまして。"),
        "好的，没问题。" to mapOf("en" to "Sure, no problem.", "ja" to "はい、大丈夫です。"),
        "谢谢你的消息。" to mapOf("en" to "Thanks for your message.", "ja" to "メッセージありがとうございます。"),
        "我是中国人，英语不太好。" to mapOf("en" to "I'm from China, my English isn't great.", "ja" to "中国人です、日本語はあまり得意ではありません。"),
        "明天见！" to mapOf("en" to "See you tomorrow!", "ja" to "また明日！"),
    )

    fun containsChinese(text: String): Boolean =
        text.any { it in '\u4e00'..'\u9fff' }

    fun translateIncoming(text: String): Result {
        val key = text.trim().lowercase()
        val zh = demoToZh[key]
            ?: demoToZh.entries.find { key.contains(it.key) }?.value
            ?: if (containsChinese(text)) text else "（演示）$text"
        return Result(text, zh, detectLang(text), "zh-cn")
    }

    fun translateOutgoing(chinese: String, targetLang: String): Result {
        val lang = targetLang.lowercase().substringBefore('-')
        val hit = demoFromZh[chinese.trim()]
        val translated = hit?.get(lang)
            ?: if (lang == "en") "(Demo) $chinese" else "（デモ）$chinese"
        return Result(chinese, translated, "zh-cn", lang)
    }

    fun bilingualSend(chinese: String, targetLang: String, attachChinese: Boolean = true): String {
        val r = translateOutgoing(chinese, targetLang)
        return if (attachChinese) "${r.translated}\n（$chinese）" else r.translated
    }

    private fun detectLang(text: String): String {
        if (text.any { it in '\u4e00'..'\u9fff' }) return "zh-cn"
        if (text.any { it in '\u3040'..'\u30ff' }) return "ja"
        if (text.any { it in '\uac00'..'\ud7af' }) return "ko"
        return if (text.any { it.isLetter() }) "en" else "unknown"
    }

    /** 发送前：将输入框内中文行译成双语并触发发送 */
    fun translateAndSendLine(service: ImeService) {
        val line = service.getTextBeforeCursor(2000).trim()
        if (line.isEmpty()) {
            service.performEditorAction(EditorInfo.IME_ACTION_SEND)
            return
        }
        if (!containsChinese(line)) {
            service.performEditorAction(EditorInfo.IME_ACTION_SEND)
            return
        }
        val lang = SmartTranslatePrefs.targetLang(service)
        val out = bilingualSend(line, lang)
        service.deleteSurroundingText(line.length)
        service.commitText(out)
        service.performEditorAction(EditorInfo.IME_ACTION_SEND)
    }

    /** 剪贴板外文 → 插入中文对照 */
    fun translateClipboard(service: ImeService, clip: String) {
        val r = translateIncoming(clip)
        service.commitText("${r.translated}\n（原文：$clip）")
    }
}
