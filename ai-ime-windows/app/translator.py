from __future__ import annotations

import re
from dataclasses import dataclass

from langdetect import DetectorFactory, LangDetectException, detect

DetectorFactory.seed = 0

# 离线演示词典（无网络时兜底）
DEMO_TO_ZH = {
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
}

DEMO_FROM_ZH = {
    "你好！我也玩得很开心。": {"en": "Hi! I had a great time too.", "ja": "こんにちは！私も楽しかったです。"},
    "好的，再来一局吧。": {"en": "Sure, let's play another round.", "ja": "はい、もう一局やりましょう。"},
    "谢谢，你也很厉害。": {"en": "Thanks, you're awesome too.", "ja": "ありがとう、あなたもすごいです。"},
    "我是中国人，英语不太好。": {"en": "I'm from China, my English isn't great.", "ja": "中国人です、日本語はあまり得意ではありません。"},
    "没问题，一起加油！": {"en": "No problem, let's do this!", "ja": "大丈夫、一緒に頑張りましょう！"},
    "可以，加我吧。": {"en": "Sure, add me.", "ja": "いいですよ、追加してください。"},
}

LANG_LABELS = {
    "en": "英语",
    "ja": "日语",
    "ko": "韩语",
    "zh-cn": "中文",
    "zh-tw": "中文",
}

TARGET_CODES = {
    "en": "en",
    "ja": "ja",
    "ko": "ko",
}


@dataclass
class TranslationResult:
    original: str
    translated: str
    source_lang: str
    target_lang: str
    engine: str


def _has_chinese(text: str) -> bool:
    return bool(re.search(r"[\u4e00-\u9fff]", text))


def _normalize_lang(code: str) -> str:
    code = (code or "en").lower()
    if code.startswith("zh"):
        return "zh-cn"
    return code.split("-")[0]


def detect_language(text: str) -> str:
    text = text.strip()
    if not text:
        return "unknown"
    if _has_chinese(text):
        return "zh-cn"
    if re.search(r"[\u3040-\u30ff]", text):
        return "ja"
    if re.search(r"[\uac00-\ud7af]", text):
        return "ko"
    try:
        return _normalize_lang(detect(text))
    except LangDetectException:
        return "en" if re.search(r"[a-zA-Z]", text) else "unknown"


def _online_translate(text: str, source: str, target: str) -> str:
    from deep_translator import GoogleTranslator

    src = "zh-CN" if source.startswith("zh") else source
    tgt = "zh-CN" if target.startswith("zh") else target
    if src == tgt:
        return text
    return GoogleTranslator(source=src, target=tgt).translate(text)


def translate_to_chinese(text: str) -> TranslationResult:
    text = text.strip()
    source = detect_language(text)
    lower = text.lower()
    if lower in DEMO_TO_ZH:
        return TranslationResult(text, DEMO_TO_ZH[lower], source, "zh-cn", "demo")

    try:
        translated = _online_translate(text, source, "zh-CN")
        engine = "google"
    except Exception:
        translated = f"（{LANG_LABELS.get(source, source)}）{text}"
        engine = "fallback"

    return TranslationResult(text, translated, source, "zh-cn", engine)


def translate_from_chinese(text: str, target_lang: str) -> TranslationResult:
    text = text.strip()
    target = TARGET_CODES.get(target_lang, target_lang)
    if text in DEMO_FROM_ZH and target in DEMO_FROM_ZH[text]:
        translated = DEMO_FROM_ZH[text][target]
        return TranslationResult(text, translated, "zh-cn", target, "demo")

    try:
        translated = _online_translate(text, "zh-CN", target)
        engine = "google"
    except Exception:
        translated = f"({target}) {text}"
        engine = "fallback"

    return TranslationResult(text, translated, "zh-cn", target, engine)


def format_bilingual_send(chinese: str, foreign: str, bilingual: bool = True) -> str:
    if not bilingual:
        return foreign
    return f"{foreign}\n（{chinese}）"
