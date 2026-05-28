import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { INSPECTION_DRAFT_KEY as DRAFT_KEY } from "../siteMeetExport.js";
import { MEISAI_BK_COLUMNS, meisaiLineToBkCells } from "./tabletMeisaiBkColumns.js";

const LINE_KIND_BADGE = {
  main: { label: "本体", className: "bg-sky-100 text-sky-950" },
  fee: { label: "諸費", className: "bg-orange-100 text-orange-950" },
  parts: { label: "部材", className: "bg-slate-200 text-slate-900" },
  other: { label: "他", className: "bg-slate-50 text-slate-600" }
};

function MeisaiBkGrid({ ln }) {
  const cells = meisaiLineToBkCells(ln);
  return (
    <div className="mt-1.5 overflow-x-auto rounded border border-slate-200/90 bg-white">
      <div className="grid min-w-[640px] grid-cols-10 divide-x divide-slate-200 border-b border-slate-200 bg-slate-100/90 text-[8px] font-semibold text-slate-700">
        {MEISAI_BK_COLUMNS.map((c) => (
          <div key={c.id} className="px-1 py-1 text-center leading-tight">
            {c.id}_{c.label}
          </div>
        ))}
      </div>
      <div className="grid min-w-[640px] grid-cols-10 divide-x divide-slate-100 text-[9px] text-slate-900">
        {MEISAI_BK_COLUMNS.map((c) => {
          const v = cells[`${c.id}_${c.label}`] || "—";
          return (
            <div key={c.id} className="max-h-24 overflow-y-auto px-1 py-1 text-left align-top leading-snug break-words">
              {v}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WorkPackagesTabletSketch({ packages }) {
  const [openPkgId, setOpenPkgId] = useState("");
  useEffect(() => {
    if (packages?.length) setOpenPkgId(packages[0].id);
    else setOpenPkgId("");
  }, [packages]);

  if (!Array.isArray(packages) || packages.length === 0) return null;

  const togglePkg = (id) => {
    setOpenPkgId((cur) => (cur === id ? "" : id));
  };

  return (
    <div className="mt-2 rounded border border-indigo-200 bg-indigo-50/40 p-2 text-[11px] text-slate-800">
      <div className="mb-1.5 font-bold text-indigo-950">平板見積イメージ（手风琴・工事パッケージ）</div>
      <p className="mb-2 text-[9px] leading-snug text-slate-600">
        各「工事2」ブロックをヘッダに、紐づく明細を開閉で表示します。水栓の「本体＋同上設備交換費」などは同一パッケージ内の行です。
      </p>
      <div className="max-h-80 space-y-1 overflow-y-auto rounded border border-indigo-100 bg-white p-1 shadow-inner">
        {packages.map((p) => {
          const open = openPkgId === p.id;
          return (
            <details
              key={p.id}
              open={open}
              className="work-pkg-accordion group rounded-lg border-2 border-indigo-100/90 bg-slate-50/90 open:border-[var(--haseko-green)]/50 open:bg-white"
            >
              <summary
                className="cursor-pointer list-none px-2 py-2 marker:hidden [&::-webkit-details-marker]:hidden"
                onClick={(e) => {
                  e.preventDefault();
                  togglePkg(p.id);
                }}
              >
                <span className="flex items-start gap-2">
                  <span
                    className={`mt-0.5 inline-block shrink-0 text-[10px] text-slate-500 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
                    aria-hidden
                  >
                    ▸
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="font-semibold text-slate-900">{p.title}</span>
                    {p.daiBunrui ? (
                      <span className="mt-0.5 block truncate text-[9px] font-normal text-slate-500">〔{p.daiBunrui}〕</span>
                    ) : null}
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[9px] font-normal text-slate-600">
                      {p.koshu2Id ? <span className="font-mono">cd {p.koshu2Id}</span> : null}
                      <span className="tabular-nums">{p.lines.length} 明細</span>
                      {p.comments?.length > 0 ? <span className="text-violet-700">コメント {p.comments.length}</span> : null}
                    </span>
                  </span>
                </span>
              </summary>
              <div className="border-t border-slate-100 px-2 pb-2 pt-1">
                {p.lines.length === 0 ? (
                  <p className="text-[10px] text-slate-500">このパッケージに明細行はありません。</p>
                ) : (
                  <ul className="m-0 list-none space-y-1.5 p-0">
                    {p.lines.map((ln) => {
                      const badge = LINE_KIND_BADGE[ln.lineKind] || LINE_KIND_BADGE.other;
                      return (
                        <li key={ln.htmlIndex} className="rounded border border-slate-100 bg-slate-50/50 px-2 py-1.5 text-[10px] leading-snug">
                          <div className="flex flex-wrap items-baseline gap-1">
                            <span className={`shrink-0 rounded px-1 text-[8px] font-bold ${badge.className}`}>{badge.label}</span>
                            <span className="min-w-0 flex-1 font-semibold text-slate-900">{ln.item_name}</span>
                          </div>
                          <MeisaiBkGrid ln={ln} />
                          {ln.summaryLine2 ? <div className="mt-1 text-[9px] text-slate-500">{ln.summaryLine2}</div> : null}
                        </li>
                      );
                    })}
                  </ul>
                )}
                {p.comments?.length > 0 ? (
                  <div className="mt-2 border-t border-violet-100 pt-2">
                    <div className="mb-0.5 text-[9px] font-bold text-violet-900">コメント</div>
                    <ul className="m-0 list-none space-y-0.5 p-0 text-[9px] text-slate-600">
                      {p.comments.map((c) => (
                        <li key={c.htmlIndex} className="italic">
                          {c.text}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}

const ROW_KBN_LABELS = { "1": "大分類", "2": "工事2", "3": "明細", "4": "コメント" };

function isLocatableMeisaiBlock(b) {
  return Boolean(
    b &&
      b.kind === "3" &&
      b.L_koshu2_cd &&
      b.line1 &&
      !/^（(工事コード欠落|品目なし)）$/.test(String(b.line1))
  );
}

function stripFieldsForJsonExport(blocks) {
  if (!Array.isArray(blocks)) return [];
  return blocks.map((b) => {
    const { fields: _f, ...rest } = b || {};
    return rest;
  });
}

async function copyTextToClipboard(text) {
  const t = String(text ?? "");
  if (!t) return false;
  try {
    await navigator.clipboard.writeText(t);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = t;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

function HtmlStructureMiniPreview({ blocks, onLocateMeisaiBlock, locateEnabled }) {
  const [filterStructOnly, setFilterStructOnly] = useState(false);
  const [copyHint, setCopyHint] = useState("");

  const shown = useMemo(() => {
    if (!Array.isArray(blocks) || !blocks.length) return [];
    if (!filterStructOnly) return blocks;
    return blocks.filter((b) => b.kind === "2" || b.kind === "3");
  }, [blocks, filterStructOnly]);

  useEffect(() => {
    if (!copyHint) return;
    const id = window.setTimeout(() => setCopyHint(""), 2200);
    return () => window.clearTimeout(id);
  }, [copyHint]);

  if (!Array.isArray(blocks) || blocks.length === 0) return null;

  const onCopyJson = async (withFields) => {
    const payload = withFields ? blocks : stripFieldsForJsonExport(blocks);
    const ok = await copyTextToClipboard(JSON.stringify(payload, null, 2));
    setCopyHint(ok ? (withFields ? "全欄をコピーしました" : "軽量JSONをコピーしました") : "コピーに失敗しました");
  };

  return (
    <div className="mt-2 max-h-72 overflow-auto rounded border border-slate-200 bg-white p-2 text-[11px] leading-snug text-slate-800 shadow-inner">
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-1">
        <span className="font-bold text-slate-700">HTML 構造ミニ版（出現順）</span>
        <span className="shrink-0 text-slate-400">
          {shown.length}/{blocks.length}
        </span>
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${!filterStructOnly ? "border-slate-400 bg-slate-100" : "border-slate-200 bg-white"}`}
          onClick={() => setFilterStructOnly(false)}
        >
          全部
        </button>
        <button
          type="button"
          className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${filterStructOnly ? "border-[var(--haseko-green)] bg-[var(--haseko-green-soft)]" : "border-slate-200 bg-white"}`}
          onClick={() => setFilterStructOnly(true)}
        >
          工事2+明細
        </button>
        <button type="button" className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold" onClick={() => void onCopyJson(false)}>
          JSON（軽量）
        </button>
        <button type="button" className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold" onClick={() => void onCopyJson(true)}>
          JSON（全欄）
        </button>
      </div>
      {copyHint ? <p className="mb-1 text-[10px] text-[var(--haseko-green)]">{copyHint}</p> : null}
      <ul className="m-0 list-none space-y-1 p-0">
        {shown.map((b, i) => {
          const tag = ROW_KBN_LABELS[b.kind] || b.kind;
          const idx = <span className="ml-1 font-mono text-[9px] text-slate-400">idx {b.index}</span>;
          const ord = <span className="mr-1 font-mono text-[9px] text-slate-400">{i + 1}.</span>;
          if (b.kind === "1") {
            return (
              <li key={`b-${b.index}-${i}`} className="rounded border-l-4 border-slate-400 bg-slate-50 py-1 pl-2">
                {ord}
                <span className="rounded bg-slate-600 px-1 font-mono text-[9px] text-white">{tag}</span>
                <span className="ml-1.5 font-semibold text-slate-900">{b.line1}</span>
                {idx}
              </li>
            );
          }
          if (b.kind === "2") {
            return (
              <li key={`b-${b.index}-${i}`} className="rounded border-l-4 border-[var(--haseko-green)] bg-[var(--haseko-green-soft)]/50 py-1 pl-2">
                {ord}
                <span className="rounded bg-[var(--haseko-green)] px-1 font-mono text-[9px] text-white">{tag}</span>
                <span className="ml-1.5 font-semibold text-slate-900">{b.line1}</span>
                {b.L_koshu2_cd ? (
                  <span className="ml-1.5 font-mono text-[9px] text-slate-700">sel_koshu2_cd={b.L_koshu2_cd}</span>
                ) : null}
                {idx}
                {b.line2 ? <div className="mt-0.5 pl-0.5 text-[9px] text-slate-600">{b.line2}</div> : null}
              </li>
            );
          }
          if (b.kind === "3") {
            const canLocate = Boolean(
              locateEnabled && typeof onLocateMeisaiBlock === "function" && isLocatableMeisaiBlock(b)
            );
            return (
              <li key={`b-${b.index}-${i}`} className="rounded border border-slate-100 bg-white py-1 pl-3">
                <div className="flex flex-wrap items-start gap-1">
                  {ord}
                  <span className="rounded bg-amber-100 px-1 text-[9px] font-semibold text-amber-950">{tag}</span>
                  {b.L_koshu2_cd ? (
                    <span className="ml-1 font-mono text-[9px] text-slate-600">紐付 cd {b.L_koshu2_cd}</span>
                  ) : null}
                  {idx}
                  {canLocate ? (
                    <button
                      type="button"
                      className="ml-auto shrink-0 rounded border border-amber-300 bg-amber-50 px-1 py-0 text-[9px] font-semibold text-amber-950 hover:bg-amber-100"
                      onClick={() => onLocateMeisaiBlock(b)}
                    >
                      巡検へ
                    </button>
                  ) : null}
                </div>
                <div className="mt-0.5 font-medium text-slate-900">{b.line1}</div>
                {b.line2 ? <div className="text-[9px] text-slate-600">{b.line2}</div> : null}
              </li>
            );
          }
          if (b.kind === "4") {
            return (
              <li key={`b-${b.index}-${i}`} className="py-0.5 pl-3 text-[9px] text-slate-600">
                {ord}
                <span className="rounded bg-violet-100 px-1 font-semibold not-italic text-violet-900">{tag}</span>
                <span className="ml-1 italic">{b.line1}</span>
                {idx}
              </li>
            );
          }
          return null;
        })}
      </ul>
    </div>
  );
}

function selKey(mid) {
  return `m-${mid}`;
}

function loadDraftMerged() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return {};
    const o = JSON.parse(raw);
    return o && typeof o === "object" && !Array.isArray(o) ? o : {};
  } catch {
    return {};
  }
}

export function InspectionProShell({
  dbMasterData,
  projectTitle,
  constructionName,
  buildingName,
  roomKey,
  meisaiCatalogRows,
  onMeisaiCatalogRowsReplace: _replaceCat,
  onPersistMeisaiGlobal,
  onReloadMeisaiCatalog,
  onAfterHtmlImport,
  onHtmlKojiImport,
  htmlImportApplyRevision,
  htmlImportPreset: _htmlImportPreset,
  htmlImportBusy,
  onOpenCustomPage,
  onOpenKoshuCatalog,
  onSaveState,
  onConfirmContent: _onConfirm,
  onSubmitQuote
}) {
  const categories = dbMasterData?.categories ?? [];
  const masters = dbMasterData?.masters ?? [];
  const mastersRef = useRef(masters);
  useEffect(() => {
    mastersRef.current = masters;
  }, [masters]);

  const [bundle, setBundle] = useState(() => loadDraftMerged());
  const [htmlPaste, setHtmlPaste] = useState("");
  const [htmlParseMsg, setHtmlParseMsg] = useState("");
  const [htmlParseBusy, setHtmlParseBusy] = useState(false);
  const [htmlStructurePreview, setHtmlStructurePreview] = useState(null);
  const [htmlWorkPackages, setHtmlWorkPackages] = useState(null);
  const [htmlImportWarnings, setHtmlImportWarnings] = useState([]);
  const [locateHint, setLocateHint] = useState("");
  const [scrollAfterImportId, setScrollAfterImportId] = useState(0);
  const lastConsumedScrollImportRef = useRef(0);
  const selected = bundle.selected && typeof bundle.selected === "object" ? bundle.selected : {};

  useEffect(() => {
    setBundle(loadDraftMerged());
  }, [htmlImportApplyRevision]);

  useEffect(() => {
    if (!locateHint) return;
    const id = window.setTimeout(() => setLocateHint(""), 4200);
    return () => window.clearTimeout(id);
  }, [locateHint]);

  const scrollToMasterFromBlock = useCallback((block) => {
    if (!block || block.kind !== "3") return;
    const cd = String(block.L_koshu2_cd || "").trim();
    const nm = String(block.line1 || "").trim();
    if (!cd || nm === "（工事コード欠落）" || nm === "（品目なし）") {
      setLocateHint("この行は巡検一覧へ遷移できません");
      return;
    }
    const tryScroll = () => {
      const list = mastersRef.current;
      const m = list.find((x) => String(x.koshu2_id) === cd && String(x.item_name || "").trim() === nm);
      if (!m?.id) return false;
      const el = document.getElementById(`insp-master-${m.id}`);
      if (!el) return false;
      const det = el.closest("details");
      if (det) det.open = true;
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      el.classList.add("ring-2", "ring-amber-400", "ring-offset-1");
      window.setTimeout(() => {
        el.classList.remove("ring-2", "ring-amber-400", "ring-offset-1");
      }, 2000);
      return true;
    };
    if (tryScroll()) {
      setLocateHint("");
      return;
    }
    window.setTimeout(() => {
      if (tryScroll()) {
        setLocateHint("");
        return;
      }
      setLocateHint("巡検一覧に該当行が見つかりません（重複統合や名称の不一致の可能性があります）");
    }, 150);
  }, []);

  useEffect(() => {
    if (scrollAfterImportId === 0) return;
    if (lastConsumedScrollImportRef.current >= scrollAfterImportId) return;
    const blocks = htmlStructurePreview;
    const first = Array.isArray(blocks) ? blocks.find(isLocatableMeisaiBlock) : null;
    if (!first) {
      lastConsumedScrollImportRef.current = scrollAfterImportId;
      return;
    }
    let cancelled = false;
    const delays = [40, 180, 400, 700];
    const timers = [];
    const tryOnce = () => {
      if (cancelled || lastConsumedScrollImportRef.current >= scrollAfterImportId) return true;
      const cd = String(first.L_koshu2_cd || "").trim();
      const nm = String(first.line1 || "").trim();
      const matched = mastersRef.current.some(
        (x) => String(x.koshu2_id) === cd && String(x.item_name || "").trim() === nm
      );
      if (!matched) return false;
      lastConsumedScrollImportRef.current = scrollAfterImportId;
      scrollToMasterFromBlock(first);
      return true;
    };
    delays.forEach((ms) => {
      timers.push(
        window.setTimeout(() => {
          if (tryOnce()) timers.forEach(clearTimeout);
        }, ms)
      );
    });
    timers.push(
      window.setTimeout(() => {
        if (!cancelled && lastConsumedScrollImportRef.current < scrollAfterImportId) {
          lastConsumedScrollImportRef.current = scrollAfterImportId;
        }
      }, 900)
    );
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [scrollAfterImportId, htmlStructurePreview, masters, scrollToMasterFromBlock]);

  const mastersByCat = useMemo(() => {
    const m = new Map();
    for (const cat of categories) {
      m.set(cat.id, masters.filter((x) => String(x.koshu2_id) === String(cat.id)));
    }
    return m;
  }, [categories, masters]);

  const byMid = useMemo(() => {
    const M = new Map();
    for (const row of masters) {
      const sid = String(row.id ?? "");
      if (!sid) continue;
      M.set(sid, row);
      const n = Number(row.id);
      if (Number.isFinite(n)) M.set(n, row);
    }
    return M;
  }, [masters]);

  const totalHint = useMemo(() => {
    let t = 0;
    for (const key of Object.keys(selected)) {
      if (!key.startsWith("m-")) continue;
      const raw = key.slice(2);
      const row = byMid.get(raw) ?? byMid.get(Number(raw));
      if (!row) continue;
      const qty = Number(selected[key]?.quantity ?? 0);
      const p = Number(row?.unit_price ?? 0);
      if (Number.isFinite(qty * p)) t += qty * p;
    }
    return t;
  }, [selected, byMid]);

  const commit = useCallback(
    (nextSel) => {
      const merged = {
        ...(typeof bundle === "object" && bundle ? bundle : {}),
        selected: nextSel
      };
      setBundle(merged);
      onSaveState?.(merged);
    },
    [bundle, onSaveState]
  );

  const toggleSel = useCallback(
    (mid, on) => {
      const key = selKey(mid);
      const copy = { ...selected };
      if (!on) {
        delete copy[key];
      } else {
        copy[key] = {
          basho: copy[key]?.basho ?? "",
          quantity: Number(copy[key]?.quantity ?? 1) || 1
        };
      }
      commit(copy);
    },
    [selected, commit]
  );

  const patchSel = useCallback(
    (mid, patch) => {
      const key = selKey(mid);
      commit({
        ...selected,
        [key]: { ...(selected[key] || { quantity: 1, basho: "" }), ...patch }
      });
    },
    [selected, commit]
  );

  const runStubImport = async (pseudo) => {
    if (!Array.isArray(pseudo) || !pseudo.length || !onAfterHtmlImport) return;
    await onAfterHtmlImport(pseudo);
  };

  return (
    <div className="dx-shell-premium rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="min-w-0">
          <h2 className="truncate text-[14px] font-bold text-slate-900">巡検 · {projectTitle}</h2>
          <p className="truncate text-[11px] text-slate-500">
            {buildingName} {roomKey} · {constructionName}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 font-mono text-[11px] text-slate-600">
          <span className="hidden sm:inline">計</span>
          <span>¥{totalHint.toLocaleString("ja-JP")}</span>
          <button
            type="button"
            className="rounded border border-orange-300 bg-sky-50 px-2 py-1.5 font-sans text-[11px] font-semibold text-slate-800"
            onClick={() => onOpenKoshuCatalog?.()}
          >
            工事区分
          </button>
          <button type="button" className="rounded border bg-white px-2 py-1.5 font-sans font-semibold" onClick={() => onOpenCustomPage?.(categories[0]?.id)}>
            カスタム
          </button>
          <button type="button" className="rounded border bg-white px-2 py-1.5 font-sans font-semibold" onClick={() => onSaveState?.({ ...bundle, selected })}>
            保存
          </button>
          <button type="button" className="haseko-btn-primary px-2 py-1.5 font-sans text-[11px]" onClick={() => onSubmitQuote?.({ total: totalHint })}>
            概算
          </button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
        <span>総表 {meisaiCatalogRows?.length ?? 0} 行</span>
        <button type="button" className="rounded border border-slate-200 px-2 py-0.5 font-semibold" onClick={() => onReloadMeisaiCatalog?.()}>
          再読込
        </button>
      </div>

      <div className="mt-3 max-h-[60vh] space-y-1 overflow-auto">
        {!categories.length ? (
          <p className="text-xs text-amber-800">区分データがありません。</p>
        ) : (
          categories.map((c) => (
            <details
              key={c.id}
              className="koshu-work-fold group rounded-lg border-2 border-orange-300/90 bg-sky-50/90 open:border-slate-200 open:bg-white"
            >
              <summary className="cursor-pointer list-none px-2 py-2 text-[12px] font-semibold text-slate-800 marker:hidden [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-2">
                  <span>{c.name || c.label || c.id}</span>
                  <span className="text-[10px] font-normal tabular-nums text-slate-500">
                    {(mastersByCat.get(c.id) || []).length}
                  </span>
                </span>
              </summary>
              <div className="space-y-1 border-t border-slate-100 px-2 py-2">
                {(mastersByCat.get(c.id) || []).map((m) => {
                  const sid = selKey(m.id);
                  const on = Boolean(selected[sid]);
                  const row = selected[sid] || {};
                  return (
                    <div
                      id={`insp-master-${m.id}`}
                      key={sid}
                      className={`rounded px-2 py-1.5 ${on ? "dx-line-card-selected bg-white" : ""}`}
                    >
                      <label className="flex gap-2 text-[11px]">
                        <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0" checked={on} onChange={(e) => toggleSel(m.id, e.target.checked)} />
                        <span className="min-w-0 leading-snug">
                          <strong>{m.item_name}</strong>
                          <span className="tabular-nums text-slate-500">
                            {" "}
                            ¥{Number(m.unit_price ?? 0).toLocaleString("ja-JP")}/{m.unit || "-"}
                          </span>
                        </span>
                      </label>
                      {on ? (
                        <div className="mt-1.5 grid grid-cols-2 gap-1.5 text-[11px] sm:flex sm:gap-2">
                          <input
                            placeholder="場所"
                            className="min-w-0 flex-1 rounded border px-2 py-1"
                            value={row.basho ?? ""}
                            onChange={(e) => patchSel(m.id, { basho: e.target.value })}
                          />
                          <input
                            type="number"
                            placeholder="数量"
                            className="w-20 shrink-0 rounded border px-2 py-1 text-right font-mono tabular-nums"
                            value={row.quantity ?? 1}
                            onChange={(e) => patchSel(m.id, { quantity: Number(e.target.value || 0) })}
                          />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </details>
          ))
        )}
      </div>

      {typeof onHtmlKojiImport === "function" ? (
        <details className="mt-3 rounded border border-dashed border-[var(--haseko-green)]/40 bg-[var(--haseko-green-soft)]/30 text-[11px]">
          <summary className="cursor-pointer px-2 py-1.5 font-semibold text-slate-800">HTML から工事・明細を自動作成</summary>
          <div className="space-y-2 px-2 pb-3">
            <p className="text-[10px] leading-snug text-slate-600">
              長谷工系の<strong className="font-semibold">ソース全文</strong>（
              <code className="rounded bg-white/80 px-1">name=&quot;row_kbn[0]&quot;</code> 形式）を推奨。
              <strong className="font-semibold">大分類 → 工事2 → 明細 → コメント</strong>の順でミニ版を表示し、同じ順でデータに反映します。
              断片のみの場合は表推定にフォールバックします。取込のたびに前回の巡検チェック・明細マスタ等は初期化されます。
              row_kbn ミニ版がある取込では、<strong className="font-semibold">先頭の明細</strong>へ自動でスクロールします（他行は「巡検へ」）。
            </p>
            <textarea
              className="min-h-[100px] w-full rounded border border-slate-300 bg-white p-2 font-mono text-[10px]"
              placeholder="<table>...</table> や <select name=...sel_koshu2...> を含む HTML"
              value={htmlPaste}
              onChange={(e) => setHtmlPaste(e.target.value)}
            />
            <div className="flex flex-wrap items-center gap-2">
              <label className="cursor-pointer rounded border bg-white px-2 py-1 text-[11px] font-semibold hover:bg-slate-50">
                ファイル読込
                <input
                  type="file"
                  accept=".html,.htm,text/html"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const r = new FileReader();
                    r.onload = () => setHtmlPaste(String(r.result || ""));
                    r.readAsText(f, "UTF-8");
                    e.target.value = "";
                  }}
                />
              </label>
              <button
                type="button"
                disabled={htmlParseBusy || !htmlPaste.trim()}
                className="rounded bg-[var(--haseko-green)] px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50"
                onClick={() => {
                  void (async () => {
                    setHtmlParseBusy(true);
                    setHtmlParseMsg("");
                    setHtmlStructurePreview(null);
                    setHtmlWorkPackages(null);
                    setHtmlImportWarnings([]);
                    setLocateHint("");
                    try {
                      const res = await onHtmlKojiImport(htmlPaste.trim());
                      setHtmlParseMsg(res?.message || (res?.ok ? "完了" : "失敗"));
                      const sp = res?.structurePreview;
                      setHtmlStructurePreview(Array.isArray(sp) && sp.length > 0 ? sp : null);
                      setHtmlWorkPackages(Array.isArray(res?.workPackages) && res.workPackages.length > 0 ? res.workPackages : null);
                      setHtmlImportWarnings(Array.isArray(res?.warnings) ? res.warnings : []);
                      if (res?.ok && Array.isArray(sp) && sp.some(isLocatableMeisaiBlock)) {
                        setScrollAfterImportId((x) => x + 1);
                      }
                    } catch (err) {
                      setHtmlParseMsg(String(err?.message || err));
                      setHtmlStructurePreview(null);
                      setHtmlWorkPackages(null);
                      setHtmlImportWarnings([]);
                    } finally {
                      setHtmlParseBusy(false);
                    }
                  })();
                }}
              >
                解析して反映
              </button>
            </div>
            {htmlParseMsg ? <p className="whitespace-pre-wrap rounded bg-white/90 p-2 text-[10px] text-slate-800">{htmlParseMsg}</p> : null}
            {htmlImportWarnings.length > 0 ? (
              <details open className="rounded border border-amber-200 bg-amber-50/90 text-[10px] text-amber-950">
                <summary className="cursor-pointer px-2 py-1.5 font-semibold">解析メッセージ・警告（{htmlImportWarnings.length} 件）</summary>
                <ul className="m-0 max-h-40 list-disc space-y-0.5 overflow-auto border-t border-amber-100 px-5 py-2 pb-2">
                  {htmlImportWarnings.map((w, wi) => (
                    <li key={wi} className="leading-snug">
                      {w}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
            {locateHint ? <p className="text-[10px] text-amber-800">{locateHint}</p> : null}
            <HtmlStructureMiniPreview
              blocks={htmlStructurePreview || []}
              onLocateMeisaiBlock={scrollToMasterFromBlock}
              locateEnabled={Boolean((htmlStructurePreview || []).length)}
            />
            <WorkPackagesTabletSketch packages={htmlWorkPackages || []} />
          </div>
        </details>
      ) : null}

      <details className="mt-3 rounded border border-dashed border-slate-200 text-[11px]">
        <summary className="cursor-pointer px-2 py-1.5 text-slate-600">開発・試験（HTMLダミー）</summary>
        <div className="flex flex-wrap gap-2 px-2 pb-2">
          <button
            type="button"
            disabled={Boolean(htmlImportBusy)}
            className="rounded bg-slate-700 px-2 py-1 text-white disabled:opacity-50"
            onClick={() =>
              void runStubImport([
                {
                  item_name: "試験_" + Math.random().toString(36).slice(2, 5),
                  unit: "式",
                  unit_price: 0,
                  koshu2_id: ""
                }
              ])
            }
          >
            取込1行
          </button>
          <button
            type="button"
            disabled={Boolean(htmlImportBusy)}
            className="rounded border px-2 py-1"
            onClick={() =>
              void (async () => {
                await onPersistMeisaiGlobal([
                  ...(Array.isArray(meisaiCatalogRows) ? meisaiCatalogRows : []),
                  { item_name: "追加行_" + Date.now(), unit: "式", taisho1: "-" }
                ]);
                onReloadMeisaiCatalog?.();
              })().catch(() => {})
            }
          >
            総表に1行
          </button>
        </div>
      </details>
    </div>
  );
}
