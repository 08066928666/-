import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ISSUE_TYPES,
  ISSUE_KNOWLEDGE,
  LIABILITY_RULES,
  ROOM_TEMPLATES,
  SERVICE_PLANS
} from "./data/knowledgeBase.js";
import { analyzeIssue, buildReportSummary } from "./utils/analyzeIssue.js";
import { loadSession, saveSession, clearSession, addFinding, removeFinding } from "./utils/storage.js";
import "./tenant.css";

const STEPS = ["home", "setup", "inspect", "result", "report", "services"];

function formatYen(n) {
  return `¥${Number(n || 0).toLocaleString()}`;
}

function PriorityBadge({ priority }) {
  const map = {
    urgent: { cls: "tm-badge-urgent", label: "要対応" },
    attention: { cls: "tm-badge-attention", label: "注意" },
    ok: { cls: "tm-badge-ok", label: "低リスク" }
  };
  const b = map[priority] || map.ok;
  return <span className={`tm-badge ${b.cls}`}>{b.label}</span>;
}

function LiabilityBadge({ liability }) {
  const colorMap = {
    emerald: "tm-badge-aging",
    amber: "tm-badge-stain",
    rose: "tm-badge-damage"
  };
  return (
    <span className={`tm-badge ${colorMap[liability?.color] || "tm-badge-aging"}`}>
      {liability?.label || "—"}
    </span>
  );
}

/* ─── Home ─── */
function HomeScreen({ onStart, hasSession }) {
  return (
    <div className="space-y-6">
      <div className="tm-card p-6 text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-teal-50">
          <i className="fa-solid fa-shield-halved text-4xl text-teal-600" />
        </div>
        <h2 className="text-xl font-black text-slate-900 mb-2">退房前自检，不被敲竹杠</h2>
        <p className="text-sm text-slate-500 leading-relaxed">
          拍照上传 → AI 分析 → 获取清洁对策、谈判话术、保价评估。
          让你在立会前心里有数。
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: "fa-camera", label: "拍照自检" },
          { icon: "fa-robot", label: "AI 建议" },
          { icon: "fa-yen-sign", label: "保价评估" }
        ].map((f) => (
          <div key={f.label} className="tm-card p-3 text-center">
            <i className={`fa-solid ${f.icon} text-teal-600 text-lg mb-1`} />
            <div className="text-[11px] font-bold text-slate-700">{f.label}</div>
          </div>
        ))}
      </div>

      <div className="tm-card p-4">
        <h3 className="text-sm font-bold text-slate-800 mb-3">常见被坑场景</h3>
        <ul className="space-y-2 text-xs text-slate-600">
          <li className="flex gap-2"><i className="fa-solid fa-circle-exclamation text-amber-500 mt-0.5" />壁纸发黄被算成「全面贴替」</li>
          <li className="flex gap-2"><i className="fa-solid fa-circle-exclamation text-amber-500 mt-0.5" />物跡和破损边界模糊被收费</li>
          <li className="flex gap-2"><i className="fa-solid fa-circle-exclamation text-amber-500 mt-0.5" />小伤被要求整扇门/整片地板更换</li>
        </ul>
      </div>

      <button type="button" className="tm-btn tm-btn-primary" onClick={onStart}>
        <i className="fa-solid fa-play" />
        {hasSession ? "继续自检" : "开始退房自检"}
      </button>
    </div>
  );
}

/* ─── Setup ─── */
function SetupScreen({ session, onChange, onNext }) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">填写基本信息，便于生成报告</p>
      <label className="block">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">物件名称</span>
        <input
          className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          placeholder="例：エスティメゾン豊洲 1415号室"
          value={session.propertyName}
          onChange={(e) => onChange({ propertyName: e.target.value })}
        />
      </label>
      <label className="block">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">退房予定日</span>
        <input
          type="date"
          className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          value={session.moveOutDate}
          onChange={(e) => onChange({ moveOutDate: e.target.value })}
        />
      </label>
      <button
        type="button"
        className="tm-btn tm-btn-primary"
        onClick={onNext}
        disabled={!session.propertyName.trim()}
      >
        开始房间检查
      </button>
    </div>
  );
}

