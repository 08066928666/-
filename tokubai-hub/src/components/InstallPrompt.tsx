"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("tokubai_install_dismissed")) {
      setDismissed(true);
      return;
    }

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    if (isIOS && !isStandalone) setShowIOSHint(true);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    setDeferred(null);
    setDismissed(true);
    localStorage.setItem("tokubai_install_dismissed", "1");
  }

  function dismiss() {
    setDismissed(true);
    setShowIOSHint(false);
    localStorage.setItem("tokubai_install_dismissed", "1");
  }

  if (dismissed) return null;

  if (showIOSHint) {
    return (
      <div className="fixed bottom-20 left-3 right-3 z-40 rounded-2xl border border-brand-200 bg-white p-4 shadow-lg md:hidden safe-bottom-offset">
        <p className="mb-1 text-sm font-bold text-gray-900">📱 アプリのように使う</p>
        <p className="text-xs text-gray-600">
          Safari の共有ボタン →「ホーム画面に追加」でアプリ化できます
        </p>
        <button onClick={dismiss} className="mt-2 text-xs text-orange-600">
          閉じる
        </button>
      </div>
    );
  }

  if (!deferred) return null;

  return (
    <div className="fixed bottom-20 left-3 right-3 z-40 flex items-center gap-3 rounded-2xl border border-brand-200 bg-white p-4 shadow-lg md:hidden safe-bottom-offset">
      <div className="flex-1">
        <p className="text-sm font-bold text-gray-900">Tokubai Hub をインストール</p>
        <p className="text-xs text-gray-600">ホーム画面からすぐアクセス</p>
      </div>
      <button
        onClick={install}
        className="shrink-0 rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white"
      >
        追加
      </button>
      <button onClick={dismiss} className="shrink-0 text-gray-400">
        ✕
      </button>
    </div>
  );
}
