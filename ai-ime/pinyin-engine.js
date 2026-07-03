/**
 * iOS 级拼音引擎 — 基于开源词库 (mozillazg/phrase-pinyin-data)
 * 依赖: dict-words.js 提供 window.IME_DICT / window.IME_CHARS
 */
(function (global) {
  const DICT = global.IME_DICT || {};
  const CHARS = global.IME_CHARS || {};

  const SYLLABLES = new Set(
    "a ai an ang ao ba bai ban bang bao bei ben beng bi bian biao bie bin bing bo bu ca cai can cang cao ce cen ceng " +
      "cha chai chan chang chao che chen cheng chi chong chou chu chua chuai chuan chuang chui chun chuo ci cong cou cu cuan cui cun cuo " +
      "da dai dan dang dao de dei den deng di dian diao die ding diu dong dou du duan dui dun duo e ei en eng er fa fan fang fei fen feng fo fou fu " +
      "ga gai gan gang gao ge gei gen geng gong gou gu gua guai guan guang gui gun guo ha hai han hang hao he hei hen heng hong hou hu hua huai huan huang hui hun huo " +
      "ji jia jian jiang jiao jie jin jing jiong jiu ju juan jue jun ka kai kan kang kao ke ken keng kong kou ku kua kuai kuan kuang kui kun kuo " +
      "la lai lan lang lao le lei leng li lia lian liang liao lie lin ling liu long lou lu luan lue lun luo lv ma mai man mang mao me mei men meng mi mian miao mie min ming miu mo mou mu " +
      "na nai nan nang nao ne nei nen neng ni nian niang niao nie nin ning niu nong nou nu nuan nue nun nuo nv o ou pa pai pan pang pao pei pen peng pi pian piao pie pin ping po pou pu " +
      "qi qia qian qiang qiao qie qin qing qiong qiu qu quan que qun ran rang rao re ren reng ri rong rou ru rua ruan rui run ruo sa sai san sang sao se sen seng " +
      "sha shai shan shang shao she shen sheng shi shou shu shua shuai shuan shuang shui shun shuo si song sou su suan sui sun suo ta tai tan tang tao te teng ti tian tiao tie ting tong tou tu tuan tui tun tuo " +
      "wa wai wan wang wei wen weng wo wu xi xia xian xiang xiao xie xin xing xiong xiu xu xuan xue xun ya yan yang yao ye yi yin ying yo yong you yu yuan yue yun " +
      "za zai zan zang zao ze zei zen zeng zha zhai zhan zhang zhao zhe zhei zhen zheng zhi zhong zhou zhu zhua zhuai zhuan zhuang zhui zhun zhuo zi zong zou zu zuan zui zun zuo".split(" ")
  );

  // 前缀索引，避免每次遍历 4 万键
  const PREFIX = Object.create(null);
  const KEYS = Object.keys(DICT);

  for (const key of KEYS) {
    const p2 = key.slice(0, 2);
    const p3 = key.length >= 3 ? key.slice(0, 3) : p2;
    (PREFIX[p2] ||= new Set()).add(key);
    (PREFIX[p3] ||= new Set()).add(key);
  }

  function normalize(py) {
    return (py || "").toLowerCase().replace(/'/g, "").replace(/[^a-z]/g, "");
  }

  function splitPinyin(py) {
    const s = normalize(py);
    const complete = [];
    let i = 0;
    while (i < s.length) {
      let found = "";
      for (let len = Math.min(6, s.length - i); len >= 1; len--) {
        const part = s.slice(i, i + len);
        if (SYLLABLES.has(part)) {
          found = part;
          break;
        }
      }
      if (!found) break;
      complete.push(found);
      i += found.length;
    }
    return { complete, remainder: s.slice(i) };
  }

  function bucketKeys(py) {
    if (!py) return KEYS;
    const head = py.length >= 3 ? py.slice(0, 3) : py.slice(0, 2);
    const set = PREFIX[head];
    if (!set) return [];
    return [...set];
  }

  function allowPrefix(py, key) {
    if (!key.startsWith(py) || key === py) return false;
    const extra = key.length - py.length;
    if (py.length <= 1) return extra <= 2;
    if (py.length <= 2) return extra <= 4;
    if (py.length <= 4) return extra <= 8;
    return extra <= 14;
  }

  function charsForSyllable(syl) {
    if (!syl) return [];
    const fromDict = CHARS[syl];
    if (fromDict) return fromDict.split("");
    if (DICT[syl]) {
      const singles = DICT[syl].filter(([t]) => [...t].length === 1).map(([t]) => t);
      if (singles.length) return singles;
    }
    const hits = [];
    for (const [k, v] of Object.entries(CHARS)) {
      if (k.startsWith(syl)) hits.push(...v.split(""));
    }
    return [...new Set(hits)].slice(0, 10);
  }

  function segmentSentence(py) {
    const s = normalize(py);
    const n = s.length;
    if (n < 4) return null;
    const dp = new Array(n + 1).fill(null);
    dp[0] = { score: 0, text: "" };

    for (let i = 0; i < n; i++) {
      if (!dp[i]) continue;
      for (let len = Math.min(8, n - i); len >= 1; len--) {
        const sub = s.slice(i, i + len);
        const entries = DICT[sub];
        if (!entries || !entries.length) continue;
        const [word, freq] = entries[0];
        const score = dp[i].score + freq - (n - i - len) * 2;
        const text = dp[i].text + word;
        if (!dp[i + len] || score > dp[i + len].score) {
          dp[i + len] = { score, text };
        }
      }
    }
    return dp[n]?.text || null;
  }

  function getCandidates(raw) {
    const py = normalize(raw);
    if (!py) return [];

    const seen = new Set();
    const out = [];
    const push = (text, score) => {
      if (!text || seen.has(text)) return;
      seen.add(text);
      out.push({ text, score });
    };

    if (DICT[py]) {
      for (const [text, freq] of DICT[py]) push(text, 10000 + freq);
    }

    for (const key of bucketKeys(py)) {
      if (!allowPrefix(py, key)) continue;
      const extra = key.length - py.length;
      for (const [text, freq] of DICT[key]) {
        push(text, 7000 + freq - extra * 8);
      }
    }

    const segmented = segmentSentence(py);
    if (segmented) push(segmented, 6500);

    const { complete, remainder } = splitPinyin(py);
    if (remainder) {
      charsForSyllable(remainder).forEach((c, i) => push(c, 3000 - i * 10));
    } else if (complete.length === 1) {
      charsForSyllable(complete[0]).forEach((c, i) => push(c, 3500 - i * 10));
    }

    return out
      .sort((a, b) => b.score - a.score)
      .slice(0, 9)
      .map((x) => x.text);
  }

  global.PinyinEngine = {
    getCandidates,
    splitPinyin,
    normalize,
    dictSize: KEYS.length,
  };
})(window);
