import SwiftUI

/// 首次启动隐私与权限说明
struct PrivacyConsentView: View {
    @Binding var accepted: Bool
    var onAccept: () -> Void

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Label("隐私与合规", systemImage: "hand.raised.fill")
                        .font(.title2.bold())

                    Group {
                        Text("我们如何做翻译")
                            .font(.headline)
                        bullet("**收消息**：只有在你 **复制** 外文后，才显示歌词条字幕")
                        bullet("**发消息**：只翻译 **你自己输入** 的文字，不会读取聊天记录")
                        bullet("**不做读屏**：不会用无障碍或 OCR 自动扫描 LINE、微信等 App")
                    }

                    Group {
                        Text("你的控制权")
                            .font(.headline)
                        bullet("「复制即译」默认 **关闭**，可在设置中自行开启")
                        bullet("「云端翻译」须单独同意；演示版默认仅用 **本地词典**，不上传内容")
                        bullet("可随时在设置中关闭上述功能")
                    }

                    Group {
                        Text("键盘完全访问")
                            .font(.headline)
                        Text("若开启 iOS「允许完全访问」，仅用于：复制后显示字幕、以及你同意后的联网翻译。详见 ai-ime-mobile/COMPLIANCE_合规与隐私.md")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }

                    Button {
                        accepted = true
                        SharedSettings.privacyConsentAccepted = true
                        onAccept()
                    } label: {
                        Text("我已了解并继续")
                            .frame(maxWidth: .infinity)
                            .padding()
                    }
                    .buttonStyle(.borderedProminent)

                    Button("暂不使用敏感功能（仅本地演示）") {
                        accepted = true
                        SharedSettings.privacyConsentAccepted = true
                        SharedSettings.clipboardMonitoringEnabled = false
                        SharedSettings.cloudTranslationEnabled = false
                        onAccept()
                    }
                    .font(.footnote)
                    .frame(maxWidth: .infinity)
                }
                .padding()
            }
            .navigationTitle("使用前说明")
        }
    }

    private func bullet(_ text: LocalizedStringKey) -> some View {
        HStack(alignment: .top, spacing: 8) {
            Text("•")
            Text(text)
                .font(.subheadline)
        }
    }
}
