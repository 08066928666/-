"use client";

import Link from "next/link";
import { useCart } from "./CartProvider";
import { formatPrice } from "@/lib/constants";

export default function CartButton() {
  const { itemCount, total } = useCart();

  if (itemCount === 0) return null;

  return (
    <Link
      href="/cart"
      className="fixed right-4 z-40 hidden items-center gap-2.5 rounded-full bg-brand-500 px-5 py-3.5 text-white shadow-float transition hover:bg-brand-600 active:scale-95 lg:flex lg:bottom-6"
      aria-label={`カート ${itemCount}点`}
    >
      <span className="text-lg">🛒</span>
      <div className="text-sm leading-tight">
        <div className="font-bold">{itemCount}点</div>
        <div className="hidden text-orange-100 sm:block">{formatPrice(total)}</div>
      </div>
    </Link>
  );
}
