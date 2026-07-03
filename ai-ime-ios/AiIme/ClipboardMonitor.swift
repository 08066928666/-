import Combine
import UIKit

/// 宿主 App 剪贴板监听 → 触发歌词条翻译
@MainActor
final class ClipboardMonitor: ObservableObject {
    @Published var lyricOriginal = ""
    @Published var lyricTranslated = ""
    @Published var lyricVisible = false

    private var lastSeen = ""
    private var timer: Timer?

    func start() {
        checkClipboard()
        timer = Timer.scheduledTimer(withTimeInterval: 0.8, repeats: true) { [weak self] _ in
            Task { @MainActor in self?.checkClipboard() }
        }
    }

    func stop() {
        timer?.invalidate()
        timer = nil
    }

    private func checkClipboard() {
        guard let text = UIPasteboard.general.string?.trimmingCharacters(in: .whitespacesAndNewlines),
              !text.isEmpty,
              text != lastSeen else { return }

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
