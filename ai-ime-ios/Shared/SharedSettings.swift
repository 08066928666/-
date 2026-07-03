import Foundation

/// 宿主 App 与键盘扩展共享偏好（需 Xcode 配置 App Group `group.com.aiime.translate`）
enum SharedSettings {
    static let appGroupId = "group.com.aiime.translate"

    private static var defaults: UserDefaults {
        UserDefaults(suiteName: appGroupId) ?? .standard
    }

    static var smartMode: Bool {
        get { defaults.object(forKey: "smartMode") as? Bool ?? true }
        set { defaults.set(newValue, forKey: "smartMode") }
    }

    static var targetLang: String {
        get { defaults.string(forKey: "targetLang") ?? "en" }
        set { defaults.set(newValue, forKey: "targetLang") }
    }

    static func cycleTargetLang() -> String {
        let next: String
        switch targetLang {
        case "en": next = "ja"
        case "ja": next = "ko"
        default: next = "en"
        }
        targetLang = next
        return next
    }

    static var lastClipboard: String? {
        get { defaults.string(forKey: "lastClipboard") }
        set { defaults.set(newValue, forKey: "lastClipboard") }
    }
}
