"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { formatPrice } from "@/lib/constants";

export default function CartPage() {
  const { items, removeItem, updateQuantity, clearCart, total, storeId } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function checkout() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/login?redirect=/cart");
          return;
        }
        setError(data.error || "注文に失敗しました");
        return;
      }
      clearCart();
      router.push(`/orders/${data.id}?new=1`);
    } catch {
      setError("注文に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="mb-4 text-5xl">🛒</div>
        <h1 className="mb-2 text-xl font-bold">カートは空です</h1>
        <p className="mb-6 text-gray-600">お得な値下げ商品を探してみましょう</p>
        <Link href="/products" className="rounded-xl bg-orange-500 px-6 py-3 font-bold text-white hover:bg-orange-600">
          商品を見る
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">カート</h1>
      <p className="mb-4 text-sm text-gray-600">🏪 {items[0].storeName}</p>

      <div className="mb-6 space-y-3">
        {items.map((item) => (
          <div key={item.productId} className="flex items-center gap-3 rounded-xl border bg-white p-4">
            <span className="text-2xl">{item.imageEmoji}</span>
            <div className="flex-1">
              <p className="font-medium">{item.name}</p>
              <p className="text-sm text-red-600">{formatPrice(item.price)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-lg"
              >
                −
              </button>
              <span className="w-6 text-center font-medium">{item.quantity}</span>
              <button
                onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                disabled={item.quantity >= item.maxQuantity}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-lg disabled:opacity-40"
              >
                +
              </button>
            </div>
            <button onClick={() => removeItem(item.productId)} className="text-gray-400 hover:text-red-500">
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="mb-6 rounded-xl bg-orange-50 p-4">
        <div className="flex justify-between text-lg font-bold">
          <span>合計</span>
          <span className="text-red-600">{formatPrice(total)}</span>
        </div>
        <p className="mt-1 text-xs text-gray-500">※ 店頭でのお支払いとなります</p>
      </div>

      {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

      <button
        onClick={checkout}
        disabled={loading}
        className="w-full rounded-xl bg-orange-500 py-3 font-bold text-white hover:bg-orange-600 disabled:opacity-50"
      >
        {loading ? "処理中..." : "予約する（店頭受取）"}
      </button>
    </div>
  );
}
