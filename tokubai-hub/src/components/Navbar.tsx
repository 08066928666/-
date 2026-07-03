"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export default function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => setUser(d.user));
    setMenuOpen(false);
  }, [pathname]);

  async function logout() {
    await fetch("/api/auth/session", { method: "DELETE" });
    setUser(null);
    window.location.href = "/";
  }

  const links = [
    { href: "/products", label: "値下げ商品", icon: "🏷️" },
    { href: "/stores", label: "店舗一覧", icon: "🏪" },
    { href: "/orders", label: "注文履歴", icon: "📋" },
    { href: "/cart", label: "カート", icon: "🛒" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-orange-100 bg-white/95 backdrop-blur safe-top">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex min-w-0 items-center gap-2">
          <span className="text-2xl">🏷️</span>
          <div className="min-w-0">
            <span className="block text-lg font-bold leading-tight text-orange-600 sm:text-xl">
              Tokubai Hub
            </span>
            <span className="hidden text-xs text-gray-500 sm:block">もったいないを、みんなで。</span>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-sm font-medium transition ${
                pathname === l.href ? "text-orange-600" : "text-gray-600 hover:text-orange-600"
              }`}
            >
              {l.label}
            </Link>
          ))}
          {(user?.role === "MERCHANT" || user?.role === "ADMIN") && (
            <Link
              href="/merchant"
              className={`text-sm font-medium transition ${
                pathname === "/merchant" ? "text-orange-600" : "text-gray-600 hover:text-orange-600"
              }`}
            >
              店舗管理
            </Link>
          )}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {user ? (
            <>
              <span className="text-sm text-gray-600">{user.name}さん</span>
              <button
                onClick={logout}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                ログアウト
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-orange-600">
                ログイン
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-orange-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-orange-600"
              >
                新規登録
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-xl lg:hidden"
          aria-label="メニュー"
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-orange-50 bg-white px-4 py-3 lg:hidden">
          <nav className="space-y-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium ${
                  pathname === l.href ? "bg-orange-50 text-orange-600" : "text-gray-700"
                }`}
              >
                <span>{l.icon}</span>
                {l.label}
              </Link>
            ))}
            {(user?.role === "MERCHANT" || user?.role === "ADMIN") && (
              <Link
                href="/merchant"
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-gray-700"
              >
                <span>⚙️</span>
                店舗管理
              </Link>
            )}
          </nav>
          <div className="mt-3 border-t border-gray-100 pt-3">
            {user ? (
              <div className="flex items-center justify-between px-3">
                <span className="text-sm text-gray-600">{user.name}さん</span>
                <button onClick={logout} className="text-sm text-red-500">
                  ログアウト
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Link
                  href="/login"
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-center text-sm font-medium"
                >
                  ログイン
                </Link>
                <Link
                  href="/register"
                  className="flex-1 rounded-xl bg-orange-500 py-2.5 text-center text-sm font-medium text-white"
                >
                  新規登録
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
