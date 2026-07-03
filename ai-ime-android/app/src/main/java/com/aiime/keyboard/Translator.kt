package com.aiime.keyboard

/**
 * 离线演示翻译（与 Windows 版一致）。正式版可接入云端 API。
 */
object Translator {

    data class Result(
        val original: String,
        val translated: String,
        val sourceLang: String,
        val targetLang: String,
        val engine: String = "demo"
    )

    private val demoToZh = mapOf(
        "hey! nice game earlier, want to team up again?" to "嘿！刚才那局打得不错，要不要再来一局？",
        "gg! you're really good at this." to "打得好！你真的很厉害。",
        "where are you from?" to "你是哪里人？",
        "thanks for the help!" to "谢谢你的帮助！",
        "let's go!" to "冲啊！",
        "hello!" to "你好！",
        "hi!" to "嗨！",
        "good game" to "打得好",
        "nice" to "不错",
        "こんにちは！" to "你好！",
        "すみません、一緒にプレイしませんか？" to "不好意思，要不要一起玩？",
        "上手ですね！また一緒にやりましょう。" to "好厉害！下次再一起玩吧。",
    )

    private val demoFromZh = mapOf(
        "你好！我也玩得很开心。" to mapOf("en" to "Hi! I had a great time too.", "ja" to "こんにちは！私も楽しかったです。"),
        "好的，再来一局吧。" to mapOf("en" to "Sure, let's play another round.", "ja" to "はい、もう一局やりましょう。"),
        "谢谢，你也很厉害。" to mapOf("en" to "Thanks, you're awesome too.", "ja" to "ありがとう、あなたもすごいです。"),
        "我是中国人，英语不太好。" to mapOf("en" to "I'm from China, my English isn't great.", "ja" to "中国人です、日本語はあまり得意ではありません。"),
        "没问题，一起加油！" to mapOf("en" to "No problem, let's do this!", "ja" to "大丈夫、一緒に頑張りましょう！"),
        "可以，加我吧。" to mapOf("en" to "Sure, add me.", "ja" to "いいですよ、追加してください。"),
    )

    fun detectLanguage(text: String): String {
        val t = text.trim()
        if (t.isEmpty()) return "unknown"
        if (t.any { it in '\u4e00'..'\u9fff' }) return "zh-cn"
        if (t.any { it in '\u3040'..'\u30ff' }) return "ja"
        if (t.any { it in '\uac00'..'\ud7af' }) return "ko"
        return if (t.any { it.isLetter() }) "en" else "unknown"
    }

    fun translateIncoming(text: String): Result {
        val key = text.trim().lowercase()
        val zh = demoToZh.entries.find { it.key.lowercase() == key }?.value
            ?: demoToZh.entries.find { key.contains(it.key.lowercase()) }?.value
            ?: if (detectLanguage(text) == "zh-cn") text else "（演示）$text → 中文对照需接入翻译 API"
        return Result(text, zh, detectLanguage(text), "zh-cn")
    }

    fun translateOutgoing(chinese: String, targetLang: String = "en"): Result {
        val lang = targetLang.lowercase().substringBefore('-')
        val hit = demoFromZh[chinese.trim()]
        val translated = hit?.get(lang)
            ?: if (lang == "en") "（Demo）$chinese" else "（デモ）$chinese"
        return Result(chinese, translated, "zh-cn", lang)
    }

    fun bilingualSend(chinese: String, targetLang: String = "en"): String {
        val r = translateOutgoing(chinese, targetLang)
        return "${r.translated}\n（$chinese）"
    }
}
