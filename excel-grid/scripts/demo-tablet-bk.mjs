/**
 * 演示 B〜K 列从一条「明細」行对象如何填充（与手风琴内 MeisaiBkGrid 同源逻辑）
 * 运行: node scripts/demo-tablet-bk.mjs
 */
import { MEISAI_BK_COLUMNS, meisaiLineToBkCells } from "../src/dx/tabletMeisaiBkColumns.js";

const sampleLine = {
  item_name: "水栓交換",
  basho: "キッチン",
  quantity: 1,
  unit: "台",
  unit_price: 24143,
  fields: {
    row_kbn: "3",
    koji_naiyo: "キッチン水栓交換工事",
    taisho1: "水栓交換",
    taisho2: "シングルレバー混合栓",
    basho: "キッチン",
    bui: "シンク上",
    suryo: "1",
    tani: "台",
    tanka: "24143",
    biko1: "漏水あり",
    maker: "TOTO",
    type: "TKGG31E"
  }
};

const cells = meisaiLineToBkCells(sampleLine);

console.log("=== B〜K 列（meisaiLineToBkCells 実行結果）===\n");
for (const col of MEISAI_BK_COLUMNS) {
  const key = `${col.id}_${col.label}`;
  console.log(key.padEnd(16), "|", cells[key] ?? "—");
}
console.log("\n（浏览器：巡検 → HTML 取込 → 手风琴展开明細，表格与上列一致）\n");
