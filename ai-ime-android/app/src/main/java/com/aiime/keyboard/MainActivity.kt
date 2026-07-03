package com.aiime.keyboard

import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.view.View
import android.view.inputmethod.InputMethodManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

/**
 * 宿主 App：引导启用键盘 + 复制歌词条（未打开键盘时也能看译文）
 */
class MainActivity : AppCompatActivity() {

    private var lyricBar: LinearLayout? = null
    private var lyricOriginal: TextView? = null
    private var lyricTranslated: TextView? = null
    private var lastClipboard = ""

    private val clipListener = ClipboardManager.OnPrimaryClipChangedListener {
        runOnUiThread { onClipboardChanged() }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        lyricBar = findViewById(R.id.lyric_bar)
        lyricOriginal = findViewById(R.id.lyric_original)
        lyricTranslated = findViewById(R.id.lyric_translated)

        findViewById<Button>(R.id.btn_enable).setOnClickListener {
            startActivity(Intent(Settings.ACTION_INPUT_METHOD_SETTINGS))
        }
        findViewById<Button>(R.id.btn_pick).setOnClickListener {
            val imm = getSystemService(INPUT_METHOD_SERVICE) as InputMethodManager
            imm.showInputMethodPicker()
        }
        findViewById<TextView>(R.id.hint).text =
            "1. 点击「打开输入法设置」启用「AI 翻译输入法」\n" +
            "2. 在 LINE、微信等 App 中切换到本键盘\n" +
            "3. 复制外文消息 → 上方歌词条自动显示中文\n" +
            "4. 输入中文后点发送 → 自动译成外语并附带中文"
    }

    override fun onResume() {
        super.onResume()
        val cm = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        cm.addPrimaryClipChangedListener(clipListener)
        onClipboardChanged()
    }

    override fun onPause() {
        val cm = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        cm.removePrimaryClipChangedListener(clipListener)
        super.onPause()
    }

    private fun onClipboardChanged() {
        val cm = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        val clip = cm.primaryClip?.getItemAt(0)?.coerceToText(this)?.toString()?.trim()
        if (clip.isNullOrEmpty() || clip == lastClipboard) return
        lastClipboard = clip

        val lang = Translator.detectLanguage(clip)
        if (lang == "zh-cn") {
            lyricBar?.visibility = View.GONE
            return
        }

        val r = Translator.translateIncoming(clip)
        lyricOriginal?.text = r.original
        lyricTranslated?.text = r.translated
        lyricBar?.visibility = View.VISIBLE
    }
}
