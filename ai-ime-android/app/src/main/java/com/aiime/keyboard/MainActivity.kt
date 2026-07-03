package com.aiime.keyboard

import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.view.inputmethod.InputMethodManager
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

/**
 * 宿主 App：引导用户启用系统输入法
 */
class MainActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        findViewById<Button>(R.id.btn_enable).setOnClickListener {
            startActivity(Intent(Settings.ACTION_INPUT_METHOD_SETTINGS))
        }
        findViewById<Button>(R.id.btn_pick).setOnClickListener {
            val imm = getSystemService(INPUT_METHOD_SERVICE) as InputMethodManager
            imm.showInputMethodPicker()
        }
        findViewById<TextView>(R.id.hint).text =
            "1. 点击「打开输入法设置」\n" +
            "2. 启用「AI 翻译输入法」\n" +
            "3. 在微信、邮件等任意 App 中切换到本键盘\n" +
            "4. 智能模式：中文输入 → 自动译成外语并附带中文"
    }
}