/* ─── Inspect ─── */
function InspectScreen({ session, onAnalyze, onViewReport }) {
  const [roomId, setRoomId] = useState(ROOM_TEMPLATES[0].id);
  const [issueTypeId, setIssueTypeId] = useState("");
  const [photo, setPhoto] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const fileRef = useRef(null);

  const room = ROOM_TEMPLATES.find((r) => r.id === roomId);
  const suggested = ISSUE_TYPES.filter((t) => room?.suggestedIssues?.includes(t.id));

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result);
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!issueTypeId) return;
    setAnalyzing(true);
    await new Promise((r) => setTimeout(r, 1200));
    const result = analyzeIssue({
      issueTypeId,
      roomName: room?.name || "",
      photoDataUrl: photo
    });
    setAnalyzing(false);
    onAnalyze(result);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold">房间检查</h2>
        <button
          type="button"
          className="text-xs font-bold text-teal-600"
          onClick={onViewReport}
        >
          查看报告 ({session.findings?.length || 0})
        </button>
      </div>

      <div>
        <span className="text-xs font-bold text-slate-500">选择房间</span>
        <div className="tm-room-grid mt-2">
          {ROOM_TEMPLATES.map((r) => (
            <button
              key={r.id}
              type="button"
              className={`tm-room-card ${roomId === r.id ? "active" : ""}`}
              onClick={() => setRoomId(r.id)}
            >
              <i className={`fa-solid ${r.icon} text-teal-600 text-xl mb-1`} />
              <div className="text-xs font-bold text-slate-800">{r.name}</div>
            </button>
          ))}
        </div>
        {room?.tips && (
          <p className="mt-2 text-[11px] text-slate-500 flex gap-1.5">
            <i className="fa-solid fa-lightbulb text-amber-500 mt-0.5" />
            {room.tips}
          </p>
        )}
      </div>

      <div>
        <span className="text-xs font-bold text-slate-500">拍照留证</span>
        <div
          className="tm-photo-box mt-2"
          onClick={() => fileRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
        >
          {photo ? (
            <img src={photo} alt="检查照片" />
          ) : (
            <>
              <i className="fa-solid fa-camera text-3xl text-slate-300 mb-2" />
              <span className="text-xs text-slate-400">点击上传照片（带时间戳记录）</span>
            </>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
      </div>

      <div>
        <span className="text-xs font-bold text-slate-500">问题类型</span>
        <div className="mt-2 space-y-2">
          {suggested.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`tm-issue-chip w-full ${issueTypeId === t.id ? "selected" : ""}`}
              onClick={() => setIssueTypeId(t.id)}
            >
              <i className={`fa-solid ${t.icon} text-teal-600 w-5`} />
              <span className="text-sm font-semibold text-slate-800">{t.label}</span>
            </button>
          ))}
        </div>
        <details className="mt-2">
          <summary className="text-xs text-teal-600 cursor-pointer font-semibold">其他问题类型</summary>
          <div className="mt-2 space-y-2">
            {ISSUE_TYPES.filter((t) => !room?.suggestedIssues?.includes(t.id)).map((t) => (
              <button
                key={t.id}
                type="button"
                className={`tm-issue-chip w-full ${issueTypeId === t.id ? "selected" : ""}`}
                onClick={() => setIssueTypeId(t.id)}
              >
                <i className={`fa-solid ${t.icon} text-slate-400 w-5`} />
                <span className="text-sm text-slate-700">{t.label}</span>
              </button>
            ))}
          </div>
        </details>
      </div>

      <button
        type="button"
        className={`tm-btn tm-btn-primary ${analyzing ? "tm-analyzing" : ""}`}
        disabled={!issueTypeId || analyzing}
        onClick={handleAnalyze}
      >
        <i className="fa-solid fa-wand-magic-sparkles" />
        {analyzing ? "AI 分析中…" : "AI 分析 & 获取建议"}
      </button>
    </div>
  );
}

