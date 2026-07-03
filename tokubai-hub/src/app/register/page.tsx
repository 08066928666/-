"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "登録に失敗しました");
      setLoading(false);
      return;
    }

    router.push("/products");
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="mb-8 text-center">
        <span className="text-4xl">🏷️</span>
        <h1 className="mt-2 text-2xl font-bold">新規登録</h1>
        <p className="text-gray-600">無料でアカウントを作成</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">お名前</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">メールアドレス</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">パスワード（6文字以上）</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
          />
        </div>

        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-orange-500 py-3 font-bold text-white hover:bg-orange-600 disabled:opacity-50"
        >
          {loading ? "登録中..." : "アカウントを作成"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        すでにアカウントをお持ちの方は{" "}
        <Link href="/login" className="font-medium text-orange-600 hover:underline">
          ログイン
        </Link>
      </p>
    </div>
  );
}
