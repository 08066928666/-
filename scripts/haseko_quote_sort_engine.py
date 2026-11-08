#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
长谷工(Haseko)系「見積登録」HTML → 结构化 JSON → 可写入 Excel「項目」表的逆向分拣引擎。

数据源（本仓库内已存在）：
- `見積登録　エスティメゾン豊洲レジデンスＡ棟　1415号室.html` — table#Costs、row_kbn、sel_koshu2_cd、kojikomoku_id
- `index.html` — getFieldValueFromDoc / buildExportRows 的字段契约

列映射の検証状況（2026-11-07 更新）：
- 1415 号室の帳票実物で検証済み。落点は「帳票」シート、表頭 20 行目、明細 24 行目から。
  旧推断（「項目」シート・A–K・15 行目）は誤りだったため EXCEL_CHOHYO_COLUMN_MAP に置き換えた。
  詳細は `~/workspace/user/files/haseko_quote_sort_engine_列映射校验_2026-11-07.md` と
  同ディレクトリの修复记录を参照。

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
3) Excel 帳票 Sheet 列映射（2026-11-07 1415号室実物で検証済み）
---------------------------------------------------------------------------
検証済みの落点は「帳票」シート（62 列 A:BJ）、表頭 20 行目、明細 24 行目から。
「項目」シートは頭情報のみ（B15 物件CD など）で明細区はない。旧推断
（項目・A–K・15 行目）は誤りだったため、2026-11-07 に置き換えた。

  A  工種1タイトル行 / 工種2タイトル行は小番 (koshu2_koban)
  C  工事内容 — クロス行は部屋名 (basho)、非クロス行は taisho1 + koji_naiyo
  O  場所 (basho、非クロス行)
  N  天井数量 / R 壁数量（クロス行のみ。天井・壁 2 明細を 1 行に統合）
  AC 備考・原因 (biko1)
  AD 図面数量 (zumen_suryo。本案は HTML・実表とも空のため有値未検証)
  AH 数量（クロス行は N+R）
  AL 単位 / AO 単価 / AS 金額
  AW 貸主負担％ / AY 貸主負担額 / BC 借主負担％ / BE 借主負担額
  BI 削除・修正前マーク — HTML に該当情報がないため本エンジンは出さない
  メーカー・型番は翌行の C 列に附注行として出す。コメント行も C 列の备注行。

---------------------------------------------------------------------------
4) 諸経費 6% / 出精値引 / 消費税 10%（2026-11-07 帳票 96–102 行の式で検証済み）
---------------------------------------------------------------------------
- 諸経費：`=ROUNDDOWN(小計*6%, 0)` — 切り捨て。ROUND_HALF_UP だと ¥1 多い。
- 出精値引：合計を千円単位に切り捨てる調整。`(合計 - ROUNDDOWN(合計,-3)) * -1`。
- 消費税：課税標準は値引後の合計。`=ROUNDDOWN(値引後合計*10%, 0)`。
- 本エンジンは JSON で money 行を出し、Excel 精度の代わりにはしない。
  1415 号室の検証値：小計 370,209 / 諸経費 22,212 / 値引 -421 /
  値引後合計 392,000 / 消費税 39,200 / 総合計 431,200。

用法:
  python haseko_quote_sort_engine.py "path/to/見積登録….html"
  # 或 Python API: parse_html_file(), sort_records(), to_excel_koumoku_json()
