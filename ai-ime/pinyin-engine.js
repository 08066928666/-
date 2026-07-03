/**
 * 内置拼音引擎 — iOS 式词组/整句候选
 */
(function (global) {
  const SYLLABLES = new Set(
    "a ai an ang ao ba bai ban bang bao bei ben beng bi bian biao bie bin bing bo bu " +
      "ca cai can cang cao ce cen ceng cha chai chan chang chao che chen cheng chi chong chou chu chua chuai chuan chuang chui chun chuo " +
      "ci cong cou cu cuan cui cun cuo da dai dan dang dao de dei den deng di dian diao die ding diu dong dou du duan dui dun duo " +
      "e ei en eng er fa fan fang fei fen feng fo fou fu ga gai gan gang gao ge gei gen geng gong gou gu gua guai guan guang gui gun guo " +
      "ha hai han hang hao he hei hen heng hong hou hu hua huai huan huang hui hun huo ji jia jian jiang jiao jie jin jing jiong jiu ju juan jue jun " +
      "ka kai kan kang kao ke ken keng kong kou ku kua kuai kuan kuang kui kun kuo la lai lan lang lao le lei leng li lia lian liang liao lie lin ling liu long lou lu luan lue lun luo " +
      "lv ma mai man mang mao me mei men meng mi mian miao mie min ming miu mo mou mu na nai nan nang nao ne nei nen neng ni nian niang niao nie nin ning niu nong nou nu nuan nue nun nuo " +
      "nv o ou pa pai pan pang pao pei pen peng pi pian piao pie pin ping po pou pu qi qia qian qiang qiao qie qin qing qiong qiu qu quan que qun " +
      "ran rang rao re ren reng ri rong rou ru rua ruan rui run ruo sa sai san sang sao se sen seng sha shai shan shang shao she shen sheng shi shou shu shua shuai shuan shuang shui shun shuo " +
      "si song sou su suan sui sun suo ta tai tan tang tao te teng ti tian tiao tie ting tong tou tu tuan tui tun tuo " +
      "wa wai wan wang wei wen weng wo wu xi xia xian xiang xiao xie xin xing xiong xiu xu xuan xue xun ya yan yang yao ye yi yin ying yo yong you yu yuan yue yun za zai zan zang zao ze zei zen zeng zha zhai zhan zhang zhao zhe zhei zhen zheng zhi zhong zhou zhu zhua zhuai zhuan zhuang zhui zhun zhuo zi zong zou zu zuan zui zun zuo"
      .split(" ")
  );

  const CHARS = {
    wo: "我握窝沃", ni: "你尼泥腻", hao: "好号毫豪", ma: "吗妈马嘛", de: "的得地",
    shi: "是时事十", le: "了乐", zai: "在再载", lai: "来赖", yi: "一以已意",
    ju: "局举句", ba: "吧把八", xie: "谢写些", hen: "很恨", li: "厉里理力",
    hai: "还海害", ke: "可科克", men: "们门", wan: "玩完万", da: "打大",
    ge: "个哥", jia: "加家", you: "有又游", ren: "人认", bu: "不步",
    hui: "会回", shuo: "说", zen: "怎", yang: "样", shen: "什神",
    me: "么", ne: "呢", a: "啊阿", en: "嗯", ye: "也夜", hen: "很",
    tai: "太台", bu: "不", hui: "会", wan: "玩", kai: "开", xin: "心",
    zhong: "中重", guo: "国", ying: "英", yu: "语", ri: "日", wen: "文",
    jia: "加", shang: "上", ba: "吧", wen: "问", ti: "题", mei: "没",
  };

  const PHRASES = {
    nihao: ["你好"],
    nihaoma: ["你好吗"],
    xiexie: ["谢谢"],
    xiexieni: ["谢谢你"],
    bukeqi: ["不客气"],
    zaijian: ["再见"],
    zaihui: ["再会"],
    meiwenti: ["没问题"],
    jiayou: ["加油"],
    women: ["我们"],
    womenyiqiwan: ["我们一起玩"],
    womenyiqi: ["我们一起"],
    yiqiwan: ["一起玩"],
    yiqi: ["一起"],
    yiqijiayou: ["一起加油"],
    zailaiyiju: ["再来一局"],
    zailaiyijuba: ["再来一局吧"],
    zailai: ["再来"],
    yiju: ["一局"],
    dagao: ["打得好"],
    henlihai: ["很厉害"],
    nihenlihai: ["你很厉害"],
    nihenlihai2: ["你也很厉害"],
    woyehhenkaixin: ["我也很开心"],
    woyewankaixin: ["我也玩得很开心"],
    kaixin: ["开心"],
    zhongguo: ["中国"],
    zhongguoren: ["中国人"],
    woshi: ["我是"],
    woshizhongguoren: ["我是中国人"],
    yingyu: ["英语"],
    yingyubutaihao: ["英语不太好"],
    buhui: ["不会"],
    keyi: ["可以"],
    keyijiawo: ["可以加我"],
    keyijiawoba: ["可以加我吧"],
    jiaba: ["加我吧"],
    haode: ["好的"],
    haodezailaiyijuba: ["好的再来一局吧"],
    haodezailaiyiju: ["好的再来一局"],
    mingbai: ["明白"],
    zhidaole: ["知道了"],
    chong: ["冲"],
    chonga: ["冲啊"],
    zou: ["走"],
    kaishi: ["开始"],
    dengwo: ["等我"],
    mashang: ["马上"],
    mashanglai: ["马上来"],
    laiba: ["来吧"],
    zenmeyang: ["怎么样"],
    shenme: ["什么"],
    zenme: ["怎么"],
    weishenme: ["为什么"],
    duibuqi: ["对不起"],
    meiguanxi: ["没关系"],
    buhaoyisi: ["不好意思"],
    qingwen: ["请问"],
    nishi: ["你是"],
    nali: ["哪里"],
    nali2: ["哪儿"],
    shuide: ["是的"],
    dangran: ["当然"],
    keneng: ["可能"],
    yiding: ["一定"],
    yihou: ["以后"],
    xianzai: ["现在"],
    mingtian: ["明天"],
    jintian: ["今天"],
    zuotian: ["昨天"],
    shangwu: ["上午"],
    xiawu: ["下午"],
    wanshang: ["晚上"],
    zaoan: ["早安"],
    wanan: ["晚安"],
    xihuan: ["喜欢"],
    buxihuan: ["不喜欢"],
    xiang: ["想"],
    xiangwan: ["想玩"],
    xiangyiqiwan: ["想一起玩"],
    keyima: ["可以吗"],
    keyishiishi: ["可以试试"],
    taihaole: ["太好了"],
    taiqiangle: ["太强了"],
    lihai: ["厉害"],
    niubi: ["牛逼"],
    wuliao: ["无聊"],
    kaixinwan: ["开心玩"],
    gaoxing: ["高兴"],
    henkaixin: ["很开心"],
    feichangkaixin: ["非常开心"],
  };

  // 快捷回复整句
  [
    ["nihaowoyewankaixin", "你好！我也玩得很开心。"],
    ["haodezailaiyijuba", "好的，再来一局吧。"],
    ["xiexieniyehenlihai", "谢谢，你也很厉害。"],
    ["woshizhongguorenyingyubutaihao", "我是中国人，英语不太好。"],
    ["meiwentiyiqijiayou", "没问题，一起加油！"],
    ["keyijiawoba", "可以，加我吧。"],
  ].forEach(([py, text]) => {
    PHRASES[py] = [text.replace(/[，。！？]/g, "").replace(/！/g, ""), text];
    PHRASES[py.replace(/[，。！？]/g, "")] = PHRASES[py];
  });
  PHRASES.nihaowoyewankaixin = ["你好！我也玩得很开心。", "你好我也玩得很开心"];
  PHRASES.haodezailaiyijuba = ["好的，再来一局吧。", "好的再来一局吧"];
  PHRASES.xiexieniyehenlihai = ["谢谢，你也很厉害。", "谢谢你也很厉害"];
  PHRASES.woshizhongguorenyingyubutaihao = ["我是中国人，英语不太好。"];
  PHRASES.meiwentiyiqijiayou = ["没问题，一起加油！"];
  PHRASES.keyijiawoba = ["可以，加我吧。"];

  function normalize(py) {
    return (py || "").toLowerCase().replace(/[^a-z]/g, "");
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

  function charsForSyllable(syl) {
    if (!syl) return [];
    const exact = CHARS[syl];
    if (exact) return exact.split("");
    const hits = [];
    for (const [k, v] of Object.entries(CHARS)) {
      if (k.startsWith(syl)) hits.push(...v.split(""));
    }
    return [...new Set(hits)].slice(0, 8);
  }

  function buildFromSyllables(syllables) {
    if (!syllables.length) return [];
    const lists = syllables.map(charsForSyllable).filter((a) => a.length);
    if (!lists.length) return [];
    const out = [];
    function dfs(idx, cur) {
      if (out.length >= 16) return;
      if (idx === lists.length) {
        out.push(cur);
        return;
      }
      for (const c of lists[idx].slice(0, 3)) dfs(idx + 1, cur + c);
    }
    dfs(0, "");
    return out;
  }

  function getCandidates(raw) {
    const py = normalize(raw);
    if (!py) return [];

    const seen = new Set();
    const result = [];
    const push = (text, score) => {
      if (!text || seen.has(text)) return;
      seen.add(text);
      result.push({ text, score });
    };

    if (PHRASES[py]) PHRASES[py].forEach((t, i) => push(t, 100 - i));

    Object.keys(PHRASES)
      .filter((k) => k.startsWith(py) && k !== py)
      .sort((a, b) => b.length - a.length)
      .slice(0, 10)
      .forEach((k, ki) => PHRASES[k].forEach((t, i) => push(t, 85 - ki * 3 - i)));

    const { complete, remainder } = splitPinyin(py);
    if (complete.length >= 2) {
      buildFromSyllables(complete).forEach((t, i) => push(t, 45 - i));
    }
    if (complete.length === 1 && !remainder) {
      charsForSyllable(complete[0]).forEach((c, i) => push(c, 35 - i));
    }
    if (remainder) {
      charsForSyllable(remainder).forEach((c, i) => push(c, 25 - i));
      if (complete.length) {
        buildFromSyllables(complete).slice(0, 2).forEach((base) => {
          charsForSyllable(remainder).slice(0, 2).forEach((c) => push(base + c, 30));
        });
      }
    }

    return result.sort((a, b) => b.score - a.score).slice(0, 9).map((x) => x.text);
  }

  global.PinyinEngine = { getCandidates, splitPinyin, normalize };
})(window);
