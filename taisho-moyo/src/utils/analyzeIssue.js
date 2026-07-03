import { ISSUE_KNOWLEDGE, LIABILITY_RULES } from "../data/knowledgeBase.js";

/**
 * 模拟 AI 图像分析 — 根据用户选择的问题类型 + 房间生成建议
 * 实际产品中可对接 Vision API
 */
export function analyzeIssue({ issueTypeId, roomName, photoDataUrl }) {
  const knowledge = ISSUE_KNOWLEDGE[issueTypeId];
  if (!knowledge) {
    return {
      success: false,
      message: "未识别的问题类型"
    };
  }

  const liability = LIABILITY_RULES[knowledge.liability] || LIABILITY_RULES.negotiable;
  const estimatedTenantCost = Math.round(
    (knowledge.priceRange.min +
      (knowledge.priceRange.max - knowledge.priceRange.min) * (liability.tenantRate / 100)) *
      (knowledge.riskLevel === "high" ? 0.8 : knowledge.riskLevel === "medium" ? 0.5 : 0.2)
  );

  const confidence = 0.72 + Math.random() * 0.18;

  return {
    success: true,
    analyzedAt: new Date().toISOString(),
    roomName,
    photoDataUrl,
    issueTypeId,
    confidence: Math.round(confidence * 100),
    knowledge,
    liability,
    estimatedTenantCost,
    summary: buildSummary(knowledge, liability, roomName),
    priority: knowledge.riskLevel === "high" ? "urgent" : knowledge.riskLevel === "medium" ? "attention" : "ok"
  };
}

function buildSummary(knowledge, liability, roomName) {
  if (knowledge.selfFixable && liability.tenantRate < 50) {
    return `${roomName}の「${knowledge.title}」— セルフケアで対応可能。${liability.label}と主張できる可能性が高いです。`;
  }
  if (liability.tenantRate >= 100) {
    return `${roomName}の「${knowledge.title}」— 破損認定のリスクあり。事前に適正価格（${knowledge.priceRange.min.toLocaleString()}–${knowledge.priceRange.max.toLocaleString()}円）を把握し、過大請求に備えましょう。`;
  }
  return `${roomName}の「${knowledge.title}」— 責任区分が争点になりやすい項目。事前清掃・証拠写真で交渉力を高めましょう。`;
}

/** 汇总报告统计 */
export function buildReportSummary(findings) {
  const totalMin = findings.reduce((s, f) => s + (f.knowledge?.priceRange?.min || 0), 0);
  const totalMax = findings.reduce((s, f) => s + (f.knowledge?.priceRange?.max || 0), 0);
  const tenantEst = findings.reduce((s, f) => s + (f.estimatedTenantCost || 0), 0);
  const selfFixable = findings.filter((f) => f.knowledge?.selfFixable).length;
  const urgent = findings.filter((f) => f.priority === "urgent").length;

  return {
    roomCount: new Set(findings.map((f) => f.roomName)).size,
    issueCount: findings.length,
    totalMin,
    totalMax,
    tenantEst,
    selfFixable,
    urgent,
    savingsPotential: Math.max(0, totalMax - tenantEst)
  };
}
