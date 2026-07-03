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
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.switchmaterial.SwitchMaterial

/**
 * 宿主 App：引导启用键盘 + 复制歌词条（合规：默认不监听剪贴板）
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

        val switchClipboard = findViewById<SwitchMaterial>(R.id.switch_clipboard)
        val switchCloud = findViewById<SwitchMaterial>(R.id.switch_cloud)

        switchClipboard.isChecked = TranslatePrefs.clipboardMonitoringEnabled(this)
        switchCloud.isChecked = TranslatePrefs.cloudTranslationEnabled(this)

        switchClipboard.setOnCheckedChangeListener { _, checked ->
            TranslatePrefs.setClipboardMonitoringEnabled(this, checked)
            if (checked && !TranslatePrefs.privacyConsentAccepted(this)) {
                showPrivacyDialog(onAccept = {
                    TranslatePrefs.setPrivacyConsentAccepted(this, true)
                }, onDecline = {
                    switchClipboard.isChecked = false
                    TranslatePrefs.setClipboardMonitoringEnabled(this, false)
                })
            }
        }

        switchCloud.setOnCheckedChangeListener { _, checked ->
            if (checked) {
                AlertDialog.Builder(this)
                    .setTitle("云端翻译")
                    .setMessage("开启后，你输入的文字可能发送至第三方翻译服务。演示版默认使用本地词典。")
                    .setPositiveButton("同意") { _, _ ->
                        TranslatePrefs.setCloudTranslationEnabled(this, true)
                    }
                    .setNegativeButton("取消") { _, _ ->
                        switchCloud.isChecked = false
                    }
                    .show()
            } else {
                TranslatePrefs.setCloudTranslationEnabled(this, false)
            }
        }

        findViewById<Button>(R.id.btn_enable).setOnClickListener {
            startActivity(Intent(Settings.ACTION_INPUT_METHOD_SETTINGS))
        }
        findViewById<Button>(R.id.btn_pick).setOnClickListener {
            val imm = getSystemService(INPUT_METHOD_SERVICE) as InputMethodManager
            imm.showInputMethodPicker()
        }
        findViewById<TextView>(R.id.hint).text =
            "1. 点击「打开输入法设置」启用「AI 翻译输入法」\n" +
            "2. 在设置中开启「复制即译」后，复制外文才会显示歌词条\n" +
            "3. 输入中文后点发送 → 自动译成外语并附带中文\n" +
            "4. 我们不会读屏或自动扫描 LINE/微信聊天"

        if (!TranslatePrefs.privacyConsentAccepted(this)) {
            showPrivacyDialog(
                onAccept = { TranslatePrefs.setPrivacyConsentAccepted(this, true) },
                onDecline = { TranslatePrefs.setPrivacyConsentAccepted(this, true) },
            )
        }
    }

    private fun showPrivacyDialog(onAccept: () -> Unit, onDecline: () -> Unit) {
        AlertDialog.Builder(this)
            .setTitle("隐私与合规")
            .setMessage(
                "• 收消息：仅在你主动复制后显示歌词条\n" +
                "• 发消息：只翻译你自己输入的文字\n" +
                "• 不做读屏/无障碍爬取\n" +
                "• 剪贴板监听默认关闭，可随时关闭\n\n" +
                "详见 ai-ime-mobile/COMPLIANCE_合规与隐私.md"
            )
            .setPositiveButton("我已了解") { _, _ -> onAccept() }
            .setNegativeButton("暂不使用敏感功能") { _, _ -> onDecline() }
            .setCancelable(false)
            .show()
    }

    override fun onResume() {
        super.onResume()
        val cm = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        cm.addPrimaryClipChangedListener(clipListener)
        if (TranslatePrefs.clipboardMonitoringEnabled(this)) onClipboardChanged()
    }

    override fun onPause() {
        val cm = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        cm.removePrimaryClipChangedListener(clipListener)
        super.onPause()
    }

    private fun onClipboardChanged() {
        if (!TranslatePrefs.clipboardMonitoringEnabled(this)) return
        val cm = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        val clip = cm.primaryClip?.getItemAt(0)?.coerceToText(this)?.toString()?.trim()
        if (clip.isNullOrEmpty() || clip == lastClipboard) return
        if (TranslatePrefs.isSensitiveClipboard(clip)) return
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
