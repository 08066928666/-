import React, { useMemo } from "react";
import { computeCostsSummary, formatMoney, isRowActive } from "./hasekoCostsModel.js";
import { quoteDocumentToCostsRows } from "./quoteDocumentModel.js";

/**
 * 長谷工「見積登録」table#Costs に近い御見積プレビュー
 */
export function HasekoMitsumoriPreview({ doc, meta = {}, className = "" }) {
  const costsRows = useMemo(() => quoteDocumentToCostsRows(doc), [doc]);
  const summary = useMemo(() => computeCostsSummary(costsRows), [costsRows]);

  const pageTitle = [meta.estateName, meta.roomNo].filter(Boolean).join(" ") || "見積明細";
  const workTitle = meta.workTitle || doc?.meta?.workTitle || "原状回復工事";

  return (
    <div className={`haseko-mitsumori-preview overflow-hidden rounded-lg border border-[#b8c4d4] bg-white text-[11px] text-slate-900 shadow-sm ${className}`}>
      <div className="border-b border-[#004098] bg-[#004098] px-3 py-2 text-white">
        <div className="text-[10px] font-medium opacity-90">御見積書（プレビュー）</div>
        <div className="text-sm font-bold tracking-tight">{pageTitle}</div>
        <div className="text-[11px] opacity-95">{workTitle}</div>
      </div>

      <div className="max-h-[min(60vh,32rem)] overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10 bg-[#e8f0fe] text-[10px] text-[#004098]">
            <tr>
              <th className="border-b border-slate-300 px-2 py-1.5 text-left font-semibold">区分 / 工事・明細</th>
              <th className="border-b border-slate-300 px-2 py-1.5 text-left font-semibold">場所</th>
              <th className="w-14 border-b border-slate-300 px-1 py-1.5 text-right font-semibold">数量</th>
              <th className="w-10 border-b border-slate-300 px-1 py-1.5 text-center font-semibold">単位</th>
              <th className="w-16 border-b border-slate-300 px-1 py-1.5 text-right font-semibold">単価</th>
              <th className="w-20 border-b border-slate-300 px-2 py-1.5 text-right font-semibold">金額</th>
            </tr>
          </thead>
          <tbody>
            {costsRows.map((r, i) => {
              if (!isRowActive(r)) return null;
              const f = r.fields || {};

              if (r.row_kbn === "1") {
                return (
                  <tr key={i} className="bg-slate-100 font-bold text-slate-800">
                    <td colSpan={6} className="border-b border-slate-200 px-2 py-1.5">
                      【{String(f.koshu1_text || "通常工事").trim()}】
                    </td>
                  </tr>
                );
              }

              if (r.row_kbn === "2") {
                return (
                  <tr key={i} className="bg-[#f0f6ff] font-semibold text-[#004098]">
                    <td colSpan={6} className="border-b border-slate-200 px-2 py-1.5">
                      ■ {String(f.koshu2_text || "工事区分").trim()}
                    </td>
                  </tr>
                );
              }

              if (r.row_kbn === "4") {
                return (
                  <tr key={i} className="italic text-slate-600">
                    <td colSpan={6} className="border-b border-slate-100 px-2 py-1 text-[10px]">
                      ※ {String(f.comment || "").trim()}
                    </td>
                  </tr>
                );
              }

              if (r.row_kbn !== "3") return null;
              return (
                <tr key={i} className="hover:bg-slate-50/80">
                  <td className="border-b border-slate-100 px-2 py-1 align-top">
                    <div className="font-medium">{f.taisho1 || "—"}</div>
                    {f.koji_naiyo ? <div className="text-[10px] text-slate-500">{f.koji_naiyo}</div> : null}
                  </td>
                  <td className="border-b border-slate-100 px-2 py-1 align-top text-slate-600">
                    {[f.basho, f.bui].filter(Boolean).join(" / ") || "—"}
                  </td>
                  <td className="border-b border-slate-100 px-1 py-1 text-right tabular-nums">{f.suryo || "—"}</td>
                  <td className="border-b border-slate-100 px-1 py-1 text-center">{f.tani || "—"}</td>
                  <td className="border-b border-slate-100 px-1 py-1 text-right tabular-nums">{formatMoney(f.tanka)}</td>
                  <td className="border-b border-slate-100 px-2 py-1 text-right font-semibold tabular-nums">{formatMoney(f.kakaku)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="border-t-2 border-[#004098] bg-slate-50 px-3 py-2">
        <table className="ml-auto w-full max-w-xs border-collapse text-[11px]">
          <tbody>
            <tr>
              <td className="py-0.5 pr-3 text-right text-slate-600">工事費計</td>
              <td className="py-0.5 text-right font-semibold tabular-nums">{formatMoney(summary.subtotal)} 円</td>
            </tr>
            <tr>
              <td className="py-0.5 pr-3 text-right text-slate-600">諸経費（{summary.keihiPct}%）</td>
              <td className="py-0.5 text-right tabular-nums">{formatMoney(summary.keihi)} 円</td>
            </tr>
            <tr>
              <td className="py-0.5 pr-3 text-right text-slate-600">出精値引</td>
              <td className="py-0.5 text-right tabular-nums text-rose-700">{formatMoney(summary.nebiki)} 円</td>
            </tr>
            <tr>
              <td className="py-0.5 pr-3 text-right text-slate-600">消費税（10%）</td>
              <td className="py-0.5 text-right tabular-nums">{formatMoney(summary.tax)} 円</td>
            </tr>
            <tr className="text-sm font-bold text-[#004098]">
              <td className="pt-1 pr-3 text-right">御見積総額</td>
              <td className="pt-1 text-right tabular-nums">{formatMoney(summary.sogokei)} 円</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
