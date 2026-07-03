import UIKit

/// iOS 系统键盘扩展 — 需在 Xcode 中创建 Keyboard Extension Target 并引用本文件
final class KeyboardViewController: UIInputViewController {

    private var engine: PinyinEngine?
    private var composing = ""
    private var smartMode = true
    private var targetLang = "en"

    private let previewLabel = UILabel()
    private let candidateScroll = UIScrollView()
    private let candidateStack = UIStackView()
    private let keyboardStack = UIStackView()

    private let rows: [[String]] = [
        ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
        ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
        ["拼", "z", "x", "c", "v", "b", "n", "m", "⌫"],
        ["智能", "空格", "发送"]
    ]

    override func viewDidLoad() {
        super.viewDidLoad()
        engine = PinyinEngine()
        setupUI()
        refreshCandidates()
    }

    private func setupUI() {
        view.backgroundColor = UIColor(red: 0.11, green: 0.11, blue: 0.12, alpha: 1)

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

        view.addSubview(previewLabel)
        view.addSubview(candidateScroll)
        view.addSubview(keyboardStack)

        NSLayoutConstraint.activate([
            previewLabel.topAnchor.constraint(equalTo: view.topAnchor, constant: 6),
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
                let btn = keyButton(key)
                h.addArrangedSubview(btn)
            }
            keyboardStack.addArrangedSubview(h)
        }
        updatePreview()
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
        case "空格":
            if let first = engine?.getCandidates(composing).first {
                commitCandidate(first)
            } else {
                textDocumentProxy.insertText(" ")
            }
        case "发送":
            textDocumentProxy.insertText("\n")
            composing = ""
            refreshCandidates()
        case "智能":
            smartMode.toggle()
            targetLang = targetLang == "en" ? "ja" : (targetLang == "ja" ? "ko" : "en")
            updatePreview()
        case "拼":
            composing = ""
            refreshCandidates()
        default:
            composing += key
            refreshCandidates()
        }
    }

    private func commitCandidate(_ word: String) {
        let text = smartMode ? Translator.bilingualSend(word, targetLang: targetLang) : word
        textDocumentProxy.insertText(text)
        composing = ""
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
        let list = engine?.getCandidates(composing) ?? []
        let zh = list.first ?? composing
        if !smartMode {
            previewLabel.text = "智能翻译：关"
            return
        }
        if zh.isEmpty {
            previewLabel.text = "智能模式 · 目标语：\(targetLang)"
            return
        }
        let r = Translator.translateOutgoing(zh, targetLang: targetLang)
        previewLabel.text = "预览：\(r.translated)"
    }
}
