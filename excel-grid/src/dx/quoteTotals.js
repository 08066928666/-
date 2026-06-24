/** 見積明細 — 数量・金額計算（App / Editor 共通） */

export function calcLineSuryo(line, sectionKojiType) {
  if (!line || line.type === "comment" || line.active === false) return 0;
  const lineType = line.lineType || sectionKojiType || "other";
  if (lineType === "harikae") {
    const t1 = Number(line.taisho1) || 0;
    const t2 = Number(line.taisho2) || 0;
    return Math.round((t1 + t2) * 100) / 100;
  }
  return Number(line.suryo) || 0;
}

export function calcLineAmount(line, sectionKojiType) {
  return calcLineSuryo(line, sectionKojiType) * (Number(line.teika) || 0);
}

export function calcSectionsSubtotal(sections) {
  if (!Array.isArray(sections)) return 0;
  return sections.reduce((sum, sec) => {
    const lines = Array.isArray(sec?.lines) ? sec.lines : [];
    return (
      sum +
      lines.reduce((lineSum, line) => {
        if (line?.type === "comment" || line?.active === false) return lineSum;
        return lineSum + calcLineAmount(line, sec.kojiType);
      }, 0)
    );
  }, 0);
}

export function calcTax(subtotal) {
  return Math.floor(subtotal * 0.1);
}

export function calcGrandTotal(subtotal) {
  return subtotal + calcTax(subtotal);
}

export function computeQuoteTotals(sections) {
  const subtotal = calcSectionsSubtotal(sections);
  const tax = calcTax(subtotal);
  const grand = subtotal + tax;
  return { subtotal, tax, grand };
}
