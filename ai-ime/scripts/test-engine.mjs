import fs from "fs";
import vm from "vm";

const ctx = { window: {}, console };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync("/workspace/ai-ime/dict-words.js", "utf8"), ctx);
vm.runInContext(fs.readFileSync("/workspace/ai-ime/pinyin-engine.js", "utf8"), ctx);
const { PinyinEngine } = ctx.window;

for (const t of ["ni", "nihao", "women", "womenyiqiwan", "haodezailaiyijuba"]) {
  console.log(t, "->", PinyinEngine.getCandidates(t).slice(0, 6).join(" | "));
}
console.log("dict keys:", PinyinEngine.dictSize);
const t0 = performance.now();
for (let i = 0; i < 300; i++) PinyinEngine.getCandidates("nihaowomenyiqi");
console.log("300 queries ms:", Math.round(performance.now() - t0));
