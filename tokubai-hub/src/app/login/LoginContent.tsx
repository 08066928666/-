"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function LoginContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/products";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "ログインに失敗しました");
      setLoading(false);
      return;
    }

    if (data.user.role === "MERCHANT" || data.user.role === "ADMIN") {
      router.push("/merchant");
    } else {
      router.push(redirect);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="mb-8 text-center">
        <span className="text-4xl">🏷️</span>
        <h1 className="mt-2 text-2xl font-bold">ログイン</h1>
        <p className="text-gray-600">Tokubai Hubへようこそ</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">メールアドレス</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
            placeholder="user@example.com"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">パスワード</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
          />
        </div>

        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-orange-500 py-3 font-bold text-white hover:bg-orange-600 disabled:opacity-50"
        >
          {loading ? "ログイン中..." : "ログイン"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        アカウントをお持ちでない方は{" "}
        <Link href="/register" className="font-medium text-orange-600 hover:underline">
          新規登録
        </Link>
      </p>

      <div className="mt-8 rounded-xl bg-gray-50 p-4 text-center text-xs text-gray-500">
        <p className="font-medium">デモアカウント（パスワード: demo1234）</p>
        <p>user@example.com / merchant@seven.jp</p>
      </div>
    </div>
  );
}
