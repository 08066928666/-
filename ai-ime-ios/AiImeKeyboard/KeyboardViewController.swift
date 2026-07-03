import UIKit

/// iOS 系统键盘扩展 — 复制歌词条 + 发送翻译
final class KeyboardViewController: UIInputViewController {

    private var engine: PinyinEngine?
    private var composing = ""
    private var smartMode = true
    private var targetLang = "en"
    private var lastClipboard = ""

    private let lyricBar = LyricSubtitleView()
    private let sendPreviewBar = UIView()
    private let sendPreviewLabel = UILabel()
    private let previewLabel = UILabel()
    private let candidateScroll = UIScrollView()
    private let candidateStack = UIStackView()
    private let keyboardStack = UIStackView()
    private var clipboardTimer: Timer?

    private let rows: [[String]] = [
        ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
        ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
        ["拼", "z", "x", "c", "v", "b", "n", "m", "⌫"],
        ["智能", "空格", "发送"]
    ]

    override func viewDidLoad() {
        super.viewDidLoad()
        engine = PinyinEngine()
        smartMode = SharedSettings.smartMode
        targetLang = SharedSettings.targetLang
        lastClipboard = SharedSettings.lastClipboard ?? ""
        setupUI()
        refreshCandidates()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        smartMode = SharedSettings.smartMode
        targetLang = SharedSettings.targetLang
        startClipboardWatch()
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        clipboardTimer?.invalidate()
        clipboardTimer = nil
    }

