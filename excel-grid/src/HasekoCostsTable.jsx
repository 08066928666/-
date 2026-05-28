import React, { memo, useState } from "react";
import {
  HASEKO_KOSHU2_SEED,
  formatMoney,
  isRowActive,
  withComputedMeisai
} from "./dx/hasekoCostsModel.js";

const UNIT_SUGGEST = ["式", "㎡", "ｍ", "箇所", "ヶ所", "本", "台", "個", "枚"];

function Toggle({ checked, onChange, disabled }) {
  return (
    <label className="dx-switch">
      <input type="checkbox" checked={checked} disabled={disabled}
        onChange={(e) => { e.stopPropagation(); onChange(); }} onClick={(e) => e.stopPropagation()} />
      <span className="dx-slider" />
    </label>
  );
}

/* ═══════════════════════════════════════════
   L3 Meisai Row (Airtable style)
   ═══════════════════════════════════════════ */
const MeisaiRow = memo(function MeisaiRow({
  row, idx, selected, expanded, onSelect, onToggle, onExpand, onField, onMoveUp, onMoveDown, onDelete
}) {
  const active = isRowActive(row);
  const f = withComputedMeisai(row.fields);
  const kakaku = Number(f.kakaku) || 0;
  const kariAmt = Number(f.karinushi_futan_kingaku) || 0;

  return (
    <>
      <tr className={`group transition-colors ${!active ? "row-inactive" : ""}`} onClick={onSelect}>
        {/* ON/OFF */}
        <td className="text-center" style={{ width: 56 }}>
          <Toggle checked={active} onChange={onToggle} />
        </td>
        {/* 場所 */}
        <td>
          <input type="text" className="ghost-input text-sm font-semibold text-slate-600 bg-slate-50 rounded-md"
            value={[f.basho, f.bui].filter(Boolean).join(" / ")} disabled={!active}
            placeholder="場所"
            onChange={(e) => {
              const parts = e.target.value.split(/[\/／]/);
              onField("basho", (parts[0] || "").trim());
              if (parts.length > 1) onField("bui", (parts[1] || "").trim());
            }} />
        </td>
        {/* 工事内容 */}
        <td>
          <input type="text" className="ghost-input font-bold text-slate-800"
            value={f.taisho1} disabled={!active} placeholder="工事内容を入力"
            onChange={(e) => onField("taisho1", e.target.value)} />
        </td>
        {/* 数量 + 単位 */}
        <td>
          <div className="flex items-center justify-end gap-1">
            <input type="number" className="ghost-input num-font text-right font-bold w-20"
              value={f.suryo} disabled={!active}
              onChange={(e) => onField("suryo", e.target.value)} />
            <input type="text" className="ghost-input text-center text-xs text-slate-500 w-12 px-1"
              value={f.tani} disabled={!active} list={`unit-${row.id}`}
              onChange={(e) => onField("tani", e.target.value)} />
            <datalist id={`unit-${row.id}`}>
              {UNIT_SUGGEST.map((u) => <option key={u} value={u} />)}
            </datalist>
          </div>
        </td>
        {/* 単価 */}
        <td>
          <input type="number" className="ghost-input num-font text-right text-slate-800 w-full font-bold"
            value={f.tanka} disabled={!active} placeholder="0"
            onChange={(e) => onField("tanka", e.target.value)} />
        </td>
        {/* 金額 */}
        <td className="text-right pr-4">
          <div className="grid-amount">¥{formatMoney(kakaku)}</div>
          {kariAmt > 0 && <div className="grid-kari">借主 ¥{formatMoney(kariAmt)}</div>}
        </td>
        {/* 操作 */}
        <td>
          <div className="row-actions">
            <button type="button" className="row-action-btn" title="詳細" onClick={(e) => { e.stopPropagation(); onExpand(); }}>
              <i className="fa-solid fa-sliders" />
            </button>
            <button type="button" className="row-action-btn danger" title="削除" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
              <i className="fa-regular fa-trash-can" />
            </button>
          </div>
        </td>
      </tr>

      {/* Expandable sub-row */}
      {expanded && (
        <tr className="sub-row">
          <td />
          <td colSpan={6}>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">施工内容</label>
                <input type="text" className="sub-input w-36" value={f.koji_naiyo} disabled={!active}
                  placeholder="施工内容" onChange={(e) => onField("koji_naiyo", e.target.value)} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">場所</label>
                <input type="text" className="sub-input w-24" value={f.basho} disabled={!active}
                  onChange={(e) => onField("basho", e.target.value)} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">部位</label>
                <input type="text" className="sub-input w-24" value={f.bui} disabled={!active}
                  onChange={(e) => onField("bui", e.target.value)} />
              </div>
              <div className="flex items-center gap-2 bg-blue-50/60 p-2 rounded-lg border border-blue-100">
                <span className="text-[10px] font-bold text-blue-700"><i className="fa-solid fa-scale-balanced mr-1" />負担割合</span>
                <span className="text-[10px] font-bold text-slate-500">貸主</span>
                <input type="text" className="sub-input num-font text-right w-16" value={f.kashinushi_futan_wariai} disabled={!active}
                  onChange={(e) => onField("kashinushi_futan_wariai", e.target.value)} />
                <span className="text-[10px] font-bold text-orange-600">借主</span>
                <input type="text" className="sub-input num-font text-right w-16 text-orange-600" value={f.karinushi_futan_wariai} disabled={!active}
                  onChange={(e) => onField("karinushi_futan_wariai", e.target.value)} />
              </div>
              <div className="flex items-center gap-1 ml-auto">
                <button type="button" className="row-action-btn always-show" title="上へ" onClick={() => onMoveUp()}>
                  <i className="fa-solid fa-chevron-up" />
                </button>
                <button type="button" className="row-action-btn always-show" title="下へ" onClick={() => onMoveDown()}>
                  <i className="fa-solid fa-chevron-down" />
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
});

/* ═══════════════════════════════════════════
   HasekoCostsTable (Airtable Style)
   ═══════════════════════════════════════════ */
export function HasekoCostsTable({
  rows, selectedIdx, onSelectRow, onToggleRow, onToggleKoshu2, onField, onMoveUp, onMoveDown, onDelete
}) {
  const [expandedSet, setExpandedSet] = useState(() => new Set());
  const toggleExpand = (idx) => setExpandedSet((prev) => {
    const next = new Set(prev);
    if (next.has(idx)) next.delete(idx); else next.add(idx);
    return next;
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="overflow-auto">
        <table className="modern-table">
          <thead>
            <tr>
              <th style={{ width: 56 }} className="text-center">ON/OFF</th>
              <th style={{ width: 140 }}>場所 / 内訳</th>
              <th style={{ minWidth: 220 }}>工事内容・明細</th>
              <th style={{ width: 140 }} className="text-right">数量</th>
              <th style={{ width: 110 }} className="text-right">単価(¥)</th>
              <th style={{ width: 120 }} className="text-right">金額(¥)</th>
              <th style={{ width: 64 }} className="text-center">操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const selected = selectedIdx === idx;
              const active = isRowActive(row);
              const expanded = expandedSet.has(idx);

              /* L1 大分類 */
              if (row.row_kbn === "1") {
                return (
                  <tr key={row.id} className="cat-header-row" onClick={() => onSelectRow(idx)}>
                    <td colSpan={7} style={{ padding: "10px 16px" }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <i className="fa-solid fa-layer-group text-blue-500" />
                          <input type="text" className="ghost-input font-bold text-lg text-blue-900"
                            value={row.fields.koshu1_text || ""} placeholder="大分類名"
                            onChange={(e) => onField(idx, "koshu1_text", e.target.value)} />
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button type="button" className="row-action-btn danger" title="削除"
                            onClick={(e) => { e.stopPropagation(); onDelete(idx); }}>
                            <i className="fa-regular fa-trash-can" />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              }

              /* L2 工種 */
              if (row.row_kbn === "2") {
                const f = row.fields;
                return (
                  <tr key={row.id} className={`cat-header-row ${!active ? "row-inactive" : ""}`} onClick={() => onSelectRow(idx)}>
                    <td className="text-center" style={{ width: 56 }}>
                      <Toggle checked={active} onChange={() => onToggleKoshu2(idx)} />
                    </td>
                    <td colSpan={4} style={{ padding: "8px 12px" }}>
                      <div className="flex items-center gap-3 flex-1">
                        <span className="level-badge bg-blue-100 text-blue-700">工種</span>
                        <select className="ghost-input font-semibold text-blue-800" style={{ maxWidth: 160 }}
                          value={f.sel_koshu2_cd || "1"} onClick={(e) => e.stopPropagation()}
                          onChange={(e) => onField(idx, "sel_koshu2_cd", e.target.value)}>
                          {HASEKO_KOSHU2_SEED.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                        </select>
                        <input type="text" className="ghost-input flex-1 font-semibold text-blue-900 text-sm"
                          value={f.koshu2_text || ""} placeholder="工種名" onClick={(e) => e.stopPropagation()}
                          onChange={(e) => onField(idx, "koshu2_text", e.target.value)} />
                      </div>
                    </td>
                    <td />
                    <td className="text-center">
                      <div className="row-actions">
                        <button type="button" className="row-action-btn danger" title="削除"
                          onClick={(e) => { e.stopPropagation(); onDelete(idx); }}>
                          <i className="fa-regular fa-trash-can" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }

              /* L4 コメント */
              if (row.row_kbn === "4") {
                return (
                  <tr key={row.id} onClick={() => onSelectRow(idx)}>
                    <td style={{ width: 56 }}>
                      <span className="level-badge bg-amber-100 text-amber-700 ml-2">※</span>
                    </td>
                    <td colSpan={4}>
                      <div className="flex items-center gap-2">
                        <i className="fa-solid fa-comment text-amber-400 text-xs" />
                        <input type="text" className="ghost-input italic text-slate-500 text-sm"
                          value={row.fields.comment || ""} placeholder="コメントを入力"
                          onChange={(e) => onField(idx, "comment", e.target.value)} />
                      </div>
                    </td>
                    <td />
                    <td className="text-center">
                      <div className="row-actions">
                        <button type="button" className="row-action-btn danger" title="削除"
                          onClick={(e) => { e.stopPropagation(); onDelete(idx); }}>
                          <i className="fa-regular fa-trash-can" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }

              /* L3 明細 */
              return (
                <MeisaiRow key={row.id} row={row} idx={idx} selected={selected} expanded={expanded}
                  onSelect={() => onSelectRow(idx)}
                  onToggle={() => onToggleRow(idx)}
                  onExpand={() => toggleExpand(idx)}
                  onField={(field, val) => onField(idx, field, val)}
                  onMoveUp={() => onMoveUp(idx)}
                  onMoveDown={() => onMoveDown(idx)}
                  onDelete={() => { if (window.confirm("削除しますか？")) onDelete(idx); }}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <div className="empty-state py-16">
          <div className="empty-state-icon"><i className="fa-solid fa-table-cells-large" /></div>
          <p className="text-sm font-medium">見積明細がありません</p>
          <p className="text-xs mt-1">「サンプル読込」またはHTMLからインポートしてください</p>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   HasekoCostsSummary
   ═══════════════════════════════════════════ */
export function HasekoCostsSummary({ summary }) {
  const s = summary;
  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="bg-slate-800 text-white">
            <th className="py-2.5 px-4 text-left font-semibold" colSpan={2}>項目</th>
            <th className="py-2.5 px-4 text-right font-semibold">金額</th>
            <th className="py-2.5 px-4 text-right font-semibold">借主負担</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          <tr>
            <td className="py-2.5 px-4 font-medium" colSpan={2}>小計</td>
            <td className="py-2.5 px-4 text-right num-font">{formatMoney(s.subtotal)}</td>
            <td className="py-2.5 px-4 text-right num-font text-orange-600">{formatMoney(s.kariSub)}</td>
          </tr>
          <tr className="bg-slate-50/50">
            <td className="py-2 px-4 text-slate-500">諸経費</td>
            <td className="py-2 px-1 text-[10px] text-slate-400 num-font">{s.keihiPct.toFixed(1)}%</td>
            <td className="py-2 px-4 text-right num-font">{formatMoney(s.keihi)}</td>
            <td className="py-2 px-4 text-right num-font text-slate-300">0</td>
          </tr>
          <tr>
            <td className="py-2.5 px-4 font-medium" colSpan={2}>中計</td>
            <td className="py-2.5 px-4 text-right num-font font-semibold">{formatMoney(s.chukei)}</td>
            <td className="py-2.5 px-4 text-right num-font text-orange-600">{formatMoney(s.kariSub)}</td>
          </tr>
          <tr className="bg-slate-50/50">
            <td className="py-2 px-4 text-slate-500">出精値引</td>
            <td className="py-2 px-1 text-[10px] text-slate-400">桁{s.nebikiDigit}</td>
            <td className="py-2 px-4 text-right num-font text-rose-600">{formatMoney(s.nebiki)}</td>
            <td className="py-2 px-4 text-right num-font text-slate-300">0</td>
          </tr>
          <tr>
            <td className="py-2.5 px-4 font-medium" colSpan={2}>合計（税抜）</td>
            <td className="py-2.5 px-4 text-right num-font font-semibold">{formatMoney(s.gokeiWoZei)}</td>
            <td className="py-2.5 px-4 text-right num-font text-orange-600">{formatMoney(s.kariSub)}</td>
          </tr>
          <tr className="bg-slate-50/50">
            <td className="py-2 px-4 text-slate-500">消費税</td>
            <td className="py-2 px-1 text-[10px] text-slate-400 num-font">10%</td>
            <td className="py-2 px-4 text-right num-font">{formatMoney(s.tax)}</td>
            <td className="py-2 px-4 text-right num-font text-orange-600">{formatMoney(Math.floor(s.kariSub * 0.1))}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr className="bg-slate-900 text-white">
            <td className="py-3 px-4 text-sm font-bold" colSpan={2}>
              <i className="fa-solid fa-calculator mr-1.5 text-emerald-400" /> 税込合計
            </td>
            <td className="py-3 px-4 text-right text-lg font-black num-font text-emerald-300">
              ¥{formatMoney(s.sogokei)}
            </td>
            <td className="py-3 px-4 text-right text-sm font-bold num-font text-orange-300">
              ¥{formatMoney(s.kariSub + Math.floor(s.kariSub * 0.1))}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
