#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
长谷工(Haseko)系「見積登録」HTML → 结构化 JSON → 可写入 Excel「項目」表的逆向分拣引擎。

数据源（本仓库内已存在）：
- `見積登録　エスティメゾン豊洲レジデンスＡ棟　1415号室.html` — table#Costs、row_kbn、sel_koshu2_cd、kojikomoku_id
- `index.html` — getFieldValueFromDoc / buildExportRows 的字段契约

未提供文件说明：
- 若缺少你本地的 `haseko.html` / `template.xlsx`，则「御見積書」公式、項目 Sheet 精确列号以 **推断** 形式写在
  EXCEL_KOUMOKU_COLUMN_MAP 中；拿到 xlsx 后用 openpyxl 读公式 `=IF(項目!B15="","",…)` 即可对齐列。

---------------------------------------------------------------------------
1) row_kbn（HTML 隐藏域）含义验证
---------------------------------------------------------------------------
  1 = 工種１行（大区分标题） — 字段 koshu1_text；整块 colspan，不含单价数量
  2 = 工種２行（小区分 / セット単位） — sel_koshu2_cd, koshu2_text, koshu2_cd, koshu2_koban 等
  3 = 明細行 — kojikomoku_id（マスタ行ID）+ taisho1/2, koji_naiyo, basho, bui, suryo, tanka…
  4 = コメント行 — comment（長文、非金额）

在页面内展示顺序（对最终 Excel 的影响）：
- 视觉输出按 tbody 中 tr 的 DOM 顺序 + row_no 递增；乱序输入时，**后端/Excel 侧通常**：
  (a) 先按 sel_koshu2_cd（＝工種2分类键）归入虚拟桶，
  (b) 桶内再按原始 row_no 恢复稳定序列，
  (c) 同一桶内结构保持 1→2→(若干3)→4 的片段不拆散（本引擎用 source_row_index 保序）。

「权重量」：export 时先按 KOUSHU2_SORT_ORDER（下表）排桶，
桶内按 source_row_index；同桶多段 工種1 は row_no が小さい方が先。

---------------------------------------------------------------------------
2) kojikomoku_id と工事分类
---------------------------------------------------------------------------
- kojikomoku_id：明細行(row_kbn=3)隐藏字段；从「工事項目検索」模态选中的**マスタ主键**，
  与 sel_koshu2_cd **不是**简单函数关系；同一 kojikomoku（例: 270）可在同一工种下多行复用。
- 分类桶键：**以工種2** `sel_koshu2_cd` / `koshu2_cd` 为准（与 HTML select option value 一致）。
- HTML 中 option 共 17 个 value（含廃止若干）；业务上若说「16类」多为合并廃止项后的口径——
  本引擎保留 **全部 cd 值** 作为桶 id，并把廃止标记在 KOUSHU2_META。

---------------------------------------------------------------------------
3) Excel 項目 Sheet 列映射（推断，待 template.xlsx 校验）
---------------------------------------------------------------------------
典型見積「項目」明細列（从左起）与 HTML 字段对应推断：

  A  連番 / 空
  B  科目・摘要  →  often 工事内容 koji_naiyo 或 combined label
  C  対象1       → taisho1
  D  対象2       → taisho2
  E  場所         → basho
  F  部位         → bui
  G  図面数量     → zumen_suryo
  H  数量         → suryo
  I  単位         → tani
  J  単価         → tanka
  K  金額         → kakaku（=suryo*tanka 或由画面算出）
  …（借主负担等列因模板而异）

御見積書 Sheet 用 `=IF(項目!B15="","",項目!B15)` 一类公式时，B15 即「項目」Sheet 第15行第2列，
具体行偏移需打开 xlsx 确认标题占用行数。

---------------------------------------------------------------------------
4) 諸経費 6% / 消費税 10%（机制推断）
---------------------------------------------------------------------------
- 諸経費：对「課税対象工事小计」按比例；Excel 常写作 `=ROUND(小计单元格*6%, 0)`。
- 消費税：对 (工事本体+諸経費-値引等) 的課税標準額 ×10%；或 `=ROUND(税抜合計*0.1,0)`。
- 本引擎在 JSON 中输出 tax_base_lines / suggested_6pct / suggested_10pct 供对账，不代替 Excel 精度。

