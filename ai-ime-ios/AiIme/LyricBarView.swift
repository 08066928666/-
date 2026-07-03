import SwiftUI

/// SwiftUI 歌词式字幕条（宿主 App 底边展示）
struct LyricBarView: View {
    let original: String
    let translated: String
    var onDismiss: () -> Void = {}

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text("复制即译")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                Spacer()
                Button(action: onDismiss) {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(.secondary)
                }
            }
            Text(original)
                .font(.system(size: 12))
                .foregroundStyle(.secondary)
                .lineLimit(2)
            Text(translated)
                .font(.system(size: 16, weight: .medium))
                .foregroundStyle(.primary)
                .lineLimit(4)
        }
        .padding(12)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))
        .padding(.horizontal)
    }
}

/// 发送预览条：将发送的外语 + 中文对照
struct SendPreviewBarView: View {
    let targetLang: String
    let translated: String
    let chinese: String

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("将发送（\(langLabel)）：\(translated)")
                .font(.system(size: 12))
                .foregroundStyle(.secondary)
                .lineLimit(2)
            Text("（\(chinese)）")
                .font(.system(size: 13))
                .foregroundStyle(.primary)
                .lineLimit(2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(Color(white: 0.15))
    }

    private var langLabel: String {
        switch targetLang {
        case "ja": return "日语"
        case "ko": return "韩语"
        default: return "英语"
        }
    }
}
