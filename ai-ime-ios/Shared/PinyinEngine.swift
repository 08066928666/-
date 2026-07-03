import Foundation

/// 拼音候选引擎 — 与 Android / Web 版逻辑对齐
final class PinyinEngine {
    struct Entry {
        let text: String
        let freq: Int
    }

    private let dict: [String: [Entry]]
    private let chars: [String: String]
    private let prefix: [String: Set<String>]
    private let keys: [String]

    private static let syllables: Set<String> = [
        "a", "ai", "an", "ang", "ao", "ba", "bai", "ban", "bang", "bao", "bei", "ben", "beng", "bi", "bian", "biao", "bie", "bin", "bing", "bo", "bu",
        "ca", "cai", "can", "cang", "cao", "ce", "cen", "ceng", "cha", "chai", "chan", "chang", "chao", "che", "chen", "cheng", "chi", "chong", "chou",
        "chu", "chua", "chuai", "chuan", "chuang", "chui", "chun", "chuo", "ci", "cong", "cou", "cu", "cuan", "cui", "cun", "cuo", "da", "dai", "dan",
        "dang", "dao", "de", "dei", "den", "deng", "di", "dian", "diao", "die", "ding", "diu", "dong", "dou", "du", "duan", "dui", "dun", "duo", "e",
        "ei", "en", "eng", "er", "fa", "fan", "fang", "fei", "fen", "feng", "fo", "fou", "fu", "ga", "gai", "gan", "gang", "gao", "ge", "gei", "gen",
        "geng", "gong", "gou", "gu", "gua", "guai", "guan", "guang", "gui", "gun", "guo", "ha", "hai", "han", "hang", "hao", "he", "hei", "hen", "heng",
        "hong", "hou", "hu", "hua", "huai", "huan", "huang", "hui", "hun", "huo", "ji", "jia", "jian", "jiang", "jiao", "jie", "jin", "jing", "jiong",
        "jiu", "ju", "juan", "jue", "jun", "ka", "kai", "kan", "kang", "kao", "ke", "ken", "keng", "kong", "kou", "ku", "kua", "kuai", "kuan", "kuang",
        "kui", "kun", "kuo", "la", "lai", "lan", "lang", "lao", "le", "lei", "leng", "li", "lia", "lian", "liang", "liao", "lie", "lin", "ling", "liu",
        "long", "lou", "lu", "luan", "lue", "lun", "luo", "lv", "ma", "mai", "man", "mang", "mao", "me", "mei", "men", "meng", "mi", "mian", "miao",
        "mie", "min", "ming", "miu", "mo", "mou", "mu", "na", "nai", "nan", "nang", "nao", "ne", "nei", "nen", "neng", "ni", "nian", "niang", "niao",
        "nie", "nin", "ning", "niu", "nong", "nou", "nu", "nuan", "nue", "nun", "nuo", "nv", "o", "ou", "pa", "pai", "pan", "pang", "pao", "pei", "pen",
        "peng", "pi", "pian", "piao", "pie", "pin", "ping", "po", "pou", "pu", "qi", "qia", "qian", "qiang", "qiao", "qie", "qin", "qing", "qiong", "qiu",
        "qu", "quan", "que", "qun", "ran", "rang", "rao", "re", "ren", "reng", "ri", "rong", "rou", "ru", "rua", "ruan", "rui", "run", "ruo", "sa", "sai",
        "san", "sang", "sao", "se", "sen", "seng", "sha", "shai", "shan", "shang", "shao", "she", "shen", "sheng", "shi", "shou", "shu", "shua", "shuai",
        "shuan", "shuang", "shui", "shun", "shuo", "si", "song", "sou", "su", "suan", "sui", "sun", "suo", "ta", "tai", "tan", "tang", "tao", "te", "teng",
        "ti", "tian", "tiao", "tie", "ting", "tong", "tou", "tu", "tuan", "tui", "tun", "tuo", "wa", "wai", "wan", "wang", "wei", "wen", "weng", "wo",
        "wu", "xi", "xia", "xian", "xiang", "xiao", "xie", "xin", "xing", "xiong", "xiu", "xu", "xuan", "xue", "xun", "ya", "yan", "yang", "yao", "ye",
        "yi", "yin", "ying", "yo", "yong", "you", "yu", "yuan", "yue", "yun", "za", "zai", "zan", "zang", "zao", "ze", "zei", "zen", "zeng", "zha", "zhai",
        "zhan", "zhang", "zhao", "zhe", "zhei", "zhen", "zheng", "zhi", "zhong", "zhou", "zhu", "zhua", "zhuai", "zhuan", "zhuang", "zhui", "zhun", "zhuo",
        "zi", "zong", "zou", "zu", "zuan", "zui", "zun", "zuo"
    ]

