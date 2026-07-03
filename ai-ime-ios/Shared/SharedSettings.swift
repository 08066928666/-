import Foundation

/// 宿主 App 与键盘扩展共享偏好（需 Xcode 配置 App Group `group.com.aiime.translate`）
enum SharedSettings {
    static let appGroupId = "group.com.aiime.translate"

    private static var defaults: UserDefaults {
        UserDefaults(suiteName: appGroupId) ?? .standard
    }

    // MARK: - 合规开关（默认保守，见 COMPLIANCE_合规与隐私.md）

    /// 用户已阅读并同意隐私说明
    static var privacyConsentAccepted: Bool {
        get { defaults.bool(forKey: "privacyConsentAccepted") }
        set { defaults.set(newValue, forKey: "privacyConsentAccepted") }
    }

    /// 复制即译：监听剪贴板（须用户明示开启）
    static var clipboardMonitoringEnabled: Bool {
        get { defaults.bool(forKey: "clipboardMonitoringEnabled") }
        set { defaults.set(newValue, forKey: "clipboardMonitoringEnabled") }
    }

    /// 云端翻译 API（须单独同意；演示词典可不开启）
    static var cloudTranslationEnabled: Bool {
        get { defaults.bool(forKey: "cloudTranslationEnabled") }
        set { defaults.set(newValue, forKey: "cloudTranslationEnabled") }
    }

    // MARK: - 功能偏好

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

    /// 键盘与宿主同步最近一次复制（仅开启剪贴板监听时写入）
    static var lastClipboard: String? {
        get { defaults.string(forKey: "lastClipboard") }
        set { defaults.set(newValue, forKey: "lastClipboard") }
    }

    /// 疑似验证码/密码的剪贴板内容不展示歌词条
    static func isSensitiveClipboard(_ text: String) -> Bool {
        let t = text.trimmingCharacters(in: .whitespacesAndNewlines)
        if t.count >= 4 && t.count <= 8 && t.allSatisfy(\.isNumber) { return true }
        if t.lowercased().contains("password") || t.contains("密码") { return true }
        return false
    }
}
