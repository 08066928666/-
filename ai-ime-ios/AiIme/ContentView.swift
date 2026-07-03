import SwiftUI

@main
struct AiImeApp: App {
    @StateObject private var clipboard = ClipboardMonitor()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(clipboard)
        }
    }
}

struct ContentView: View {
    @EnvironmentObject private var clipboard: ClipboardMonitor
    @State private var smartMode = SharedSettings.smartMode
    @State private var targetLang = SharedSettings.targetLang
    @State private var clipboardEnabled = SharedSettings.clipboardMonitoringEnabled
    @State private var cloudEnabled = SharedSettings.cloudTranslationEnabled
    @State private var showPrivacy = !SharedSettings.privacyConsentAccepted

    var body: some View {
        NavigationStack {
            ZStack(alignment: .bottom) {
                List {
                    Section("安装键盘") {
                        Text("1. 打开「设置 → 通用 → 键盘 → 键盘」")
                        Text("2. 添加新键盘 → 选择「AI 翻译输入法」")
                        Text("3. 需要歌词条/联网翻译时，再开启「允许完全访问」")
                        Text("4. 在 LINE、微信等 App 中点地球图标切换键盘")
                    }
                    Section("收消息 · 复制歌词条") {
                        Toggle("复制即译（监听剪贴板）", isOn: $clipboardEnabled)
                            .onChange(of: clipboardEnabled) { v in
                                SharedSettings.clipboardMonitoringEnabled = v
                                clipboard.restartIfNeeded()
                            }
                        Text("合规说明：仅在你 **主动复制** 后读取一次剪贴板并显示字幕，不会自动读 LINE/微信聊天。")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                    Section("发消息 · 发送翻译") {
                        Toggle("智能翻译", isOn: $smartMode)
                            .onChange(of: smartMode) { SharedSettings.smartMode = $0 }
                        Toggle("使用云端翻译 API", isOn: $cloudEnabled)
                            .onChange(of: cloudEnabled) { SharedSettings.cloudTranslationEnabled = $0 }
                        HStack {
                            Text("目标语言")
                            Spacer()
                            Text(langLabel(targetLang))
                                .foregroundStyle(.secondary)
                            Button("切换") {
                                targetLang = SharedSettings.cycleTargetLang()
                            }
                        }
                        Text(cloudEnabled
                             ? "开启后，你输入的文字可能发送至第三方翻译服务，详见隐私政策。"
                             : "当前为本地演示词典，不上传任何内容。")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                    Section("隐私与合规") {
                        Text("不做读屏 / 无障碍爬取；不默认监听剪贴板。")
                        Text("完整说明见仓库 ai-ime-mobile/COMPLIANCE_合规与隐私.md")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                }

                if clipboard.lyricVisible {
                    LyricBarView(
                        original: clipboard.lyricOriginal,
                        translated: clipboard.lyricTranslated,
                        onDismiss: { clipboard.dismissLyric() }
                    )
                    .padding(.bottom, 8)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                }
            }
            .animation(.easeInOut(duration: 0.25), value: clipboard.lyricVisible)
            .navigationTitle("AI 翻译助手")
            .onAppear { clipboard.restartIfNeeded() }
            .onDisappear { clipboard.stop() }
            .sheet(isPresented: $showPrivacy) {
                PrivacyConsentView(accepted: .constant(false)) {
                    showPrivacy = false
                    clipboardEnabled = SharedSettings.clipboardMonitoringEnabled
                    clipboard.restartIfNeeded()
                }
                .interactiveDismissDisabled()
            }
        }
    }

    private func langLabel(_ code: String) -> String {
        switch code {
        case "ja": return "日语"
        case "ko": return "韩语"
        default: return "英语"
        }
    }
}
