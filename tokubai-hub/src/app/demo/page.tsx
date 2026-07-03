"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const steps = [
  { num: "1", title: "値下げ商品を探す", desc: "近くの店舗のお得な商品をリアルタイムで確認", icon: "🔍" },
  { num: "2", title: "カートに入れて予約", desc: "気になる商品を選んでオンライン予約", icon: "🛒" },
  { num: "3", title: "店頭で受取", desc: "受取コードを見せて、そのままお支払い", icon: "🏪" },
];

const accounts = [
  { role: "お客様", email: "user@example.com", desc: "商品閲覧・予約" },
  { role: "店舗管理者", email: "merchant@seven.jp", desc: "在庫・注文管理" },
];

export default function DemoPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function startDemo() {
    setLoading(true);
    const res = await fetch("/api/auth/demo", { method: "POST" });
    if (res.ok) {
      router.push("/products");
    } else {
      setLoading(false);
      alert("デモの起動に失敗しました");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      <section className="bg-gradient-to-br from-orange-500 to-amber-400 px-4 py-12 text-center text-white">
        <p className="mb-2 text-sm font-medium text-orange-100">INTERACTIVE DEMO</p>
        <h1 className="mb-3 text-3xl font-bold">Tokubai Hub デモ</h1>
        <p className="mx-auto max-w-md text-orange-50">
          値下げ商品の検索から予約・受取まで、
          <br />
          実際の画面でお試しください
        </p>
      </section>

      <div className="mx-auto max-w-lg px-4 py-8">
        <button
          onClick={startDemo}
          disabled={loading}
          className="mb-8 w-full rounded-2xl bg-orange-500 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-orange-600 active:scale-[0.98] disabled:opacity-60"
        >
          {loading ? "起動中..." : "🚀 ワンクリックでデモ体験"}
        </button>

        <div className="mb-8 space-y-3">
          <h2 className="text-sm font-bold text-gray-500">体験の流れ</h2>
          {steps.map((s) => (
            <div key={s.num} className="flex items-start gap-4 rounded-2xl border bg-white p-4 shadow-sm">
              <span className="text-2xl">{s.icon}</span>
              <div>
                <p className="font-bold text-gray-900">
                  <span className="mr-2 text-orange-500">Step {s.num}</span>
                  {s.title}
                </p>
                <p className="text-sm text-gray-600">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mb-8 rounded-2xl border border-dashed border-orange-200 bg-orange-50/50 p-5">
          <h2 className="mb-3 text-sm font-bold text-gray-700">デモアカウント</h2>
          <p className="mb-3 text-xs text-gray-500">パスワード: <code className="rounded bg-white px-1.5 py-0.5 font-mono">demo1234</code></p>
          {accounts.map((a) => (
            <div key={a.email} className="mb-2 flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm">
              <div>
                <span className="font-medium">{a.role}</span>
                <span className="ml-2 text-gray-400">{a.desc}</span>
              </div>
              <code className="text-xs text-orange-600">{a.email}</code>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/products"
            className="rounded-xl border border-gray-200 py-3 text-center text-sm font-medium text-gray-700"
          >
            商品を見る
          </Link>
          <Link
            href="/merchant"
            className="rounded-xl border border-gray-200 py-3 text-center text-sm font-medium text-gray-700"
          >
            店舗管理
          </Link>
        </div>

        <p className="mt-8 text-center text-xs text-gray-400">
          4店舗 · 18商品のサンプルデータ
        </p>
      </div>
    </div>
  );
}
