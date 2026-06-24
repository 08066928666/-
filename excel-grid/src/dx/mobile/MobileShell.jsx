import React from "react";

/** 手机端全屏页面外壳：iOS 风格顶栏 + 可滚动内容 */
export function MobileShell({
  title,
  subtitle,
  onBack,
  backLabel,
  right,
  children,
  className = "",
  largeTitle = false
}) {
  return (
    <div className={`mobile-page ios-page ${largeTitle ? "ios-page-large-title" : ""} ${className}`.trim()}>
      <header className="mobile-header ios-nav-bar">
        <div className="mobile-header-row">
          {onBack ? (
            <button type="button" className="mobile-back-btn" onClick={onBack} aria-label={backLabel || "戻る"}>
              <i className="fa-solid fa-chevron-left" />
              {backLabel ? <span>{backLabel}</span> : null}
            </button>
          ) : (
            <div className="w-16 shrink-0" />
          )}
          <div className="mobile-header-center min-w-0 flex-1 text-center">
            {!largeTitle && <h1 className="mobile-title truncate">{title}</h1>}
            {!largeTitle && subtitle ? <p className="mobile-subtitle truncate">{subtitle}</p> : null}
          </div>
          <div className="mobile-header-right shrink-0 min-w-[4rem] flex justify-end">{right || null}</div>
        </div>
      </header>
      {largeTitle && (
        <div className="ios-large-title-block">
          <h1 className="ios-large-title">{title}</h1>
          {subtitle ? <p className="ios-large-subtitle">{subtitle}</p> : null}
        </div>
      )}
      <main className="mobile-content ios-content">{children}</main>
    </div>
  );
}
