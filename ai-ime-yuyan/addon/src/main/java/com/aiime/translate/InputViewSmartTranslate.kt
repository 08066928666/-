package com.aiime.translate

import android.view.KeyEvent
import com.yuyan.imemodule.keyboard.InputView
import com.yuyan.imemodule.service.DecodingInfo

/**
 * 扩展语燕 InputView 的 Enter 处理：无候选时可选智能翻译发送。
 */
fun InputView.handleEnterSmartOrSend(
    keyCode: Int,
    sendKeyEvent: (Int) -> Unit,
    commitComposing: () -> Unit,
    resetToIdle: () -> Unit,
) {
    if (DecodingInfo.isCandidatesEmpty || DecodingInfo.isAssociate) {
        if (SmartTranslatePrefs.isEnabled(context)) {
            SmartTranslate.translateAndSendLine(service)
        } else {
            sendKeyEvent(keyCode)
        }
    } else {
        commitComposing()
    }
    resetToIdle()
}

fun InputView.isSpaceChooseCandidate(): Boolean =
    !DecodingInfo.isCandidatesEmpty && !DecodingInfo.isAssociate
