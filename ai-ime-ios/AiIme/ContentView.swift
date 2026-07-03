import SwiftUI

@main
struct AiImeApp: App {
    @StateObject private var clipboard = ClipboardMonitor()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(clipboard)
                .onAppear { clipboard.start() }
                .onDisappear { clipboard.stop() }
        }
    }
}

struct ContentView: View {
    @EnvironmentObject private var clipboard: ClipboardMonitor
    @State private var smartMode = SharedSettings.smartMode
    @State private var targetLang = SharedSettings.targetLang

    var body: some View {
        NavigationStack {
            ZStack(alignment: .bottom) {
                List {
                    Section("安装键盘") {
                        Text("1. 打开「设置 → 通用 → 键盘 → 键盘」")
                        Text("2. 添加新键盘 → 选择「AI 翻译输入法」")
                        Text("3. 开启「允许完全访问」（发送翻译与剪贴板歌词条需要）")
                        Text("4. 在 LINE、微信等 App 中点地球图标切换键盘")
                    }
                    Section("收消息 · 复制歌词条") {
                        Text("在聊天 App 里长按复制外文消息")
                        Text("本 App 或键盘上方会显示歌词式双行字幕")
                    }
                    Section("发消息 · 发送翻译") {
                        Toggle("智能翻译", isOn: $smartMode)
                            .onChange(of: smartMode) { SharedSettings.smartMode = $0 }
                        HStack {
                            Text("目标语言")
                            Spacer()
                            Text(langLabel(targetLang))
                                .foregroundStyle(.secondary)
                            Button("切换") {
                                targetLang = SharedSettings.cycleTargetLang()
                            }
                        }
                        Text("输入中文后点「发送」，自动译成外语并附带中文对照")
                    }
                    Section("说明") {
                        Text("iOS 无法自动读取 LINE 私聊，请复制消息。歌词条在复制后自动出现。")
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
