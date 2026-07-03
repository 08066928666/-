import UIKit

/// 歌词式双行字幕条：原文（灰）+ 母语译文（白）
final class LyricSubtitleView: UIView {
    private let originalLabel = UILabel()
    private let translatedLabel = UILabel()
    private var fadeWork: DispatchWorkItem?

    var onDismiss: (() -> Void)?

    override init(frame: CGRect) {
        super.init(frame: frame)
        setup()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setup()
    }

    private func setup() {
        backgroundColor = UIColor(white: 0.12, alpha: 0.95)
        layer.cornerRadius = 10
        clipsToBounds = true

        originalLabel.font = .systemFont(ofSize: 12)
        originalLabel.textColor = UIColor(white: 0.55, alpha: 1)
        originalLabel.numberOfLines = 2

        translatedLabel.font = .systemFont(ofSize: 16, weight: .medium)
        translatedLabel.textColor = .white
        translatedLabel.numberOfLines = 3

        let stack = UIStackView(arrangedSubviews: [originalLabel, translatedLabel])
        stack.axis = .vertical
        stack.spacing = 4
        stack.translatesAutoresizingMaskIntoConstraints = false
        addSubview(stack)

        NSLayoutConstraint.activate([
            stack.topAnchor.constraint(equalTo: topAnchor, constant: 8),
            stack.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 12),
            stack.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -12),
            stack.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -8),
        ])

        isHidden = true
        alpha = 1
    }

    func show(original: String, translated: String, fadeAfter seconds: TimeInterval = 8) {
        fadeWork?.cancel()
        originalLabel.text = original
        translatedLabel.text = translated
        isHidden = false
        alpha = 1

        let work = DispatchWorkItem { [weak self] in
            UIView.animate(withDuration: 0.35) {
                self?.alpha = 0.45
            }
        }
        fadeWork = work
        DispatchQueue.main.asyncAfter(deadline: .now() + seconds, execute: work)
    }

    func hide() {
        fadeWork?.cancel()
        isHidden = true
        alpha = 1
    }
}
