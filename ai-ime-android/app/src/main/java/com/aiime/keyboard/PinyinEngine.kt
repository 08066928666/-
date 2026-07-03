package com.aiime.keyboard

import android.content.Context
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader

/**
 * 拼音候选引擎 — 与 Web 版 pinyin-engine.js 逻辑对齐
 */
class PinyinEngine(context: Context) {

    data class Entry(val text: String, val freq: Int)

    private val dict = mutableMapOf<String, List<Entry>>()
    private val chars = mutableMapOf<String, String>()
    private val prefix = mutableMapOf<String, MutableSet<String>>()
    private val keys: List<String>

  private val syllables = setOf(
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
    )

    init {
        val json = context.assets.open("dict.json").use { stream ->
            BufferedReader(InputStreamReader(stream, Charsets.UTF_8)).readText()
        }
        val root = JSONObject(json)
        val dictObj = root.getJSONObject("dict")
        val charsObj = root.getJSONObject("chars")

        for (key in dictObj.keys()) {
            val arr = dictObj.getJSONArray(key)
            val list = mutableListOf<Entry>()
            for (i in 0 until arr.length()) {
                val pair = arr.getJSONArray(i)
                list.add(Entry(pair.getString(0), pair.getInt(1)))
            }
            dict[key] = list
        }
        for (key in charsObj.keys()) {
            chars[key] = charsObj.getString(key)
        }

        for (key in dict.keys) {
            val p2 = key.take(2)
            val p3 = if (key.length >= 3) key.take(3) else p2
            prefix.getOrPut(p2) { mutableSetOf() }.add(key)
            prefix.getOrPut(p3) { mutableSetOf() }.add(key)
        }
        keys = dict.keys.toList()
    }

    fun normalize(py: String): String =
        py.lowercase().replace("'", "").replace(Regex("[^a-z]"), "")

    fun getCandidates(raw: String): List<String> {
        val py = normalize(raw)
        if (py.isEmpty()) return emptyList()

        val seen = linkedSetOf<String>()
        val out = mutableListOf<Pair<String, Int>>()

        fun push(text: String, score: Int) {
            if (text.isEmpty() || seen.contains(text)) return
            seen.add(text)
            out.add(text to score)
        }

        dict[py]?.forEach { (text, freq) -> push(text, 10000 + freq) }

        bucketKeys(py).forEach { key ->
            if (!allowPrefix(py, key)) return@forEach
            val extra = key.length - py.length
            dict[key]?.forEach { (text, freq) ->
                push(text, 7000 + freq - extra * 8)
            }
        }

        segmentSentence(py)?.let { push(it, 6500) }

        val split = splitPinyin(py)
        if (split.remainder.isNotEmpty()) {
            charsForSyllable(split.remainder).forEachIndexed { i, c -> push(c, 3000 - i * 10) }
        } else if (split.complete.size == 1) {
            charsForSyllable(split.complete[0]).forEachIndexed { i, c -> push(c, 3500 - i * 10) }
        }

        return out.sortedByDescending { it.second }.take(9).map { it.first }
    }

    data class SplitResult(val complete: List<String>, val remainder: String)

    fun splitPinyin(py: String): SplitResult {
        val s = normalize(py)
        val complete = mutableListOf<String>()
        var i = 0
        while (i < s.length) {
            var found = ""
            val maxLen = minOf(6, s.length - i)
            for (len in maxLen downTo 1) {
                val part = s.substring(i, i + len)
                if (syllables.contains(part)) {
                    found = part
                    break
                }
            }
            if (found.isEmpty()) break
            complete.add(found)
            i += found.length
        }
        return SplitResult(complete, s.substring(i))
    }

    private fun bucketKeys(py: String): List<String> {
        if (py.isEmpty()) return keys
        val head = if (py.length >= 3) py.take(3) else py.take(2)
        return prefix[head]?.toList() ?: emptyList()
    }

    private fun allowPrefix(py: String, key: String): Boolean {
        if (!key.startsWith(py) || key == py) return false
        val extra = key.length - py.length
        return when {
            py.length <= 1 -> extra <= 2
            py.length <= 2 -> extra <= 4
            py.length <= 4 -> extra <= 8
            else -> extra <= 14
        }
    }

    private fun charsForSyllable(syl: String): List<String> {
        if (syl.isEmpty()) return emptyList()
        chars[syl]?.let { return it.toList().map { c -> c.toString() } }
        dict[syl]?.let { entries ->
            val singles = entries.filter { it.text.length == 1 }.map { it.text }
            if (singles.isNotEmpty()) return singles
        }
        val hits = mutableListOf<String>()
        for ((k, v) in chars) {
            if (k.startsWith(syl)) hits.addAll(v.toList().map { it.toString() })
        }
        return hits.distinct().take(10)
    }

    private fun segmentSentence(py: String): String? {
        val s = normalize(py)
        val n = s.length
        if (n < 4) return null

        data class Node(val score: Int, val text: String)
        val dp = arrayOfNulls<Node>(n + 1)
        dp[0] = Node(0, "")

        for (i in 0 until n) {
            val cur = dp[i] ?: continue
            val maxLen = minOf(8, n - i)
            for (len in maxLen downTo 1) {
                val sub = s.substring(i, i + len)
                val entries = dict[sub] ?: continue
                val (word, freq) = entries.first()
                val score = cur.score + freq - (n - i - len) * 2
                val text = cur.text + word
                val next = dp[i + len]
                if (next == null || score > next.score) {
                    dp[i + len] = Node(score, text)
                }
            }
        }
        return dp[n]?.text
    }
}
