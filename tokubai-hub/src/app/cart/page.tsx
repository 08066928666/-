"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/CartProvider";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
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
      <EmptyState
        icon="🛒"
        title="カートは空です"
        description="お得な値下げ商品を探してみましょう"
        actionLabel="商品を見る"
        actionHref="/products"
      />
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h1 className="mb-1 text-2xl font-bold text-stone-900">カート</h1>
      <p className="mb-6 text-sm text-stone-500">🏪 {items[0].storeName}</p>

      <div className="mb-6 space-y-3">
        {items.map((item) => (
          <div key={item.productId} className="card-surface flex items-center gap-3 p-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-2xl">
              {item.imageEmoji}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-stone-900">{item.name}</p>
              <p className="text-sm font-bold text-red-600">{formatPrice(item.price)}</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                className="touch-target flex items-center justify-center rounded-xl bg-stone-100 text-lg font-medium"
                aria-label="数量を減らす"
              >
                −
              </button>
              <span className="w-8 text-center font-bold">{item.quantity}</span>
              <button
                onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                disabled={item.quantity >= item.maxQuantity}
                className="touch-target flex items-center justify-center rounded-xl bg-stone-100 text-lg font-medium disabled:opacity-40"
                aria-label="数量を増やす"
              >
                +
              </button>
            </div>
            <button
              onClick={() => removeItem(item.productId)}
              className="touch-target text-stone-300 hover:text-red-500"
              aria-label="削除"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="card-surface mb-6 p-5">
        <div className="flex items-end justify-between">
          <span className="font-semibold text-stone-600">合計（店頭支払い）</span>
          <span className="text-2xl font-extrabold text-red-600">{formatPrice(total)}</span>
        </div>
        <p className="mt-2 text-xs text-stone-400">予約後、店頭で受取コードをご提示ください</p>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      <Button onClick={checkout} disabled={loading} fullWidth>
        {loading ? "処理中..." : "予約する（店頭受取）"}
      </Button>
    </div>
  );
}
