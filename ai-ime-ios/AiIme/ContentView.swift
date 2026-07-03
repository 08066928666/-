import SwiftUI

@main
struct AiImeApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}

struct ContentView: View {
    var body: some View {
        NavigationStack {
            List {
                Section("安装键盘") {
                    Text("1. 打开「设置 → 通用 → 键盘 → 键盘」")
                    Text("2. 添加新键盘 → 选择「AI 游戏输入法」")
                    Text("3. 在 Steam / 游戏 App 中点地球图标切换键盘")
                }
                Section("功能") {
                    Text("拼音输入 + 词组候选")
                    Text("智能模式：中文 → 外语 + 中文对照")
                    Text("收消息：复制外文后可在宿主 App 查看对照（扩展权限限制）")
                }
                Section("说明") {
                    Text("iOS 键盘扩展无法直接读取其他 App 聊天内容，请复制消息到剪贴板，在完整版中配合宿主 App 翻译。")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("AI 游戏输入法")
        }
    }
}
