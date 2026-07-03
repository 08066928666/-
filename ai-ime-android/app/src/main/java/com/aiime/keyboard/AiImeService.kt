package com.aiime.keyboard

import android.content.ClipboardManager
import android.content.Context
import android.inputmethodservice.InputMethodService
import android.inputmethodservice.Keyboard
import android.inputmethodservice.KeyboardView
import android.view.View
import android.view.inputmethod.EditorInfo
import android.widget.Button
import android.widget.HorizontalScrollView
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import com.aiime.keyboard.R

/**
 * 轻量输入法（演示）。流畅度远不如语燕 Rime 版，见 ai-ime-mobile/ROADMAP.md
 */
class AiImeService : InputMethodService(), KeyboardView.OnKeyboardActionListener {

    private lateinit var engine: PinyinEngine
    private var keyboardView: KeyboardView? = null
    private var composing = StringBuilder()
    private var associateContext = ""
    private var smartMode = true
    private var targetLang = "en"
    private var symbolMode = false

    private var candidateRow: LinearLayout? = null
    private var previewBar: TextView? = null
    private var modeLabel: TextView? = null
    private var lastCandidates: List<String> = emptyList()
    private var inAssociateMode = false

    private val candidateViews = ArrayList<TextView>(9)

    override fun onCreate() {
        super.onCreate()
        engine = PinyinEngine(this)
    }

    override fun onCreateInputView(): View {
        val root = layoutInflater.inflate(R.layout.keyboard_view, null)
        keyboardView = root.findViewById(R.id.keyboard)
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

        initCandidatePool()
        updateModeLabel()
        return root
    }

    private fun initCandidatePool() {
        val row = candidateRow ?: return
        repeat(9) { i ->
            val tv = TextView(this).apply {
                textSize = 16f
                setPadding(20, 10, 20, 10)
                setTextColor(0xFFFFFFFF.toInt())
                visibility = View.GONE
                setOnClickListener { onCandidateClick(i) }
            }
            candidateViews.add(tv)
            row.addView(tv)
        }
    }

    private fun onCandidateClick(index: Int) {
        if (index >= lastCandidates.size) return
        commitCandidate(lastCandidates[index])
    }

    override fun onStartInput(attribute: EditorInfo?, restarting: Boolean) {
        super.onStartInput(attribute, restarting)
        composing.clear()
        associateContext = ""
        inAssociateMode = false
        clearComposingInEditor()
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
                        exitAssociateMode()
                        composing.append(ch.lowercaseChar())
                        syncComposingToEditor()
                        refreshCandidates()
                        updatePreview()
                    }
                }
            }
        }
    }

    private fun exitAssociateMode() {
        inAssociateMode = false
        associateContext = ""
    }

    private fun syncComposingToEditor() {
        val ic = currentInputConnection ?: return
        if (composing.isEmpty()) {
            ic.finishComposingText()
        } else {
            ic.setComposingText(composing.toString(), 1)
        }
    }

    private fun clearComposingInEditor() {
        currentInputConnection?.finishComposingText()
    }

    private fun handleDelete() {
        if (composing.isNotEmpty()) {
            composing.deleteCharAt(composing.length - 1)
            syncComposingToEditor()
            refreshCandidates()
            updatePreview()
        } else if (inAssociateMode) {
            exitAssociateMode()
            refreshCandidates()
        } else {
            currentInputConnection?.deleteSurroundingText(1, 0)
            updateAssociateContextFromEditor()
            refreshCandidates()
        }
    }

    private fun handleSpace() {
        if (composing.isNotEmpty() && lastCandidates.isNotEmpty()) {
            commitCandidate(lastCandidates[0])
        } else if (inAssociateMode && lastCandidates.isNotEmpty()) {
            commitAssociate(lastCandidates[0])
        } else {
            commitText(" ")
            updateAssociateContextFromEditor()
            refreshCandidates()
        }
    }

    private fun handleSend() {
        if (composing.isNotEmpty()) {
            if (lastCandidates.isNotEmpty()) commitCandidate(lastCandidates[0])
            else {
                commitText(composing.toString())
                composing.clear()
                clearComposingInEditor()
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
        exitAssociateMode()
        refreshCandidates()
        updateModeLabel()
    }

    private fun toggleSymbolMode() {
        symbolMode = !symbolMode
        keyboardView?.keyboard = Keyboard(
            this,
            if (symbolMode) R.xml.symbols else R.xml.qwerty
        )
    }

    private fun commitCandidate(word: String) {
        clearComposingInEditor()
        commitText(word)
        val remain = engine.consumeComposing(composing.toString(), word)
        composing.clear()
        composing.append(remain)
        if (remain.isNotEmpty()) {
            inAssociateMode = false
            syncComposingToEditor()
        } else {
            updateAssociateContextFromEditor()
            enterAssociateModeIfNeeded()
        }
        refreshCandidates()
        updatePreview()
    }

    private fun commitAssociate(tail: String) {
        commitText(tail)
        associateContext += tail
        enterAssociateModeIfNeeded()
        refreshCandidates()
        updatePreview()
    }

    private fun updateAssociateContextFromEditor() {
        val before = currentInputConnection?.getTextBeforeCursor(8, 0)?.toString().orEmpty()
        associateContext = before.filter { it in '\u4e00'..'\u9fff' }.takeLast(3)
    }

    private fun enterAssociateModeIfNeeded() {
        val next = engine.getAssociates(associateContext)
        inAssociateMode = next.isNotEmpty() && composing.isEmpty()
    }

    private fun commitText(text: String) {
        currentInputConnection?.commitText(text, 1)
    }

    private fun refreshCandidates() {
        lastCandidates = when {
            composing.isNotEmpty() -> engine.getCandidates(composing.toString())
            inAssociateMode && associateContext.isNotEmpty() -> engine.getAssociates(associateContext)
            else -> emptyList()
        }
        for (i in 0 until 9) {
            val tv = candidateViews.getOrNull(i) ?: continue
            if (i < lastCandidates.size) {
                tv.visibility = View.VISIBLE
                tv.text = lastCandidates[i]
            } else {
                tv.visibility = View.GONE
            }
        }
        updateModeLabel()
    }

    private fun updatePreview() {
        val bar = previewBar ?: return
        if (!smartMode) {
            bar.text = "智能翻译：关（发送时翻译）"
            return
        }
        val draft = currentInputConnection?.getTextBeforeCursor(500, 0)?.toString().orEmpty()
        if (draft.isBlank() && composing.isEmpty()) {
            bar.text = "正式版请用语燕 Rime · ai-ime-yuyan/"
            return
        }
        val r = Translator.translateOutgoing(draft, targetLang)
        bar.text = "发送预览：${r.translated}"
    }

    private fun updateModeLabel() {
        val mode = when {
            composing.isNotEmpty() -> "拼音"
            inAssociateMode -> "联想"
            else -> if (smartMode) "智能 ON · $targetLang" else "拼音"
        }
        modeLabel?.text = mode
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
