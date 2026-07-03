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

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => setUser(d.user));
  }, [pathname]);

  async function logout() {
    await fetch("/api/auth/session", { method: "DELETE" });
    setUser(null);
    window.location.href = "/";
  }

  const links = [
    { href: "/products", label: "値下げ商品" },
    { href: "/stores", label: "店舗" },
    { href: "/orders", label: "注文履歴" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-orange-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🏷️</span>
          <span className="text-xl font-bold text-orange-600">Tokubai Hub</span>
          <span className="hidden text-xs text-gray-500 sm:inline">もったいないを、みんなで。</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
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

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="hidden text-sm text-gray-600 sm:inline">{user.name}さん</span>
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
      </div>
    </header>
  );
}
