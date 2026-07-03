import Foundation

enum Translator {
    struct Result {
        let original: String
        let translated: String
        let sourceLang: String
        let targetLang: String
        let engine: String
    }

    private static let demoToZh: [String: String] = [
        "hey! nice game earlier, want to team up again?": "嘿！刚才那局打得不错，要不要再来一局？",
        "gg! you're really good at this.": "打得好！你真的很厉害。",
        "where are you from?": "你是哪里人？",
        "thanks for the help!": "谢谢你的帮助！",
        "let's go!": "冲啊！",
        "hello!": "你好！",
        "hi!": "嗨！",
        "good game": "打得好",
        "nice": "不错",
        "こんにちは！": "你好！",
        "すみません、一緒にプレイしませんか？": "不好意思，要不要一起玩？",
        "上手ですね！また一緒にやりましょう。": "好厉害！下次再一起玩吧。",
    ]

    private static let demoFromZh: [String: [String: String]] = [
        "你好！我也玩得很开心。": ["en": "Hi! I had a great time too.", "ja": "こんにちは！私も楽しかったです。"],
        "好的，再来一局吧。": ["en": "Sure, let's play another round.", "ja": "はい、もう一局やりましょう。"],
        "谢谢，你也很厉害。": ["en": "Thanks, you're awesome too.", "ja": "ありがとう、あなたもすごいです。"],
        "我是中国人，英语不太好。": ["en": "I'm from China, my English isn't great.", "ja": "中国人です、日本語はあまり得意ではありません。"],
        "没问题，一起加油！": ["en": "No problem, let's do this!", "ja": "大丈夫、一緒に頑張りましょう！"],
        "可以，加我吧。": ["en": "Sure, add me.", "ja": "いいですよ、追加してください。"],
    ]

    static func detectLanguage(_ text: String) -> String {
        let t = text.trimmingCharacters(in: .whitespacesAndNewlines)
        if t.isEmpty { return "unknown" }
        if t.unicodeScalars.contains(where: { (0x4E00...0x9FFF).contains($0.value) }) { return "zh-cn" }
        if t.unicodeScalars.contains(where: { (0x3040...0x30FF).contains($0.value) }) { return "ja" }
        if t.unicodeScalars.contains(where: { (0xAC00...0xD7AF).contains($0.value) }) { return "ko" }
        return t.contains(where: { $0.isLetter }) ? "en" : "unknown"
    }

    static func translateIncoming(_ text: String) -> Result {
        let key = text.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let zh = demoToZh[key]
            ?? demoToZh.first(where: { key.contains($0.key.lowercased()) })?.value
            ?? (detectLanguage(text) == "zh-cn" ? text : "（演示）\(text) → 中文对照需接入翻译 API")
        return Result(original: text, translated: zh, sourceLang: detectLanguage(text), targetLang: "zh-cn", engine: "demo")
    }

    static func translateOutgoing(_ chinese: String, targetLang: String = "en") -> Result {
        let lang = targetLang.lowercased().split(separator: "-").first.map(String.init) ?? "en"
        let hit = demoFromZh[chinese.trimmingCharacters(in: .whitespacesAndNewlines)]
        let translated = hit?[lang] ?? (lang == "en" ? "（Demo）\(chinese)" : "（デモ）\(chinese)")
        return Result(original: chinese, translated: translated, sourceLang: "zh-cn", targetLang: lang, engine: "demo")
    }

    static func bilingualSend(_ chinese: String, targetLang: String = "en") -> String {
        let r = translateOutgoing(chinese, targetLang: targetLang)
        return "\(r.translated)\n（\(chinese)）"
    }
}