    init?() {
        guard let url = Bundle.main.url(forResource: "dict", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let root = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let dictObj = root["dict"] as? [String: [[Any]]],
              let charsObj = root["chars"] as? [String: String] else { return nil }

        var builtDict: [String: [Entry]] = [:]
        for (key, rows) in dictObj {
            builtDict[key] = rows.compactMap { row -> Entry? in
                guard row.count >= 2,
                      let text = row[0] as? String,
                      let freq = row[1] as? Int else { return nil }
                return Entry(text: text, freq: freq)
            }
        }
        dict = builtDict
        chars = charsObj

        var builtPrefix: [String: Set<String>] = [:]
        for key in dict.keys {
            let p2 = String(key.prefix(2))
            let p3 = key.count >= 3 ? String(key.prefix(3)) : p2
            builtPrefix[p2, default: []].insert(key)
            builtPrefix[p3, default: []].insert(key)
        }
        prefix = builtPrefix
        keys = Array(dict.keys)
    }

    func normalize(_ py: String) -> String {
        py.lowercased().replacingOccurrences(of: "'", with: "").filter { $0.isLetter && $0.isASCII }
    }

    func getCandidates(_ raw: String) -> [String] {
        let py = normalize(raw)
        if py.isEmpty { return [] }

        var seen = Set<String>()
        var out: [(String, Int)] = []

        func push(_ text: String, _ score: Int) {
            guard !text.isEmpty, !seen.contains(text) else { return }
            seen.insert(text)
            out.append((text, score))
        }

        dict[py]?.forEach { push($0.text, 10000 + $0.freq) }

        for key in bucketKeys(py) {
            guard allowPrefix(py, key) else { continue }
            let extra = key.count - py.count
            dict[key]?.forEach { push($0.text, 7000 + $0.freq - extra * 8) }
        }

        if let seg = segmentSentence(py) { push(seg, 6500) }

        let split = splitPinyin(py)
        if !split.remainder.isEmpty {
            charsForSyllable(split.remainder).enumerated().forEach { push($1, 3000 - $0 * 10) }
        } else if split.complete.count == 1 {
            charsForSyllable(split.complete[0]).enumerated().forEach { push($1, 3500 - $0 * 10) }
        }

        return out.sorted { $0.1 > $1.1 }.prefix(9).map { $0.0 }
    }

    struct SplitResult {
        let complete: [String]
        let remainder: String
    }

    func splitPinyin(_ py: String) -> SplitResult {
        let s = normalize(py)
        var complete: [String] = []
        var i = s.startIndex
        while i < s.endIndex {
            var found = ""
            let remain = s.distance(from: i, to: s.endIndex)
            for len in stride(from: min(6, remain), through: 1, by: -1) {
                let end = s.index(i, offsetBy: len)
                let part = String(s[i..<end])
                if Self.syllables.contains(part) { found = part; break }
            }
            if found.isEmpty { break }
            complete.append(found)
            i = s.index(i, offsetBy: found.count)
        }
        return SplitResult(complete: complete, remainder: String(s[i...]))
    }

    private func bucketKeys(_ py: String) -> [String] {
        if py.isEmpty { return keys }
        let head = py.count >= 3 ? String(py.prefix(3)) : String(py.prefix(2))
        return Array(prefix[head] ?? [])
    }

    private func allowPrefix(_ py: String, _ key: String) -> Bool {
        guard key.hasPrefix(py), key != py else { return false }
        let extra = key.count - py.count
        if py.count <= 1 { return extra <= 2 }
        if py.count <= 2 { return extra <= 4 }
        if py.count <= 4 { return extra <= 8 }
        return extra <= 14
    }

    private func charsForSyllable(_ syl: String) -> [String] {
        if syl.isEmpty { return [] }
        if let c = chars[syl] { return c.map { String($0) } }
        if let entries = dict[syl] {
            let singles = entries.filter { $0.text.count == 1 }.map { $0.text }
            if !singles.isEmpty { return singles }
        }
        var hits: [String] = []
        for (k, v) in chars where k.hasPrefix(syl) {
            hits.append(contentsOf: v.map { String($0) })
        }
        return Array(Set(hits)).prefix(10).map { $0 }
    }

    private func segmentSentence(_ py: String) -> String? {
        let s = normalize(py)
        let n = s.count
        if n < 4 { return nil }

        struct Node { let score: Int; let text: String }
        var dp = [Node?](repeating: nil, count: n + 1)
        dp[0] = Node(score: 0, text: "")

        let chars = Array(s)
        for i in 0..<n {
            guard let cur = dp[i] else { continue }
            for len in stride(from: min(8, n - i), through: 1, by: -1) {
                let sub = String(chars[i..<(i + len)])
                guard let entries = dict[sub], let first = entries.first else { continue }
                let score = cur.score + first.freq - (n - i - len) * 2
                let text = cur.text + first.text
                if dp[i + len] == nil || score > dp[i + len]!.score {
                    dp[i + len] = Node(score: score, text: text)
                }
            }
        }
        return dp[n]?.text
    }

    func consumeComposing(_ raw: String, word: String) -> String {
        let py = normalize(raw)
        if py.isEmpty || word.isEmpty { return "" }

        for len in stride(from: min(py.count, 24), through: 1, by: -1) {
            let prefix = String(py.prefix(len))
            if let entries = dict[prefix], entries.contains(where: { $0.text == word }) {
                return String(py.dropFirst(len))
            }
        }

        if segmentSentence(py) == word { return "" }

        let split = splitPinyin(py)
        if word.count == 1 {
            if !split.remainder.isEmpty {
                let chars = charsForSyllable(split.remainder)
                if chars.contains(word) { return String(py.dropFirst(split.remainder.count)) }
            }
            if split.complete.count == 1 {
                let chars = charsForSyllable(split.complete[0])
                if chars.contains(word) { return String(py.dropFirst(split.complete[0].count)) }
            }
        }
        return ""
    }
}
