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
 * 轻量输入法（演示用）。正式版请使用语燕引擎：ai-ime-yuyan/
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
    private var lastCandidates: List<String> = emptyList()

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

    override fun onKey(primaryCode: Int, keyCodes: IntArray?) {
        when (primaryCode) {
            Keyboard.KEYCODE_DELETE -> handleDelete()
            Keyboard.KEYCODE_DONE, 10 -> handleSend()
            Keyboard.KEYCODE_MODE_CHANGE -> toggleSymbolMode()
            32 -> handleSpace()
            -100 -> {
                symbolMode = false
                keyboardView?.keyboard = Keyboard(this, R.xml.qwerty)
            }
            else -> {
                if (primaryCode > 0) {
                    val ch = primaryCode.toChar()
                    if (symbolMode) {
                        commitText(ch.toString())
                    } else if (ch.isLetter()) {
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
            currentInputConnection?.deleteSurroundingText(1, 0)
        }
    }

    private fun handleSpace() {
        if (composing.isNotEmpty() && lastCandidates.isNotEmpty()) {
            commitCandidate(lastCandidates[0])
        } else {
            commitText(" ")
        }
    }

    private fun handleSend() {
        if (composing.isNotEmpty()) {
            if (lastCandidates.isNotEmpty()) commitCandidate(lastCandidates[0])
            else {
                commitText(composing.toString())
                composing.clear()
                refreshCandidates()
            }
            return
        }
        if (smartMode) {
            val ic = currentInputConnection ?: return
            val before = ic.getTextBeforeCursor(2000, 0)?.toString()?.trim().orEmpty()
            if (before.isNotEmpty() && before.any { it in '\u4e00'..'\u9fff' }) {
                val bilingual = Translator.bilingualSend(before, targetLang)
                ic.deleteSurroundingText(before.length, 0)
                ic.commitText(bilingual, 1)
            }
        }
        currentInputConnection?.performEditorAction(EditorInfo.IME_ACTION_SEND)
    }

    private fun toggleSymbolMode() {
        symbolMode = !symbolMode
        keyboardView?.keyboard = Keyboard(
            this,
            if (symbolMode) R.xml.symbols else R.xml.qwerty
        )
    }

    private fun commitCandidate(word: String) {
        commitText(word)
        val remain = engine.consumeComposing(composing.toString(), word)
        composing.clear()
        composing.append(remain)
        refreshCandidates()
        updatePreview()
    }

    private fun commitText(text: String) {
        currentInputConnection?.commitText(text, 1)
    }

    private fun refreshCandidates() {
        val row = candidateRow ?: return
        row.removeAllViews()
        lastCandidates = engine.getCandidates(composing.toString())
        if (composing.isNotEmpty()) {
            val hint = TextView(this).apply {
                text = composing.toString()
                setPadding(16, 8, 16, 8)
            }
            row.addView(hint)
        }
        lastCandidates.forEachIndexed { i, word ->
            val btn = Button(this).apply {
                text = "${i + 1}.$word"
                textSize = 14f
                setOnClickListener { commitCandidate(word) }
            }
            row.addView(btn)
        }
    }

    private fun updatePreview() {
        val bar = previewBar ?: return
        if (!smartMode) {
            bar.text = "智能翻译：关（发送时翻译）"
            return
        }
        val draft = buildString {
            val before = currentInputConnection?.getTextBeforeCursor(500, 0)?.toString().orEmpty()
            append(before)
            if (composing.isNotEmpty()) {
                val guess = lastCandidates.firstOrNull() ?: composing.toString()
                append(guess)
            }
        }.trim()
        if (draft.isBlank()) {
            bar.text = "智能模式 · 目标语：$targetLang · 发送时翻译"
            return
        }
        val r = Translator.translateOutgoing(draft, targetLang)
        bar.text = "发送预览：${r.translated}"
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
