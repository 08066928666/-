package com.aiime.keyboard

import android.content.ClipboardManager
import android.content.Context
import android.inputmethodservice.InputMethodService
import android.inputmethodservice.Keyboard
import android.inputmethodservice.KeyboardView
import android.view.View
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputConnection
import android.widget.Button
import android.widget.HorizontalScrollView
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import com.aiime.keyboard.R

/**
 * 系统级输入法服务 — 安装 APK 后在「设置 → 语言与输入法」中启用
 */
class AiImeService : InputMethodService(), KeyboardView.OnKeyboardActionListener {

    private lateinit var engine: PinyinEngine
    private var keyboardView: KeyboardView? = null
    private var composing = StringBuilder()
    private var smartMode = true
    private var targetLang = "en"
    private var symbolMode = false

    private var candidateBar: HorizontalScrollView? = null
    private var candidateRow: LinearLayout? = null
    private var previewBar: TextView? = null
    private var modeLabel: TextView? = null

    override fun onCreate() {
        super.onCreate()
        engine = PinyinEngine(this)
    }

    override fun onCreateInputView(): View {
        val root = layoutInflater.inflate(R.layout.keyboard_view, null)
        keyboardView = root.findViewById(R.id.keyboard)
        candidateBar = root.findViewById(R.id.candidate_bar)
        candidateRow = root.findViewById(R.id.candidate_row)
        previewBar = root.findViewById(R.id.preview_bar)
        modeLabel = root.findViewById(R.id.mode_label)

        keyboardView?.apply {
            keyboard = Keyboard(this@AiImeService, R.xml.qwerty)
            isPreviewEnabled = false
            setOnKeyboardActionListener(this@AiImeService)
        }

        root.findViewById<Button>(R.id.btn_smart).setOnClickListener {
            smartMode = !smartMode
            updateModeLabel()
            updatePreview()
        }
        root.findViewById<Button>(R.id.btn_lang).setOnClickListener {
            targetLang = when (targetLang) {
                "en" -> "ja"
                "ja" -> "ko"
                else -> "en"
            }
            updateModeLabel()
            updatePreview()
        }
        root.findViewById<Button>(R.id.btn_clip).setOnClickListener { translateClipboard() }

        updateModeLabel()
        return root
    }

    override fun onStartInput(attribute: EditorInfo?, restarting: Boolean) {
        super.onStartInput(attribute, restarting)
        composing.clear()
        refreshCandidates()
        updatePreview()
    }

    private fun currentIc(): InputConnection? = currentInputConnection

    override fun onKey(primaryCode: Int, keyCodes: IntArray?) {
        when (primaryCode) {
            Keyboard.KEYCODE_DELETE -> handleDelete()
            Keyboard.KEYCODE_DONE -> handleSend()
            Keyboard.KEYCODE_MODE_CHANGE -> toggleSymbolMode()
            -100 -> togglePinyinChinese() // 拼/中
            -101 -> pickCandidate(0)
            -102 -> pickCandidate(1)
            -103 -> pickCandidate(2)
            -104 -> pickCandidate(3)
            -105 -> pickCandidate(4)
            -106 -> pickCandidate(5)
            -107 -> pickCandidate(6)
            -108 -> pickCandidate(7)
            -109 -> pickCandidate(8)
            else -> {
                if (primaryCode > 0) {
                    val ch = primaryCode.toChar()
                    if (symbolMode) {
                        commitText(ch.toString())
                    } else {
                        composing.append(ch.lowercaseChar())
                        refreshCandidates()
                        updatePreview()
                    }
                }
            }
        }
    }

    private fun handleDelete() {
        if (composing.isNotEmpty()) {
            composing.deleteCharAt(composing.length - 1)
            refreshCandidates()
            updatePreview()
        } else {
            currentIc()?.deleteSurroundingText(1, 0)
        }
    }

    private fun handleSend() {
        val text = composing.toString()
        if (text.isNotEmpty()) {
            val candidates = engine.getCandidates(text)
            if (candidates.isNotEmpty()) {
                commitCandidate(candidates[0])
            } else {
                commitText(text)
                composing.clear()
            }
        }
        currentIc()?.performEditorAction(EditorInfo.IME_ACTION_SEND)
    }

    private fun toggleSymbolMode() {
        symbolMode = !symbolMode
        keyboardView?.keyboard = Keyboard(
            this,
            if (symbolMode) R.xml.symbols else R.xml.qwerty
        )
    }

    private fun togglePinyinChinese() {
        symbolMode = false
        keyboardView?.keyboard = Keyboard(this, R.xml.qwerty)
    }

    private fun pickCandidate(index: Int) {
        val list = engine.getCandidates(composing.toString())
        if (index < list.size) commitCandidate(list[index])
    }

    private fun commitCandidate(word: String) {
        if (smartMode) {
            val bilingual = Translator.bilingualSend(word, targetLang)
            commitText(bilingual)
        } else {
            commitText(word)
        }
        composing.clear()
        refreshCandidates()
        updatePreview()
    }

    private fun commitText(text: String) {
        currentIc()?.commitText(text, 1)
    }

    private fun refreshCandidates() {
        val row = candidateRow ?: return
        row.removeAllViews()
        val list = engine.getCandidates(composing.toString())
        list.forEachIndexed { i, word ->
            val btn = Button(this).apply {
                text = "${i + 1}.$word"
                textSize = 14f
                setOnClickListener { commitCandidate(word) }
            }
            row.addView(btn)
        }
        if (composing.isNotEmpty()) {
            val hint = TextView(this).apply {
                text = composing.toString()
                setPadding(16, 8, 16, 8)
            }
            row.addView(hint, 0)
        }
    }

    private fun updatePreview() {
        val bar = previewBar ?: return
        if (!smartMode) {
            bar.text = "智能翻译：关"
            return
        }
        val list = engine.getCandidates(composing.toString())
        val zh = list.firstOrNull() ?: composing.toString()
        if (zh.isBlank()) {
            bar.text = "智能模式 · 目标语：$targetLang"
            return
        }
        val r = Translator.translateOutgoing(zh, targetLang)
        bar.text = "预览：${r.translated}"
    }

    private fun updateModeLabel() {
        modeLabel?.text = if (smartMode) "智能 ON · $targetLang" else "拼音"
    }

    private fun translateClipboard() {
        val cm = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        val clip = cm.primaryClip?.getItemAt(0)?.coerceToText(this)?.toString()?.trim()
        if (clip.isNullOrEmpty()) {
            Toast.makeText(this, "剪贴板为空", Toast.LENGTH_SHORT).show()
            return
        }
        val r = Translator.translateIncoming(clip)
        commitText("${r.translated}\n（原文：$clip）")
        Toast.makeText(this, "已插入中文对照", Toast.LENGTH_SHORT).show()
    }

    override fun onPress(primaryCode: Int) {}
    override fun onRelease(primaryCode: Int) {}
    override fun onText(text: CharSequence?) {
        text?.let { commitText(it.toString()) }
    }
    override fun swipeDown() {}
    override fun swipeLeft() {}
    override fun swipeRight() {}
    override fun swipeUp() {}
}
