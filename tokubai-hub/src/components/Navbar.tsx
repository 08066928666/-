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

const links = [
  { href: "/products", label: "値下げ商品" },
  { href: "/stores", label: "店舗一覧" },
  { href: "/orders", label: "注文履歴" },
  { href: "/demo", label: "デモ" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => setUser(d.user))
      .catch(() => setUser(null));
    setMenuOpen(false);
  }, [pathname]);

  async function logout() {
    await fetch("/api/auth/session", { method: "DELETE" });
    setUser(null);
    window.location.href = "/";
  }

  return (
    <header className="sticky top-0 z-50 border-b border-stone-100 bg-white/95 backdrop-blur-lg safe-top">
      <div className="mx-auto flex h-[var(--header-height)] max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-lg shadow-sm">
            🏷️
          </span>
          <div className="min-w-0 leading-tight">
            <span className="block text-base font-bold text-stone-900">Tokubai Hub</span>
            <span className="hidden text-[10px] text-stone-500 sm:block">もったいないを、みんなで</span>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="デスクトップナビ">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                isActive(pathname, l.href)
                  ? "bg-brand-50 text-brand-600"
                  : "text-stone-600 hover:bg-stone-50 hover:text-brand-600"
              }`}
            >
              {l.label}
            </Link>
          ))}
          {(user?.role === "MERCHANT" || user?.role === "ADMIN") && (
            <Link
              href="/merchant"
              className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                isActive(pathname, "/merchant")
                  ? "bg-brand-50 text-brand-600"
                  : "text-stone-600 hover:bg-stone-50"
              }`}
            >
              店舗管理
            </Link>
          )}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Link
            href="/cart"
            className="relative rounded-xl p-2.5 text-stone-600 hover:bg-stone-50"
            aria-label="カート"
          >
            🛒
          </Link>
          {user ? (
            <>
              <span className="text-sm text-stone-600">{user.name}さん</span>
              <button onClick={logout} className="btn-secondary !py-2 !text-xs">
                ログアウト
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="rounded-xl px-3 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-50">
                ログイン
              </Link>
              <Link href="/register" className="btn-primary !py-2 !text-xs">
                新規登録
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200 text-lg lg:hidden"
          aria-label="メニュー"
          aria-expanded={menuOpen}
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-stone-100 bg-white px-4 py-3 lg:hidden">
          <nav className="space-y-1">
            {[...links, { href: "/cart", label: "カート" }].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`block rounded-2xl px-4 py-3 text-sm font-semibold ${
                  isActive(pathname, l.href) ? "bg-brand-50 text-brand-600" : "text-stone-700"
                }`}
              >
                {l.label}
              </Link>
            ))}
            {(user?.role === "MERCHANT" || user?.role === "ADMIN") && (
              <Link href="/merchant" className="block rounded-2xl px-4 py-3 text-sm font-semibold text-stone-700">
                店舗管理
              </Link>
            )}
          </nav>
          <div className="mt-3 border-t border-stone-100 pt-3">
            {user ? (
              <div className="flex items-center justify-between px-4">
                <span className="text-sm text-stone-600">{user.name}さん</span>
                <button onClick={logout} className="text-sm font-semibold text-red-500">
                  ログアウト
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Link href="/login" className="btn-secondary flex-1 !py-2.5">
                  ログイン
                </Link>
                <Link href="/register" className="btn-primary flex-1 !py-2.5">
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
