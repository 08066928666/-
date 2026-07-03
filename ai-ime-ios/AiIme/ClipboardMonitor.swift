import Combine
import UIKit

/// 宿主 App 剪贴板监听 → 触发歌词条（须用户开启「复制即译」）
@MainActor
final class ClipboardMonitor: ObservableObject {
    @Published var lyricOriginal = ""
    @Published var lyricTranslated = ""
    @Published var lyricVisible = false

    private var lastSeen = ""
    private var timer: Timer?

    var isEnabled: Bool {
        SharedSettings.privacyConsentAccepted && SharedSettings.clipboardMonitoringEnabled
    }

    func start() {
        guard isEnabled else { return }
        checkClipboard()
        timer?.invalidate()
        timer = Timer.scheduledTimer(withTimeInterval: 0.8, repeats: true) { [weak self] _ in
            Task { @MainActor in self?.checkClipboard() }
        }
    }

    func stop() {
        timer?.invalidate()
        timer = nil
    }

    func restartIfNeeded() {
        stop()
        lyricVisible = false
        if isEnabled { start() }
    }

    private func checkClipboard() {
        guard isEnabled else { return }
        guard let text = UIPasteboard.general.string?.trimmingCharacters(in: .whitespacesAndNewlines),
              !text.isEmpty,
              text != lastSeen else { return }

        guard !SharedSettings.isSensitiveClipboard(text) else { return }

        lastSeen = text
        SharedSettings.lastClipboard = text

        let lang = Translator.detectLanguage(text)
        guard lang != "zh-cn" else {
            lyricVisible = false
            return
        }

        let r = Translator.translateIncoming(text)
        lyricOriginal = r.original
        lyricTranslated = r.translated
        lyricVisible = true
    }

    func dismissLyric() {
        lyricVisible = false
    }
}