用法:
  python haseko_quote_sort_engine.py "path/to/見積登録….html"
  # 或 Python API: parse_html_file(), sort_records(), to_excel_koumoku_json()
"""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass, field, asdict
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from typing import Any, Iterable


# ---------------------------------------------------------------------------
# 工種2（sel_koshu2_cd）— 与 1415号室.html 中 option 顺序一致（用于桶排序优先级）
# ---------------------------------------------------------------------------
KOUSHU2_META: dict[str, dict[str, Any]] = {
    "1": {"label": "クロス工事", "deprecated": False},
    "2": {"label": "床工事", "deprecated": False},
    "3": {"label": "建具工事", "deprecated": False},
    "4": {"label": "鋼製建具工事(廃止)", "deprecated": True},
    "5": {"label": "クリーニング工事", "deprecated": False},
    "6": {"label": "鍵工事", "deprecated": False},
    "7": {"label": "和室工事", "deprecated": False},
    "8": {"label": "塗装工事", "deprecated": False},
    "9": {"label": "雑工事", "deprecated": False},
    "10": {"label": "設備機器交換工事", "deprecated": False},
    "11": {"label": "内装工事(廃止)", "deprecated": True},
    "12": {"label": "必須工事", "deprecated": False},
    "13": {"label": "固定工事", "deprecated": False},
    "14": {"label": "設備点検(廃止)", "deprecated": True},
    "15": {"label": "その他(廃止)", "deprecated": True},
    "16": {"label": "交換工事", "deprecated": False},
    "17": {"label": "アスベスト関連", "deprecated": False},
}

KOUSHU2_SORT_ORDER: list[str] = [
    "1",
    "2",
    "3",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "12",
    "13",
    "16",
    "17",
    "4",
    "11",
    "14",
    "15",
]


def _koushu_sort_key(cd: str) -> tuple[int, str]:
    try:
        idx = KOUSHU2_SORT_ORDER.index(cd)
    except ValueError:
        idx = 999
    return (idx, cd)


INPUT_RE = re.compile(
    r'<input\b[^>]*\bname="(?P<name>[^"]+)"[^>]*?(?:/>|>)',
    re.I | re.DOTALL,
)
VALUE_RE = re.compile(r'\bvalue="(?P<v>[^"]*)"', re.I)
SELECT_RE = re.compile(
    r'<select\b[^>]*\bname="(?P<name>[^"]+)"[^>]*>(?P<body>.*?)</select>',
    re.I | re.DOTALL,
)
SELECTED_OPTION_RE = re.compile(r'<option[^>]+selected[^>]+value="(?P<v>[^"]*)"', re.I)


def _strip_tags(s: str) -> str:
    return re.sub(r"<[^>]+>", "", s)


def extract_inputs(html: str) -> dict[str, str]:
    """Rough but dependency-free: extract name->value for inputs (last wins)."""
    out: dict[str, str] = {}
    for m in INPUT_RE.finditer(html):
        block = m.group(0)
        nm = m.group("name")
        vm = VALUE_RE.search(block)
        val = vm.group("v") if vm else ""
        if "type" in block.lower() and "radio" in block.lower():
            continue
        out[nm] = val
    return out


def extract_selects(html: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for m in SELECT_RE.finditer(html):
        name = m.group("name")
        body = m.group("body")
        sm = SELECTED_OPTION_RE.search(body)
        if sm:
            out[name] = sm.group("v")
        else:
            om = re.search(r"<option[^>]+value=\"([^\"]+)\"", body, re.I)
            if om:
                out[name] = om.group(1)
    return out


def merge_fields(html: str) -> dict[str, str]:
    d = extract_inputs(html)
    d.update(extract_selects(html))
    return d


def parse_indexed_field(all_fields: dict[str, str], base: str, idx: int) -> str:
    key = f"{base}[{idx}]"
    return (all_fields.get(key) or "").strip()


def discover_row_indices(all_fields: dict[str, str]) -> list[int]:
    idxs: set[int] = set()
    pat = re.compile(r"^([^\[]+)\[(\d+)\]$")
    for k in all_fields:
        m = pat.match(k)
        if not m:
            continue
        if m.group(1) == "row_kbn":
            idxs.add(int(m.group(2)))
    return sorted(idxs)


@dataclass
class HasekoRawRow:
    row_index: int
    row_kbn: str
    row_no: str
    # kbn 1
    koshu1_text: str = ""
    # kbn 2
    sel_koshu2_cd: str = ""
    koshu2_text: str = ""
    koshu2_cd: str = ""
    koshu2_koban: str = ""
    # kbn 3
    kojikomoku_id: str = ""
    taisho1: str = ""
    taisho2: str = ""
    koji_naiyo: str = ""
    basho: str = ""
    bui: str = ""
    zumen_suryo: str = ""
    suryo: str = ""
    tani: str = ""
    tanka: str = ""
    kakaku: str = ""
    kaito: str = ""
    owner_tanka: str = ""
    kashinushi_futan_wariai: str = ""
    kashinushi_futan_kingaku: str = ""
    karinushi_futan_wariai: str = ""
    karinushi_futan_kingaku: str = ""
    biko1: str = ""
    biko2: str = ""
    maker: str = ""
    type_: str = ""
    price: str = ""
    # kbn 4
    comment: str = ""


def parse_costs_table(html: str) -> list[HasekoRawRow]:
    """Parse saved 見積登録 HTML (table#Costs) into flat rows."""
    all_f = merge_fields(html)
    indices = discover_row_indices(all_f)
    rows: list[HasekoRawRow] = []
    for idx in indices:
        rkbn = parse_indexed_field(all_f, "row_kbn", idx)
        if not rkbn:
            continue
        row = HasekoRawRow(
            row_index=idx,
            row_kbn=rkbn,
            row_no=parse_indexed_field(all_f, "row_no", idx),
            koshu1_text=parse_indexed_field(all_f, "koshu1_text", idx),
            sel_koshu2_cd=parse_indexed_field(all_f, "sel_koshu2_cd", idx),
            koshu2_text=parse_indexed_field(all_f, "koshu2_text", idx),
            koshu2_cd=parse_indexed_field(all_f, "koshu2_cd", idx),
            koshu2_koban=parse_indexed_field(all_f, "koshu2_koban", idx),
            kojikomoku_id=parse_indexed_field(all_f, "kojikomoku_id", idx),
            taisho1=parse_indexed_field(all_f, "taisho1", idx),
            taisho2=parse_indexed_field(all_f, "taisho2", idx),
            koji_naiyo=parse_indexed_field(all_f, "koji_naiyo", idx),
            basho=parse_indexed_field(all_f, "basho", idx),
            bui=parse_indexed_field(all_f, "bui", idx),
            zumen_suryo=parse_indexed_field(all_f, "zumen_suryo", idx),
            suryo=parse_indexed_field(all_f, "suryo", idx),
            tani=parse_indexed_field(all_f, "tani", idx),
            tanka=parse_indexed_field(all_f, "tanka", idx),
            kakaku=parse_indexed_field(all_f, "kakaku", idx),
            kaito=parse_indexed_field(all_f, "kaito", idx),
            owner_tanka=parse_indexed_field(all_f, "owner_tanka", idx),
            kashinushi_futan_wariai=parse_indexed_field(all_f, "kashinushi_futan_wariai", idx),
            kashinushi_futan_kingaku=parse_indexed_field(all_f, "kashinushi_futan_kingaku", idx),
            karinushi_futan_wariai=parse_indexed_field(all_f, "karinushi_futan_wariai", idx),
            karinushi_futan_kingaku=parse_indexed_field(all_f, "karinushi_futan_kingaku", idx),
            biko1=parse_indexed_field(all_f, "biko1", idx),
            biko2=parse_indexed_field(all_f, "biko2", idx),
            maker=parse_indexed_field(all_f, "maker", idx),
            type_=parse_indexed_field(all_f, "type", idx),
            price=parse_indexed_field(all_f, "price", idx),
            comment=parse_indexed_field(all_f, "comment", idx),
        )
        rows.append(row)
    rows.sort(key=lambda x: x.row_index)
    return rows


@dataclass
class EnrichedDetail:
    """明細 + 继承的工種上下文 + 桶键"""

    bucket_cd: str
    bucket_label: str
    source_row_index: int
    row_no: str
    kojikomoku_id: str
    fields: dict[str, Any]


@dataclass
class SortEngineState:
    current_koshu1: str = ""
    current_koshu2_cd: str = ""
    current_koshu2_text: str = ""
    current_koshu2_cd_from_hidden: str = ""


def walk_and_bucket(raw: list[HasekoRawRow]) -> tuple[list[EnrichedDetail], list[dict[str, Any]]]:
    """
    模拟前端 state 机：遇到 row_kbn 1/2 更新上下文；3 产出明细；4 记录 comment。
    桶键 = sel_koshu2_cd | koshu2_cd（与 index.html 一致优先用 dropdown）
    """
    st = SortEngineState()
    details: list[EnrichedDetail] = []
    comments: list[dict[str, Any]] = []
    order_counter = 0

    for r in raw:
        if r.row_kbn == "1":
            st.current_koshu1 = r.koshu1_text
            continue
        if r.row_kbn == "2":
            st.current_koshu2_text = r.koshu2_text
            st.current_koshu2_cd_from_hidden = r.koshu2_cd
            st.current_koshu2_cd = r.sel_koshu2_cd or r.koshu2_cd
            continue
        if r.row_kbn == "4":
            if r.comment.strip():
                comments.append({"row_index": r.row_index, "comment": r.comment.strip()})
            continue
        if r.row_kbn != "3":
            continue

        cd = r.sel_koshu2_cd or st.current_koshu2_cd or st.current_koshu2_cd_from_hidden or ""
        if not cd:
            cd = "0"
        meta = KOUSHU2_META.get(cd, {})
        label = str(meta.get("label") or f"unknown({cd})")
        order_counter += 1

        kvid = r.kojikomoku_id.strip()
        fields = {
            "koshu1_text": st.current_koshu1,
            "koshu2_text": st.current_koshu2_text,
            "koshu2_cd": st.current_koshu2_cd_from_hidden,
            "sel_koshu2_cd": cd,
            "kojikomoku_id": kvid,
            "taisho1": r.taisho1,
            "taisho2": r.taisho2,
            "koji_naiyo": r.koji_naiyo,
            "basho": r.basho,
            "bui": r.bui,
            "zumen_suryo": r.zumen_suryo,
            "suryo": r.suryo,
            "tani": r.tani,
            "tanka": r.tanka,
            "kakaku": r.kakaku,
            "biko1": r.biko1,
            "biko2": r.biko2,
            "maker": r.maker,
            "type": r.type_,
            "list_price": r.price,
        }
        details.append(
            EnrichedDetail(
                bucket_cd=cd,
                bucket_label=label,
                source_row_index=r.row_index,
                row_no=r.row_no,
                kojikomoku_id=kvid,
                fields=fields,
            )
        )

    return details, comments


def sort_details_like_backend(details: Iterable[EnrichedDetail]) -> list[EnrichedDetail]:
    """先按工種2桶优先级，再按 HTML 行索引（row_kbn 遍历序）。"""
    lst = list(details)
    lst.sort(key=lambda d: (_koushu_sort_key(d.bucket_cd), d.source_row_index))
    return lst


def _dec(s: str) -> Decimal:
    if s is None:
        return Decimal(0)
    t = re.sub(r"[,\s]", "", str(s).strip())
    if not t:
        return Decimal(0)
    try:
        return Decimal(t)
    except Exception:
        return Decimal(0)


def compute_money_lines(details: list[EnrichedDetail]) -> dict[str, Any]:
    """小计与建议諸経費/消费税（与 Excel 具体取行范围无关的金额核对）。"""
    subtotal = Decimal(0)
    lines: list[dict[str, Any]] = []
    for d in details:
        suryo = _dec(d.fields.get("suryo"))
        tanka = _dec(d.fields.get("tanka"))
        kakaku = _dec(d.fields.get("kakaku"))
        if kakaku == 0 and suryo and tanka:
            kakaku = (suryo * tanka).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
        subtotal += kakaku
        lines.append(
            {
                "bucket_cd": d.bucket_cd,
                "kojikomoku_id": d.kojikomoku_id,
                "amount": str(kakaku),
            }
        )
    six = (subtotal * Decimal("0.06")).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    ten_base = subtotal + six
    ten = (ten_base * Decimal("0.10")).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    return {
        "subtotal_construction": str(subtotal),
        "suggested_shokeihi_6pct": str(six),
        "suggested_taxable_before_10pct": str(ten_base),
        "suggested_consumption_tax_10pct": str(ten),
        "lines": lines,
    }


# 推断的「項目」Sheet 列名（请用 template.xlsx 校对）
EXCEL_KOUMOKU_COLUMN_MAP: dict[str, str] = {
    "taisho1": "C",
    "taisho2": "D",
    "basho": "E",
    "bui": "F",
    "zumen_suryo": "G",
    "suryo": "H",
    "tani": "I",
    "tanka": "J",
    "kakaku": "K",
    "koji_naiyo": "B",
}


def to_excel_koumoku_json(sorted_details: list[EnrichedDetail], start_row: int = 15) -> dict[str, Any]:
    """
    输出可写入「項目」sheet 的 row objects：
    excel_cell 仅含推断列；start_row 可通过打开 xlsx 看标题行后调整。
    """
    rows_out: list[dict[str, Any]] = []
    for i, d in enumerate(sorted_details):
        rnum = start_row + i
        cells: dict[str, str] = {}
        for fname, col in EXCEL_KOUMOKU_COLUMN_MAP.items():
            val = d.fields.get(fname, "")
            if val is None:
                val = ""
            cells[f"{col}{rnum}"] = str(val).strip()
        rows_out.append(
            {
                "logical_row": i + 1,
                "excel_data_row": rnum,
                "bucket_cd": d.bucket_cd,
                "kojikomoku_id": d.kojikomoku_id,
                "cells": cells,
                "raw_fields": d.fields,
            }
        )
    return {
        "meta": {
            "engine": "haseko_quote_sort_engine",
            "excel_column_map_hypothesis": EXCEL_KOUMOKU_COLUMN_MAP,
            "data_start_row_hypothesis": start_row,
        },
        "koumoku_rows": rows_out,
        "money": compute_money_lines(sorted_details),
    }


def parse_html_file(path: Path) -> dict[str, Any]:
    html = path.read_text(encoding="utf-8", errors="replace")
    raw = parse_costs_table(html)
    details, comments = walk_and_bucket(raw)
    sorted_d = sort_details_like_backend(details)
    payload = to_excel_koumoku_json(sorted_d)
    payload["parse"] = {
        "source_file": str(path),
        "raw_row_count": len(raw),
        "detail_count": len(sorted_d),
        "comments": comments,
    }
    payload["raw_rows_debug"] = [asdict(x) for x in raw[:50]]
    if len(raw) > 50:
        payload["raw_rows_debug_note"] = "truncated to 50 for debug"
    return payload


def main() -> None:
    ap = argparse.ArgumentParser(description="Haseko HTML → JSON for Excel 項目 sheet")
    ap.add_argument("html_path", type=Path)
    ap.add_argument("-o", "--out", type=Path, default=None, help="write JSON file")
    args = ap.parse_args()
    data = parse_html_file(args.html_path)
    text = json.dumps(data, ensure_ascii=False, indent=2)
    if args.out:
        args.out.write_text(text, encoding="utf-8")
        print(f"Wrote {args.out}")
    else:
        print(text)


if __name__ == "__main__":
    main()
