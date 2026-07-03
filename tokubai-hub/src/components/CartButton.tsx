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
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-full bg-orange-500 px-6 py-3 text-white shadow-lg transition hover:bg-orange-600 hover:shadow-xl"
    >
      <span className="text-lg">🛒</span>
      <div className="text-sm">
        <div className="font-bold">{itemCount}点</div>
        <div>{formatPrice(total)}</div>
      </div>
    </Link>
  );
}
