"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "./CartProvider";

const tabs = [
  { href: "/", label: "ホーム", icon: "🏠", match: (p: string) => p === "/" },
  { href: "/products", label: "商品", icon: "🏷️", match: (p: string) => p.startsWith("/products") },
  { href: "/stores", label: "店舗", icon: "🏪", match: (p: string) => p.startsWith("/stores") },
  { href: "/cart", label: "カート", icon: "🛒", match: (p: string) => p.startsWith("/cart"), badge: true },
  { href: "/orders", label: "注文", icon: "📋", match: (p: string) => p.startsWith("/orders") },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { itemCount } = useCart();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-stone-100 bg-white/95 backdrop-blur-lg lg:hidden safe-bottom"
      aria-label="メインナビゲーション"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 pt-1.5">
        {tabs.map((tab) => {
          const active = tab.match(pathname);
          const badge = tab.badge && itemCount > 0 ? itemCount : 0;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`relative flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2 text-[10px] font-semibold transition ${
                active ? "text-brand-600" : "text-stone-400"
              }`}
            >
              <span className={`text-[1.35rem] leading-none ${active ? "scale-110" : ""} transition-transform`}>
                {tab.icon}
              </span>
              {badge > 0 && (
                <span className="absolute right-1 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
              <span className="truncate">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