    private func setupUI() {
        view.backgroundColor = UIColor(red: 0.11, green: 0.11, blue: 0.12, alpha: 1)

        lyricBar.translatesAutoresizingMaskIntoConstraints = false

        sendPreviewBar.backgroundColor = UIColor(white: 0.15, alpha: 1)
        sendPreviewBar.layer.cornerRadius = 6
        sendPreviewBar.isHidden = true
        sendPreviewBar.translatesAutoresizingMaskIntoConstraints = false

        sendPreviewLabel.font = .systemFont(ofSize: 12)
        sendPreviewLabel.textColor = .secondaryLabel
        sendPreviewLabel.numberOfLines = 3
        sendPreviewLabel.translatesAutoresizingMaskIntoConstraints = false
        sendPreviewBar.addSubview(sendPreviewLabel)

        previewLabel.font = .systemFont(ofSize: 12)
        previewLabel.textColor = .secondaryLabel
        previewLabel.numberOfLines = 2
        previewLabel.translatesAutoresizingMaskIntoConstraints = false

        candidateScroll.showsHorizontalScrollIndicator = false
        candidateScroll.translatesAutoresizingMaskIntoConstraints = false
        candidateStack.axis = .horizontal
        candidateStack.spacing = 8
        candidateStack.translatesAutoresizingMaskIntoConstraints = false
        candidateScroll.addSubview(candidateStack)

        keyboardStack.axis = .vertical
        keyboardStack.spacing = 6
        keyboardStack.translatesAutoresizingMaskIntoConstraints = false

        view.addSubview(lyricBar)
        view.addSubview(sendPreviewBar)
        view.addSubview(previewLabel)
        view.addSubview(candidateScroll)
        view.addSubview(keyboardStack)

        NSLayoutConstraint.activate([
            lyricBar.topAnchor.constraint(equalTo: view.topAnchor, constant: 4),
            lyricBar.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 8),
            lyricBar.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -8),

            sendPreviewBar.topAnchor.constraint(equalTo: lyricBar.bottomAnchor, constant: 4),
            sendPreviewBar.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 8),
            sendPreviewBar.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -8),

            sendPreviewLabel.topAnchor.constraint(equalTo: sendPreviewBar.topAnchor, constant: 6),
            sendPreviewLabel.leadingAnchor.constraint(equalTo: sendPreviewBar.leadingAnchor, constant: 10),
            sendPreviewLabel.trailingAnchor.constraint(equalTo: sendPreviewBar.trailingAnchor, constant: -10),
            sendPreviewLabel.bottomAnchor.constraint(equalTo: sendPreviewBar.bottomAnchor, constant: -6),

            previewLabel.topAnchor.constraint(equalTo: sendPreviewBar.bottomAnchor, constant: 4),
            previewLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 12),
            previewLabel.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -12),

            candidateScroll.topAnchor.constraint(equalTo: previewLabel.bottomAnchor, constant: 4),
            candidateScroll.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            candidateScroll.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            candidateScroll.heightAnchor.constraint(equalToConstant: 40),

            candidateStack.topAnchor.constraint(equalTo: candidateScroll.topAnchor),
            candidateStack.leadingAnchor.constraint(equalTo: candidateScroll.leadingAnchor, constant: 8),
            candidateStack.trailingAnchor.constraint(equalTo: candidateScroll.trailingAnchor, constant: -8),
            candidateStack.bottomAnchor.constraint(equalTo: candidateScroll.bottomAnchor),
            candidateStack.heightAnchor.constraint(equalTo: candidateScroll.heightAnchor),

            keyboardStack.topAnchor.constraint(equalTo: candidateScroll.bottomAnchor, constant: 6),
            keyboardStack.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 4),
            keyboardStack.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -4),
            keyboardStack.bottomAnchor.constraint(equalTo: view.bottomAnchor, constant: -4),
        ])

        for row in rows {
            let h = UIStackView()
            h.axis = .horizontal
            h.spacing = 4
            h.distribution = .fillEqually
            for key in row {
                h.addArrangedSubview(keyButton(key))
            }
            keyboardStack.addArrangedSubview(h)
        }
        updatePreview()
    }

    private func startClipboardWatch() {
        guard hasFullAccess,
              SharedSettings.privacyConsentAccepted,
              SharedSettings.clipboardMonitoringEnabled else { return }
        checkClipboard()
        clipboardTimer?.invalidate()
        clipboardTimer = Timer.scheduledTimer(withTimeInterval: 0.9, repeats: true) { [weak self] _ in
            self?.checkClipboard()
        }
    }

    private func checkClipboard() {
        guard hasFullAccess,
              SharedSettings.clipboardMonitoringEnabled,
              let text = UIPasteboard.general.string?.trimmingCharacters(in: .whitespacesAndNewlines),
              !text.isEmpty,
              !SharedSettings.isSensitiveClipboard(text),
              text != lastClipboard else { return }

        lastClipboard = text
        SharedSettings.lastClipboard = text

        let lang = Translator.detectLanguage(text)
        guard lang != "zh-cn" else {
            lyricBar.hide()
            return
        }

        let r = Translator.translateIncoming(text)
        lyricBar.show(original: r.original, translated: r.translated)
    }

    private func keyButton(_ title: String) -> UIButton {
        let b = UIButton(type: .system)
        b.setTitle(title, for: .normal)
        b.setTitleColor(.white, for: .normal)
        b.titleLabel?.font = .systemFont(ofSize: title.count > 2 ? 13 : 18)
        b.backgroundColor = UIColor(white: 0.23, alpha: 1)
        b.layer.cornerRadius = 6
        b.heightAnchor.constraint(equalToConstant: 44).isActive = true
        b.addAction(UIAction { [weak self] _ in self?.onKey(title) }, for: .touchUpInside)
        return b
    }

    private func onKey(_ key: String) {
        switch key {
        case "⌫":
            if !composing.isEmpty {
                composing.removeLast()
                refreshCandidates()
            } else {
                textDocumentProxy.deleteBackward()
            }
            updatePreview()
        case "空格":
            if let first = engine?.getCandidates(composing).first {
                commitCandidate(first)
            } else {
                textDocumentProxy.insertText(" ")
            }
            updatePreview()
        case "发送":
            handleSend()
        case "智能":
            smartMode.toggle()
            SharedSettings.smartMode = smartMode
            targetLang = SharedSettings.cycleTargetLang()
            updatePreview()
        case "拼":
            composing = ""
            refreshCandidates()
        default:
            composing += key
            refreshCandidates()
        }
    }

    private func handleSend() {
        if !composing.isEmpty {
            if let first = engine?.getCandidates(composing).first {
                commitCandidate(first)
            } else {
                textDocumentProxy.insertText(composing)
                composing = ""
                refreshCandidates()
            }
        }

        if smartMode {
            let before = textDocumentProxy.documentContextBeforeInput ?? ""
            let line = before.split(separator: "\n", omittingEmptySubsequences: false).last.map(String.init) ?? before
            let trimmed = line.trimmingCharacters(in: .whitespacesAndNewlines)
            if !trimmed.isEmpty && Translator.detectLanguage(trimmed) == "zh-cn" {
                let out = Translator.bilingualSend(trimmed, targetLang: targetLang)
                for _ in 0..<trimmed.count { textDocumentProxy.deleteBackward() }
                textDocumentProxy.insertText(out)
            }
        }

        textDocumentProxy.insertText("\n")
        composing = ""
        refreshCandidates()
        sendPreviewBar.isHidden = true
        updatePreview()
    }

    private func commitCandidate(_ word: String) {
        textDocumentProxy.insertText(word)
        composing = engine?.consumeComposing(composing, word: word) ?? ""
        refreshCandidates()
    }

    private func refreshCandidates() {
        candidateStack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        let list = engine?.getCandidates(composing) ?? []
        if !composing.isEmpty {
            let label = UILabel()
            label.text = composing
            label.textColor = .white
            candidateStack.addArrangedSubview(label)
        }
        for (i, word) in list.enumerated() {
            let btn = UIButton(type: .system)
            btn.setTitle("\(i + 1).\(word)", for: .normal)
            btn.addAction(UIAction { [weak self] _ in self?.commitCandidate(word) }, for: .touchUpInside)
            candidateStack.addArrangedSubview(btn)
        }
        updatePreview()
    }

    private func updatePreview() {
        if !smartMode {
            previewLabel.text = "智能翻译：关"
            sendPreviewBar.isHidden = true
            return
        }

        let draft = currentDraftChinese()
        if draft.isEmpty {
            previewLabel.text = "智能模式 · 目标语：\(targetLangLabel) · 复制外文显示歌词条"
            sendPreviewBar.isHidden = true
            return
        }

        let r = Translator.translateOutgoing(draft, targetLang: targetLang)
        sendPreviewBar.isHidden = false
        sendPreviewLabel.text = "将发送（\(targetLangLabel)）：\(r.translated)\n（\(draft)）"
        previewLabel.text = ""
    }

    private func currentDraftChinese() -> String {
        let before = textDocumentProxy.documentContextBeforeInput ?? ""
        let line = before.split(separator: "\n", omittingEmptySubsequences: false).last.map(String.init) ?? before
        let trimmed = line.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return composing.isEmpty ? "" : (engine?.getCandidates(composing).first ?? composing) }
        if trimmed.unicodeScalars.contains(where: { (0x4E00...0x9FFF).contains($0.value) }) { return trimmed }
        if !composing.isEmpty { return engine?.getCandidates(composing).first ?? composing }
        return ""
    }

    private var targetLangLabel: String {
        switch targetLang {
        case "ja": return "日语"
        case "ko": return "韩语"
        default: return "英语"
        }
    }
}
