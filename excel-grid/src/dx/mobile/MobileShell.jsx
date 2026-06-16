import React from "react";

/** 手机端全屏页面外壳：顶栏 + 可滚动内容 */
export function MobileShell({ title, subtitle, onBack, backLabel, right, children, className = "" }) {
  return (
    <div className={`mobile-page ${className}`.trim()}>
      <header className="mobile-header">
        <div className="mobile-header-row">
          {onBack ? (
            <button type="button" className="mobile-back-btn" onClick={onBack} aria-label={backLabel || "戻る"}>
              <i className="fa-solid fa-chevron-left" />
              {backLabel ? <span>{backLabel}</span> : null}
            </button>
          ) : (
            <div className="w-10" />
          )}
          <div className="mobile-header-center min-w-0 flex-1">
            <h1 className="mobile-title truncate">{title}</h1>
            {subtitle ? <p className="mobile-subtitle truncate">{subtitle}</p> : null}
          </div>
          <div className="mobile-header-right shrink-0">{right || <div className="w-10" />}</div>
        </div>
      </header>
      <main className="mobile-content">{children}</main>
    </div>
  );
}