/* ─── Result ─── */
function ResultScreen({ result, onSave, onBack, onContinue }) {
  if (!result?.success) return null;
  const k = result.knowledge;

  return (
    <div className="space-y-4">
      <div className="tm-card overflow-hidden">
        {result.photoDataUrl && (
          <img src={result.photoDataUrl} alt="" className="w-full h-40 object-cover" />
        )}
        <div className="p-4">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h2 className="text-lg font-black text-slate-900">{k.title}</h2>
            <PriorityBadge priority={result.priority} />
            <LiabilityBadge liability={result.liability} />
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">{result.summary}</p>
          <p className="mt-2 text-[11px] text-slate-400">AI 置信度 {result.confidence}% · {result.roomName}</p>
        </div>
      </div>

      <div className="tm-card">
        <div className="tm-result-section">
          <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">保价评估</h3>
          <div className="flex justify-between text-sm">
            <span>市场工事费</span>
            <span className="font-bold tabular-nums">
              {formatYen(k.priceRange.min)} – {formatYen(k.priceRange.max)}
            </span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span>预估租客负担</span>
            <span className="font-black text-rose-600 tabular-nums">{formatYen(result.estimatedTenantCost)}</span>
          </div>
          <div className="tm-price-bar">
            <div
              className="tm-price-bar-fill"
              style={{ width: `${Math.min(100, (result.estimatedTenantCost / k.priceRange.max) * 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{k.priceRange.note}</p>
        </div>

        {k.selfFixable && (
          <div className="tm-result-section">
            <h3 className="text-xs font-bold text-teal-700 uppercase mb-2">
              <i className="fa-solid fa-broom mr-1" />自助清洁 / 对策
            </h3>
            <ul className="space-y-1.5">
              {k.cleaningTips.map((tip, i) => (
                <li key={i} className="text-xs text-slate-700 flex gap-2">
                  <span className="text-teal-500 font-bold">{i + 1}.</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="tm-result-section">
          <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">立会话术</h3>
          <div className="tm-script-box">{k.negotiationScript}</div>
        </div>

        <div className="tm-result-section">
          <h3 className="text-xs font-bold text-rose-600 uppercase mb-2">
            <i className="fa-solid fa-triangle-exclamation mr-1" />避免被坑
          </h3>
          <p className="text-xs text-slate-700 leading-relaxed">{k.avoidTrap}</p>
        </div>

        <div className="tm-result-section bg-slate-50">
          <p className="text-[10px] text-slate-400 leading-relaxed">
            <i className="fa-solid fa-scale-balanced mr-1" />
            {k.legalRef}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <button type="button" className="tm-btn tm-btn-ghost flex-1" onClick={onBack}>重新选择</button>
        <button type="button" className="tm-btn tm-btn-primary flex-1" onClick={onSave}>
          <i className="fa-solid fa-bookmark" /> 保存到报告
        </button>
      </div>
      <button type="button" className="tm-btn tm-btn-secondary" onClick={onContinue}>
        继续检查其他房间
      </button>
    </div>
  );
}

/* ─── Report ─── */
function ReportScreen({ session, onRemove, onServices, onRestart }) {
  const findings = session.findings || [];
  const summary = useMemo(() => buildReportSummary(findings), [findings]);

  if (findings.length === 0) {
    return (
      <div className="text-center py-12">
        <i className="fa-solid fa-clipboard text-4xl text-slate-300 mb-3" />
        <p className="text-sm text-slate-500">还没有检查记录</p>
        <button type="button" className="tm-btn tm-btn-primary mt-4" onClick={onRestart}>开始检查</button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="tm-card p-4">
        <h2 className="text-base font-black mb-1">{session.propertyName || "我的房间"}</h2>
        <p className="text-xs text-slate-500 mb-4">
          退房予定：{session.moveOutDate || "未设定"} · 生成于 {new Date().toLocaleDateString("ja-JP")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-teal-50 p-3 text-center">
            <div className="text-2xl font-black text-teal-700 tabular-nums">{summary.issueCount}</div>
            <div className="text-[10px] text-teal-600 font-bold">检查项目</div>
          </div>
          <div className="rounded-xl bg-rose-50 p-3 text-center">
            <div className="text-2xl font-black text-rose-600 tabular-nums">{formatYen(summary.tenantEst)}</div>
            <div className="text-[10px] text-rose-500 font-bold">预估负担</div>
          </div>
          <div className="rounded-xl bg-amber-50 p-3 text-center">
            <div className="text-2xl font-black text-amber-600 tabular-nums">{summary.urgent}</div>
            <div className="text-[10px] text-amber-600 font-bold">要対応</div>
          </div>
          <div className="rounded-xl bg-emerald-50 p-3 text-center">
            <div className="text-2xl font-black text-emerald-600 tabular-nums">{formatYen(summary.savingsPotential)}</div>
            <div className="text-[10px] text-emerald-600 font-bold">交渉余地</div>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-slate-400 text-center">
          市场総額 {formatYen(summary.totalMin)} – {formatYen(summary.totalMax)} · {summary.selfFixable} 项可自助处理
        </p>
      </div>

      <h3 className="text-sm font-bold text-slate-800">检查明细</h3>
      {findings.map((f) => (
        <div key={f.id} className="tm-finding-card">
          <div className="flex gap-3">
            {f.photoDataUrl && (
              <img src={f.photoDataUrl} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <span className="text-sm font-bold text-slate-800">{f.knowledge?.title}</span>
                <PriorityBadge priority={f.priority} />
              </div>
              <p className="text-[11px] text-slate-500">{f.roomName}</p>
              <p className="text-xs font-bold text-rose-600 mt-1 tabular-nums">
                预估 {formatYen(f.estimatedTenantCost)}
              </p>
            </div>
            <button
              type="button"
              className="text-slate-300 hover:text-rose-500 shrink-0"
              onClick={() => onRemove(f.id)}
              aria-label="删除"
            >
              <i className="fa-solid fa-trash-can text-sm" />
            </button>
          </div>
        </div>
      ))}

      <button type="button" className="tm-btn tm-btn-primary" onClick={onServices}>
        <i className="fa-solid fa-headset" /> 需要专家帮助？
      </button>
      <button type="button" className="tm-btn tm-btn-ghost" onClick={onRestart}>
        <i className="fa-solid fa-plus" /> 继续添加检查项
      </button>
    </div>
  );
}

/* ─── Services ─── */
function ServicesScreen({ onBack }) {
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-teal-100">
          <i className="fa-solid fa-check text-2xl text-teal-600" />
        </div>
        <h2 className="text-lg font-black mb-2">预约已提交（Demo）</h2>
        <p className="text-sm text-slate-500 px-4">
          正式版将对接人工顾问。我们会在 24 小时内联系您。
        </p>
        <button type="button" className="tm-btn tm-btn-primary mt-6" onClick={onBack}>返回报告</button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">
        自己处理麻烦？专业团队代您清掃、补修、立会交渉。
      </p>
      {SERVICE_PLANS.map((plan) => (
        <button
          key={plan.id}
          type="button"
          className={`tm-service-card w-full text-left ${selected === plan.id ? "border-teal-500 bg-teal-50/30" : ""}`}
          onClick={() => setSelected(plan.id)}
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-slate-900">{plan.name}</h3>
              <p className="text-xs text-slate-500 mt-1">{plan.desc}</p>
            </div>
            <div className="text-lg font-black text-teal-700 tabular-nums">
              {formatYen(plan.price)}
            </div>
          </div>
        </button>
      ))}
      <button
        type="button"
        className="tm-btn tm-btn-primary"
        disabled={!selected}
        onClick={() => setSubmitted(true)}
      >
        预约服务（Demo）
      </button>
      <button type="button" className="tm-btn tm-btn-ghost" onClick={onBack}>返回</button>
    </div>
  );
}

/* ─── Main App ─── */
export default function TenantApp() {
  const [step, setStep] = useState("home");
  const [session, setSession] = useState(loadSession);
  const [lastResult, setLastResult] = useState(null);

  useEffect(() => {
    saveSession({ ...session, currentStep: step });
  }, [session, step]);

  const updateSession = useCallback((patch) => {
    setSession((prev) => ({ ...prev, ...patch }));
  }, []);

  const hasSession = (session.findings?.length > 0) || session.propertyName;

  const stepIndex = STEPS.indexOf(step);

  const headerTitle = {
    home: "退房无忧",
    setup: "基本信息",
    inspect: "房间自检",
    result: "AI 分析结果",
    report: "退房报告",
    services: "专家服务"
  };

  const goBack = () => {
    if (step === "result") setStep("inspect");
    else if (step === "setup") setStep("home");
    else if (step === "inspect") setStep(session.propertyName ? "report" : "setup");
    else if (step === "report") setStep("inspect");
    else if (step === "services") setStep("report");
    else setStep("home");
  };

  return (
    <div className="tenant-app">
      <div className="tenant-shell">
        <header className="tenant-header">
          <div className="flex items-center gap-3">
            {step !== "home" && (
              <button type="button" onClick={goBack} className="text-white/80 hover:text-white" aria-label="返回">
                <i className="fa-solid fa-arrow-left" />
              </button>
            )}
            <div className="flex-1">
              <h1>{headerTitle[step] || "退房无忧"}</h1>
              {step !== "home" && (
                <div className="tm-step-dots mt-1">
                  {STEPS.slice(1, 5).map((s, i) => (
                    <div key={s} className={`tm-step-dot ${i <= stepIndex - 1 ? "active" : ""}`} />
                  ))}
                </div>
              )}
            </div>
            {step === "home" && (
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">DEMO</span>
            )}
          </div>
        </header>

        <main className="tenant-body">
          {step === "home" && (
            <HomeScreen
              hasSession={hasSession}
              onStart={() => setStep(session.propertyName ? "inspect" : "setup")}
            />
          )}
          {step === "setup" && (
            <SetupScreen
              session={session}
              onChange={updateSession}
              onNext={() => setStep("inspect")}
            />
          )}
          {step === "inspect" && (
            <InspectScreen
              session={session}
              onAnalyze={(result) => {
                setLastResult(result);
                setStep("result");
              }}
              onViewReport={() => setStep("report")}
            />
          )}
          {step === "result" && lastResult && (
            <ResultScreen
              result={lastResult}
              onBack={() => setStep("inspect")}
              onSave={() => {
                setSession((prev) => addFinding(prev, lastResult));
                setStep("report");
              }}
              onContinue={() => setStep("inspect")}
            />
          )}
          {step === "report" && (
            <ReportScreen
              session={session}
              onRemove={(id) => setSession((prev) => removeFinding(prev, id))}
              onServices={() => setStep("services")}
              onRestart={() => setStep("inspect")}
            />
          )}
          {step === "services" && (
            <ServicesScreen onBack={() => setStep("report")} />
          )}
        </main>
      </div>
    </div>
  );
}