"""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass, field, asdict
from decimal import Decimal, ROUND_DOWN, ROUND_HALF_UP
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
OPTION_TAG_RE = re.compile(r"<option\b[^>]*>", re.I)
OPTION_VALUE_RE = re.compile(r'\bvalue="(?P<v>[^"]*)"', re.I)


def _selected_option_value(body: str) -> str | None:
    """selected の付いた option の value を返す。value と selected の順序は問わない。
    旧正規表現は selected が value より前にあること前提で、実 HTML の
    `<option value="10" selected="">` を読めず全桶が "1" になっていた (Bug 1)。"""
    for m in OPTION_TAG_RE.finditer(body):
        tag = m.group(0)
        if re.search(r"\bselected\b", tag, re.I):
            vm = OPTION_VALUE_RE.search(tag)
            if vm:
                return vm.group("v")
    return None


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
        sv = _selected_option_value(body)
        if sv is not None:
            out[name] = sv
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
    current_koshu2_koban: str = ""


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
            st.current_koshu2_koban = r.koshu2_koban
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
            "koshu2_koban": st.current_koshu2_koban,
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
            "kashinushi_futan_wariai": r.kashinushi_futan_wariai,
            "kashinushi_futan_kingaku": r.kashinushi_futan_kingaku,
            "karinushi_futan_wariai": r.karinushi_futan_wariai,
            "karinushi_futan_kingaku": r.karinushi_futan_kingaku,
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


def _round_down_int(x: Decimal) -> Decimal:
    return x.quantize(Decimal("1"), rounding=ROUND_DOWN)


def _round_down_thousands(x: Decimal) -> Decimal:
    return (x // Decimal(1000)) * Decimal(1000)


def compute_money_lines(details: list[EnrichedDetail]) -> dict[str, Any]:
    """帳票 96–102 行の式どおりの金額行。1415 号室の検証値:
    小計 370,209 / 諸経費 22,212 / 値引 -421 / 値引後合計 392,000 /
    消費税 39,200 / 総合計 431,200 / 貸主小計 219,193 / 借主小計 151,016。"""
    subtotal = Decimal(0)
    lender_sum = Decimal(0)
    borrower_sum = Decimal(0)
    lines: list[dict[str, Any]] = []
    for d in details:
        suryo = _dec(d.fields.get("suryo"))
        tanka = _dec(d.fields.get("tanka"))
        kakaku = _dec(d.fields.get("kakaku"))
        if kakaku == 0 and suryo and tanka:
            kakaku = (suryo * tanka).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
        subtotal += kakaku
        lender = _dec(d.fields.get("kashinushi_futan_kingaku"))
        borrower = _dec(d.fields.get("karinushi_futan_kingaku"))
        lender_sum += lender
        borrower_sum += borrower
        lines.append(
            {
                "bucket_cd": d.bucket_cd,
                "kojikomoku_id": d.kojikomoku_id,
                "amount": str(kakaku),
                "lender_amount": str(lender),
                "borrower_amount": str(borrower),
            }
        )
    six = _round_down_int(subtotal * Decimal("0.06"))
    pre_nebiki = subtotal + six
    nebiki = -(pre_nebiki - _round_down_thousands(pre_nebiki))
    total_after = pre_nebiki + nebiki
    ten = _round_down_int(total_after * Decimal("0.10"))
    grand = total_after + ten
    return {
        "subtotal_construction": str(subtotal),
        "shokeihi_6pct": str(six),
        "total_before_nebiki": str(pre_nebiki),
        "shussei_nebiki": str(nebiki),
        "total_after_nebiki": str(total_after),
        "consumption_tax_10pct": str(ten),
        "grand_total": str(grand),
        "lender_subtotal": str(lender_sum),
        "borrower_subtotal": str(borrower_sum),
        # 旧キー名（互換用）。中身は修正後の値：課税標準は値引後の合計。
        "suggested_shokeihi_6pct": str(six),
        "suggested_taxable_before_10pct": str(total_after),
        "suggested_consumption_tax_10pct": str(ten),
        "lines": lines,
    }


# 検証済み「帳票」Sheet 列マップ（2026-11-07、1415号室実物で検証）
EXCEL_CHOHYO_SHEET = "帳票"
EXCEL_CHOHYO_HEADER_ROW = 20
EXCEL_CHOHYO_DATA_START_ROW = 24
# 非クロス明細行の列。クロス行は C=部屋名、N/R=天井/壁に統合する。
EXCEL_CHOHYO_COLUMN_MAP: dict[str, str] = {
    "name": "C",            # taisho1 + koji_naiyo（実表で確認。例：浴室鏡＋交換）
    "basho": "O",
    "zumen_suryo": "AD",
    "suryo": "AH",
    "tani": "AL",
    "tanka": "AO",
    "kakaku": "AS",
    "biko1": "AC",
    "kashinushi_futan_wariai": "AW",
    "kashinushi_futan_kingaku": "AY",
    "karinushi_futan_wariai": "BC",
    "karinushi_futan_kingaku": "BE",
}
# 旧名（互換用）。中身は帳票マップ。旧推断（項目・A–K）は廃止。
EXCEL_KOUMOKU_COLUMN_MAP = EXCEL_CHOHYO_COLUMN_MAP


def _col_cells(pairs: dict[str, Any]) -> dict[str, str]:
    return {c: str(v).strip() if v is not None else "" for c, v in pairs.items()}


def _fmt_num(x: Decimal) -> str:
    """Decimal を末尾ゼロなしの素直な文字列に（5.00→5、17.70→17.7）。"""
    t = format(x.normalize(), "f") if x == x.to_integral_value() else format(x, "f")
    if "." in t:
        t = t.rstrip("0").rstrip(".")
    return t if t not in ("", "-0") else "0"


def _first(*vals: str) -> str:
    for v in vals:
        if v:
            return v
    return ""


def to_excel_chohyo_json(
    sorted_details: list[EnrichedDetail],
    comments: list[dict[str, Any]] | None = None,
    start_row: int = EXCEL_CHOHYO_DATA_START_ROW,
) -> dict[str, Any]:
    """帳票シートに書き込める行オブジェクトを返す。

    並びはソート済み明細順。クロス（工種2 cd=1、部位が天井/壁）は
    部屋ごとに 1 行へ統合（N=天井数量、R=壁数量、AH=N+R、AY/BE は合計）。
    工種1/工種2の切替わりでタイトル行、メーカー・型番のある明細の直後に
    附注行、コメントは元の行順に挿入する。行番号は start_row から連番で
    振り直す（実表は途中に空行を挟み、鍵/固定の工種1タイトル行が空行に
    なっている箇所があるため、後半の物理行番号は実表とずれる。列は検証済み）。
    """
    comments = comments or []
    # --- 論理行（列→値、行番号なし）を組み立てる ---
    logical: list[dict[str, Any]] = []
    cur_k1: str | None = None
    cur_k2: tuple[str, str] | None = None

    def title_rows_for(d: EnrichedDetail) -> None:
        nonlocal cur_k1, cur_k2
        k1 = d.fields.get("koshu1_text", "")
        k2 = (d.fields.get("koshu2_cd", ""), d.fields.get("koshu2_text", ""))
        if k1 and k1 != cur_k1:
            logical.append(
                {"row_kind": "koshu1_title", "src": d.source_row_index,
                 "cells": {"A": k1}}
            )
            cur_k1 = k1
            # 工種2タイトルは全局で一度だけ出す。実表でも「その他設備」は
            # 工種1が変わってもタイトル行は 1 回（帳票 52 行）だけ。
        if k2 != cur_k2:
            cur_k2 = k2
            cd, text = k2
            label = text or str(KOUSHU2_META.get(cd, {}).get("label") or "")
            koban = d.fields.get("koshu2_koban", "")
            # 実表の規則：名称ありの工種2タイトルは A=小番、C=名称。
            # 名称なし（クリーニング/雑など）は A 空欄、C=工種名。
            cells = {"C": label} if not text else {"A": koban, "C": text}
            logical.append(
                {"row_kind": "koshu2_title", "src": d.source_row_index,
                 "cells": cells}
            )

    def maker_note_for(d: EnrichedDetail) -> None:
        maker = d.fields.get("maker", "")
        type_ = d.fields.get("type", "")
        price = d.fields.get("list_price", "")
        if not (maker or type_):
            return
        note = "／".join([x for x in [maker, type_] if x])
        if price:
            note += f"／(定価){price}"
        logical.append(
            {"row_kind": "maker_note", "src": d.source_row_index,
             "cells": {"C": note}}
        )

    # クロス明細を部屋ごとに統合（ソート順での初出順を保つ）
    cross_groups: dict[str, list[EnrichedDetail]] = {}
    cross_order: list[str] = []
    singles: list[EnrichedDetail] = []
    for d in sorted_details:
        if d.bucket_cd == "1" and d.fields.get("bui") in ("天井", "壁"):
            key = d.fields.get("basho", "")
            if key not in cross_groups:
                cross_groups[key] = []
                cross_order.append(key)
            cross_groups[key].append(d)
        else:
            singles.append(d)

    def emit_cross(room: str, group: list[EnrichedDetail]) -> None:
        first = group[0]
        title_rows_for(first)
        tenjo = next((g for g in group if g.fields.get("bui") == "天井"), None)
        kabe = next((g for g in group if g.fields.get("bui") == "壁"), None)
        n = _dec(tenjo.fields.get("suryo")) if tenjo else Decimal(0)
        r = _dec(kabe.fields.get("suryo")) if kabe else Decimal(0)
        ref = tenjo or kabe or first
        cells = {
            "C": room,
            "N": _fmt_num(n) if tenjo else "",
            "R": _fmt_num(r) if kabe else "",
            "AH": _fmt_num(n + r),
            "AL": _first(*(g.fields.get("tani", "") for g in group)),
            "AO": _first(*(g.fields.get("tanka", "") for g in group)),
            "AS": _fmt_num(sum((_dec(g.fields.get("kakaku")) for g in group), Decimal(0))),
            "AC": _first(*(g.fields.get("biko1", "") for g in group)),
            "AD": _first(*(g.fields.get("zumen_suryo", "") for g in group)),
            "AW": ref.fields.get("kashinushi_futan_wariai", ""),
            "AY": _fmt_num(sum((_dec(g.fields.get("kashinushi_futan_kingaku")) for g in group), Decimal(0))),
            "BC": ref.fields.get("karinushi_futan_wariai", ""),
            "BE": _fmt_num(sum((_dec(g.fields.get("karinushi_futan_kingaku")) for g in group), Decimal(0))),
        }
        logical.append(
            {"row_kind": "cross_merged", "src": first.source_row_index,
             "bucket_cd": "1", "room": room, "cells": _col_cells(cells)}
        )

    def emit_single(d: EnrichedDetail) -> None:
        title_rows_for(d)
        f = d.fields
        name = (f.get("taisho1", "") + f.get("koji_naiyo", "")).strip()
        cells = {
            "C": name,
            "O": f.get("basho", ""),
            "AD": f.get("zumen_suryo", ""),
            "AH": f.get("suryo", ""),
            "AL": f.get("tani", ""),
            "AO": f.get("tanka", ""),
            "AS": f.get("kakaku", ""),
            "AC": f.get("biko1", ""),
            "AW": f.get("kashinushi_futan_wariai", ""),
            "AY": f.get("kashinushi_futan_kingaku", ""),
            "BC": f.get("karinushi_futan_wariai", ""),
            "BE": f.get("karinushi_futan_kingaku", ""),
        }
        logical.append(
            {"row_kind": "detail", "src": d.source_row_index,
             "bucket_cd": d.bucket_cd, "kojikomoku_id": d.kojikomoku_id,
             "cells": _col_cells(cells), "raw_fields": f}
        )
        maker_note_for(d)

    # ソート順を保ちつつ、クロスは統合行として初出位置で出す
    emitted_cross: set[str] = set()
    for d in sorted_details:
        if d.bucket_cd == "1" and d.fields.get("bui") in ("天井", "壁"):
            room = d.fields.get("basho", "")
            if room in emitted_cross:
                continue
            emitted_cross.add(room)
            emit_cross(room, cross_groups[room])
        else:
            emit_single(d)

    # コメント行を元の行順に挿入
    for c in sorted(comments, key=lambda x: x["row_index"]):
        pos = len(logical)
        for i, row in enumerate(logical):
            if row["src"] > c["row_index"]:
                pos = i
                break
        logical.insert(
            pos,
            {"row_kind": "comment", "src": c["row_index"],
             "cells": {"C": c["comment"]}},
        )

    rows_out: list[dict[str, Any]] = []
    for i, row in enumerate(logical):
        rnum = start_row + i
        cells = {f"{col}{rnum}": val for col, val in row["cells"].items()}
        out = {
            "logical_row": i + 1,
            "excel_row": rnum,
            "row_kind": row["row_kind"],
            "cells": cells,
        }
        for k in ("bucket_cd", "kojikomoku_id", "room", "raw_fields"):
            if k in row:
                out[k] = row[k]
        rows_out.append(out)
    return {
        "meta": {
            "engine": "haseko_quote_sort_engine",
            "sheet": EXCEL_CHOHYO_SHEET,
            "header_row": EXCEL_CHOHYO_HEADER_ROW,
            "data_start_row": start_row,
            "excel_column_map_verified": EXCEL_CHOHYO_COLUMN_MAP,
            "notes": [
                "列は 2026-11-07 に 1415 号室の帳票実物で検証済み。",
                "クロスは部屋ごとに天井/壁を 1 行へ統合。AY/BE は部屋合計。",
                "BI（削除/修正前）は HTML に情報がないため出力しない。",
                "図面数量（AD）は本案で有値がなく未検証。",
                "実表は途中に空行があり、鍵/固定の工種1タイトル行が空行のため、"
                "後半の物理行番号は実表とずれる。列の対応は変わらない。",
            ],
        },
        "chohyo_rows": rows_out,
        "money": compute_money_lines(sorted_details),
    }


def to_excel_koumoku_json(sorted_details: list[EnrichedDetail], start_row: int = EXCEL_CHOHYO_DATA_START_ROW) -> dict[str, Any]:
    """旧 API（互換用）。中身は検証済みの帳票マップ。"""
    payload = to_excel_chohyo_json(sorted_details, [], start_row)
    payload["koumoku_rows"] = payload["chohyo_rows"]
    return payload


def parse_html_file(path: Path) -> dict[str, Any]:
    html = path.read_text(encoding="utf-8", errors="replace")
    raw = parse_costs_table(html)
    details, comments = walk_and_bucket(raw)
    sorted_d = sort_details_like_backend(details)
    payload = to_excel_chohyo_json(sorted_d, comments)
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
