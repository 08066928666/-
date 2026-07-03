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
      className="fixed right-4 z-40 flex items-center gap-3 rounded-full bg-orange-500 px-5 py-3 text-white shadow-lg transition hover:bg-orange-600 hover:shadow-xl bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px)+0.5rem)] md:bottom-6"
    >
      <span className="text-lg">🛒</span>
      <div className="text-sm">
        <div className="font-bold">{itemCount}点</div>
        <div className="hidden sm:block">{formatPrice(total)}</div>
      </div>
    </Link>
  );
}
