"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "./CartProvider";

const tabs = [
  { href: "/", label: "ホーム", icon: "🏠" },
  { href: "/products", label: "商品", icon: "🏷️" },
  { href: "/stores", label: "店舗", icon: "🏪" },
  { href: "/cart", label: "カート", icon: "🛒", showBadge: true },
  { href: "/orders", label: "注文", icon: "📋" },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { itemCount } = useCart();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-orange-100 bg-white/95 backdrop-blur md:hidden safe-bottom">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 pt-1">
        {tabs.map((tab) => {
          const active =
            tab.href === "/"
              ? pathname === "/"
              : pathname === tab.href || pathname.startsWith(tab.href + "/");
          const badge = tab.showBadge && itemCount > 0 ? itemCount : 0;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2 text-[10px] font-medium transition ${
                active ? "text-orange-600" : "text-gray-500"
              }`}
            >
              <span className={`text-xl ${active ? "scale-110" : ""} transition-transform`}>
                {tab.icon}
              </span>
              {badge > 0 && (
                <span className="absolute right-2 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
              <span className="truncate">{tab.label}</span>
              {active && (
                <span className="absolute -bottom-0 h-0.5 w-8 rounded-full bg-orange-500" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
